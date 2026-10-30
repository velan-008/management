import { Op } from 'sequelize';
import { sequelize, Product, Category, StockMovement, User, SaleItem } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const productController = {
  // GET /api/products — list with search, filter, pagination
  list: async (req, res, next) => {
    try {
      const businessId = req.businessId;
      const {
        search = '',
        category_id,
        stock_status,
        low_stock,
        page = 1,
        limit = 20,
        is_active,
        sortBy = 'name',
        order = 'ASC'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const where = { business_id: businessId };

      // Search across name, SKU, or barcode
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
          { name: { [Op.like]: term } },
          { sku: { [Op.like]: term } },
          { barcode: { [Op.like]: term } }
        ];
      }

      // Filter by category
      if (category_id) {
        where.category_id = category_id;
      }

      // Filter by stock status
      if (stock_status) {
        if (stock_status === 'out_of_stock') {
          where.quantity = { [Op.lte]: 0 };
        } else if (stock_status === 'low_stock') {
          where.quantity = {
            [Op.gt]: 0,
            [Op.lte]: sequelize.col('low_stock_threshold')
          };
        } else if (stock_status === 'in_stock') {
          where.quantity = {
            [Op.gt]: sequelize.col('low_stock_threshold')
          };
        }
      } else if (low_stock === 'true') {
        where.quantity = { [Op.lte]: sequelize.col('low_stock_threshold') };
      }

      // Active status filter
      if (is_active !== undefined && is_active !== '') {
        where.is_active = is_active === 'true' || is_active === true;
      }

      // Sorting
      const validSortFields = ['name', 'sku', 'selling_price', 'cost_price', 'quantity', 'created_at'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const { rows, count } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ],
        order: [[sortField, sortOrder]],
        limit: limitNum,
        offset
      });

      return apiResponse.success(
        res,
        { products: rows },
        'Products retrieved successfully',
        200,
        {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum)
        }
      );
    } catch (error) {
      next(error);
    }
  },

  // GET /api/products/:id — single product details
  getById: async (req, res, next) => {
    try {
      const product = await Product.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ]
      });

      if (!product) {
        return apiResponse.error(res, 'Product not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { product }, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/products — create product with atomic opening stock
  create: async (req, res, next) => {
    try {
      const businessId = req.businessId;
      const {
        name,
        sku,
        barcode,
        description,
        cost_price = 0,
        selling_price,
        quantity = 0,
        low_stock_threshold = 5,
        tax_rate = 0,
        unit = 'pcs',
        wholesale_price = 0,
        brand,
        batch_number,
        expiry_date,
        carton_pack_qty = 1,
        category_id,
        is_active = true
      } = req.body;

      // 1. Check SKU uniqueness within business scope
      const existingSku = await Product.findOne({
        where: { business_id: businessId, sku: sku.trim() }
      });
      if (existingSku) {
        return apiResponse.error(
          res,
          'A product with this SKU already exists in your organization',
          409,
          'SKU_EXISTS'
        );
      }

      // 2. Check Barcode uniqueness within business scope if provided
      if (barcode && barcode.trim()) {
        const existingBarcode = await Product.findOne({
          where: { business_id: businessId, barcode: barcode.trim() }
        });
        if (existingBarcode) {
          return apiResponse.error(
            res,
            'A product with this barcode already exists in your organization',
            409,
            'BARCODE_EXISTS'
          );
        }
      }

      // 3. Verify category belongs to this business if specified
      if (category_id) {
        const category = await Category.findOne({
          where: { id: category_id, business_id: businessId }
        });
        if (!category) {
          return apiResponse.error(
            res,
            'Selected category does not exist or belong to your organization',
            400,
            'INVALID_CATEGORY'
          );
        }
      }

      // 4. Atomic Product & StockMovement creation
      const initQty = Math.max(0, parseInt(quantity, 10) || 0);

      const product = await sequelize.transaction(async (t) => {
        const p = await Product.create(
          {
            business_id: businessId,
            name: name.trim(),
            sku: sku.trim(),
            barcode: barcode ? barcode.trim() : null,
            description: description ? description.trim() : null,
            cost_price: parseFloat(cost_price) || 0,
            selling_price: parseFloat(selling_price),
            quantity: initQty,
            low_stock_threshold: Math.max(0, parseInt(low_stock_threshold, 10) || 5),
            tax_rate: parseFloat(tax_rate) || 0,
            unit: unit || 'pcs',
            wholesale_price: parseFloat(wholesale_price) || 0,
            brand: brand ? brand.trim() : null,
            batch_number: batch_number ? batch_number.trim() : null,
            expiry_date: expiry_date || null,
            carton_pack_qty: parseInt(carton_pack_qty, 10) || 1,
            category_id: category_id || null,
            is_active: is_active !== false
          },
          { transaction: t }
        );

        // Record immutable opening stock movement if initial quantity > 0
        if (initQty > 0) {
          await StockMovement.create(
            {
              business_id: businessId,
              product_id: p.id,
              user_id: req.user.id,
              type: 'ADJUSTMENT',
              quantity_change: initQty,
              previous_quantity: 0,
              new_quantity: initQty,
              reference_id: 'OPENING-STOCK',
              notes: 'Initial opening stock on product creation'
            },
            { transaction: t }
          );
        }

        return p;
      });

      const productWithCategory = await Product.findByPk(product.id, {
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      });

      return apiResponse.success(
        res,
        { product: productWithCategory },
        'Product created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/products/:id — update product details (quantity changes protected)
  update: async (req, res, next) => {
    try {
      const product = await Product.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!product) {
        return apiResponse.error(res, 'Product not found', 404, 'NOT_FOUND');
      }

      const {
        name,
        sku,
        barcode,
        description,
        cost_price,
        selling_price,
        low_stock_threshold,
        tax_rate,
        unit,
        wholesale_price,
        brand,
        batch_number,
        expiry_date,
        carton_pack_qty,
        category_id,
        is_active
      } = req.body;

      // Check SKU uniqueness if changed
      if (sku && sku.trim() !== product.sku) {
        const existingSku = await Product.findOne({
          where: {
            business_id: req.businessId,
            sku: sku.trim(),
            id: { [Op.ne]: product.id }
          }
        });
        if (existingSku) {
          return apiResponse.error(
            res,
            'A product with this SKU already exists in your organization',
            409,
            'SKU_EXISTS'
          );
        }
      }

      // Check Barcode uniqueness if changed
      if (barcode && barcode.trim() && barcode.trim() !== product.barcode) {
        const existingBarcode = await Product.findOne({
          where: {
            business_id: req.businessId,
            barcode: barcode.trim(),
            id: { [Op.ne]: product.id }
          }
        });
        if (existingBarcode) {
          return apiResponse.error(
            res,
            'A product with this barcode already exists in your organization',
            409,
            'BARCODE_EXISTS'
          );
        }
      }

      // Check Category belongs to this business if changed
      if (category_id !== undefined && category_id !== null && category_id !== '') {
        const category = await Category.findOne({
          where: { id: category_id, business_id: req.businessId }
        });
        if (!category) {
          return apiResponse.error(
            res,
            'Selected category does not exist or belong to your organization',
            400,
            'INVALID_CATEGORY'
          );
        }
      }

      // Direct quantity mutation is disallowed to ensure stock integrity audit trails
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (sku !== undefined) updateData.sku = sku.trim();
      if (barcode !== undefined) updateData.barcode = barcode ? barcode.trim() : null;
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (cost_price !== undefined) updateData.cost_price = parseFloat(cost_price) || 0;
      if (selling_price !== undefined) updateData.selling_price = parseFloat(selling_price);
      if (low_stock_threshold !== undefined) updateData.low_stock_threshold = Math.max(0, parseInt(low_stock_threshold, 10) || 0);
      if (tax_rate !== undefined) updateData.tax_rate = parseFloat(tax_rate) || 0;
      if (unit !== undefined) updateData.unit = unit.trim();
      if (wholesale_price !== undefined) updateData.wholesale_price = parseFloat(wholesale_price) || 0;
      if (brand !== undefined) updateData.brand = brand ? brand.trim() : null;
      if (batch_number !== undefined) updateData.batch_number = batch_number ? batch_number.trim() : null;
      if (expiry_date !== undefined) updateData.expiry_date = expiry_date || null;
      if (carton_pack_qty !== undefined) updateData.carton_pack_qty = parseInt(carton_pack_qty, 10) || 1;
      if (category_id !== undefined) updateData.category_id = category_id || null;
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      await product.update(updateData);

      const updatedWithCategory = await Product.findByPk(product.id, {
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      });

      return apiResponse.success(
        res,
        { product: updatedWithCategory },
        'Product updated successfully'
      );
    } catch (error) {
      next(error);
    }
  },

  // POST /api/products/:id/adjust-stock — atomic row-locked stock adjustment
  adjustStock: async (req, res, next) => {
    try {
      const { quantity_change, type = 'ADJUSTMENT', notes = '', reference_id } = req.body;
      const change = parseInt(quantity_change, 10);

      if (!change || change === 0) {
        return apiResponse.error(
          res,
          'quantity_change must be a non-zero integer',
          400,
          'VALIDATION_ERROR'
        );
      }

      const validTypes = ['PURCHASE', 'SALE', 'RETURN', 'DAMAGE', 'ADJUSTMENT'];
      const movementType = validTypes.includes(type) ? type : 'ADJUSTMENT';

      const result = await sequelize.transaction(async (t) => {
        // Pessimistic exclusive row lock to prevent concurrency overselling/race conditions
        const product = await Product.findOne({
          where: { id: req.params.id, business_id: req.businessId },
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        if (!product) {
          const err = new Error('Product not found');
          err.statusCode = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }

        const qBefore = Number(product.quantity);
        const qAfter = qBefore + change;

        if (qAfter < 0) {
          const err = new Error(`Stock adjustment rejected: current stock is ${qBefore}, cannot reduce by ${Math.abs(change)}`);
          err.statusCode = 422;
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }

        await product.update({ quantity: qAfter }, { transaction: t });

        const movement = await StockMovement.create(
          {
            business_id: req.businessId,
            product_id: product.id,
            user_id: req.user.id,
            type: movementType,
            quantity_change: change,
            previous_quantity: qBefore,
            new_quantity: qAfter,
            reference_id: reference_id || `ADJ-${Date.now()}`,
            notes: notes ? notes.trim() : `Manual ${movementType.toLowerCase()} adjustment`
          },
          { transaction: t }
        );

        return { product, movement, qBefore, qAfter };
      });

      return apiResponse.success(
        res,
        {
          product: result.product,
          movement: result.movement,
          quantity_before: result.qBefore,
          quantity_after: result.qAfter
        },
        'Stock adjusted successfully'
      );
    } catch (error) {
      if (error.statusCode) {
        return apiResponse.error(res, error.message, error.statusCode, error.code);
      }
      next(error);
    }
  },

  // GET /api/products/:id/movements — historical stock ledger for specific product
  stockMovements: async (req, res, next) => {
    try {
      const product = await Product.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!product) {
        return apiResponse.error(res, 'Product not found', 404, 'NOT_FOUND');
      }

      const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const { rows, count } = await StockMovement.findAndCountAll({
        where: { product_id: product.id, business_id: req.businessId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset
      });

      return apiResponse.success(
        res,
        { movements: rows, product: { id: product.id, name: product.name, sku: product.sku, quantity: product.quantity, unit: product.unit } },
        'Stock movements retrieved successfully',
        200,
        {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum)
        }
      );
    } catch (error) {
      next(error);
    }
  },

  // GET /api/products/movements — global historical stock ledger across all products
  allMovements: async (req, res, next) => {
    try {
      const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
      const offset = (pageNum - 1) * limitNum;

      const where = { business_id: req.businessId };
      if (req.query.type) {
        where.type = req.query.type;
      }
      if (req.query.product_id) {
        where.product_id = req.query.product_id;
      }

      const { rows, count } = await StockMovement.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'unit']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset
      });

      return apiResponse.success(
        res,
        { movements: rows },
        'Stock movements history retrieved successfully',
        200,
        {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum)
        }
      );
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/products/:id — safe deactivation
  delete: async (req, res, next) => {
    try {
      const product = await Product.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!product) {
        return apiResponse.error(res, 'Product not found', 404, 'NOT_FOUND');
      }

      // Check if product has sales history
      const salesCount = await SaleItem.count({
        where: { product_id: product.id }
      });

      // Always deactivate to preserve permanent financial & inventory audit logs
      await product.update({ is_active: false });

      const msg = salesCount > 0
        ? 'Product has sales history and has been deactivated to preserve audit integrity'
        : 'Product deactivated successfully';

      return apiResponse.success(res, { id: product.id, is_active: false }, msg);
    } catch (error) {
      next(error);
    }
  }
};
