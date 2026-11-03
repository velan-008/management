import { Op } from 'sequelize';
import { sequelize, Product, Category, SubCategory, Brand, Unit, StockMovement, User, SaleItem, ProductUnit, Inventory } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const productController = {
  /**
   * GET /api/products/search?q=... — Fast product search for Wholesale FMCG POS
   * Searches by barcode, name, or SKU/item code
   * Returns units, conversion factors, wholesale/retail prices, batches, expiry, and stock in CTN/BOX/PCS
   */
  search: async (req, res, next) => {
    try {
      const businessId = req.businessId;
      const { q = '', limit = 30 } = req.query;
      const queryTerm = q.trim();

      const where = {
        business_id: businessId,
        is_active: true
      };

      if (queryTerm) {
        const term = `%${queryTerm}%`;
        where[Op.or] = [
          { barcode: { [Op.like]: term } },
          { sku: { [Op.like]: term } },
          { name: { [Op.like]: term } }
        ];
      }

      const products = await Product.findAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: SubCategory,
            as: 'subCategory',
            attributes: ['id', 'name']
          },
          {
            model: Brand,
            as: 'brandRel',
            attributes: ['id', 'name']
          },
          {
            model: Unit,
            as: 'unitRel',
            attributes: ['id', 'name', 'code']
          },
          {
            model: ProductUnit,
            as: 'units',
            attributes: ['id', 'unit_name', 'conversion_factor', 'wholesale_price', 'retail_price']
          },
          {
            model: Inventory,
            as: 'batches',
            attributes: ['id', 'batch_number', 'expiry_date', 'stock_quantity'],
            order: [['expiry_date', 'ASC']]
          }
        ],
        limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 30)),
        order: [['name', 'ASC']]
      });

      const today = new Date().toISOString().slice(0, 10);

      const formatted = products.map((p) => {
        const prod = p.toJSON();
        let units = prod.units || [];

        // If no explicit product_units in DB, synthesize standard CTN, BOX, PCS units
        if (units.length === 0) {
          const packQty = prod.carton_pack_qty || 12;
          const sellPrice = parseFloat(prod.selling_price) || 0;
          const wsPrice = parseFloat(prod.wholesale_price) || (sellPrice * 0.85);

          units = [
            {
              unit_name: 'PCS',
              conversion_factor: 1,
              retail_price: sellPrice.toFixed(2),
              wholesale_price: wsPrice.toFixed(2)
            },
            {
              unit_name: 'BOX',
              conversion_factor: packQty,
              retail_price: (sellPrice * packQty).toFixed(2),
              wholesale_price: (wsPrice * packQty).toFixed(2)
            },
            {
              unit_name: 'CTN',
              conversion_factor: packQty * 10,
              retail_price: (sellPrice * packQty * 10).toFixed(2),
              wholesale_price: (wsPrice * packQty * 9.5).toFixed(2)
            }
          ];
        }

        // Batches
        let batches = (prod.batches || []).map((b) => {
          const isExpired = b.expiry_date ? b.expiry_date < today : false;
          let daysToExpiry = null;
          if (b.expiry_date) {
            const diffMs = new Date(b.expiry_date) - new Date(today);
            daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
          return {
            ...b,
            is_expired: isExpired,
            days_to_expiry: daysToExpiry,
            near_expiry: daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 60
          };
        });

        if (batches.length === 0) {
          const isExpired = prod.expiry_date ? prod.expiry_date < today : false;
          let daysToExpiry = null;
          if (prod.expiry_date) {
            const diffMs = new Date(prod.expiry_date) - new Date(today);
            daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
          batches = [
            {
              id: 0,
              batch_number: prod.batch_number || 'BATCH-001',
              expiry_date: prod.expiry_date || null,
              stock_quantity: prod.quantity,
              is_expired: isExpired,
              days_to_expiry: daysToExpiry,
              near_expiry: daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 60
            }
          ];
        }

        // Calculate Stock Breakdown in CTN, BOX, PCS
        const totalBaseStock = prod.quantity || 0;
        const ctnUnit = units.find((u) => u.unit_name.toUpperCase() === 'CTN');
        const boxUnit = units.find((u) => u.unit_name.toUpperCase() === 'BOX');
        const ctnFactor = ctnUnit ? parseFloat(ctnUnit.conversion_factor) : 0;
        const boxFactor = boxUnit ? parseFloat(boxUnit.conversion_factor) : 0;

        let ctnCount = 0;
        let boxCount = 0;
        let pcsCount = totalBaseStock;

        if (ctnFactor > 0 && totalBaseStock >= ctnFactor) {
          ctnCount = Math.floor(totalBaseStock / ctnFactor);
          const remainderAfterCtn = totalBaseStock % ctnFactor;
          if (boxFactor > 0 && remainderAfterCtn >= boxFactor) {
            boxCount = Math.floor(remainderAfterCtn / boxFactor);
            pcsCount = remainderAfterCtn % boxFactor;
          } else {
            boxCount = 0;
            pcsCount = remainderAfterCtn;
          }
        } else if (boxFactor > 0 && totalBaseStock >= boxFactor) {
          boxCount = Math.floor(totalBaseStock / boxFactor);
          pcsCount = totalBaseStock % boxFactor;
        }

        const breakdownParts = [];
        if (ctnCount > 0) breakdownParts.push(`${ctnCount} CTN`);
        if (boxCount > 0) breakdownParts.push(`${boxCount} BOX`);
        breakdownParts.push(`${pcsCount} PCS`);

        return {
          ...prod,
          units,
          batches,
          available_stock_base: totalBaseStock,
          stock_breakdown: {
            ctn: ctnCount,
            box: boxCount,
            pcs: pcsCount,
            cartons: ctnCount,
            boxes: boxCount,
            pieces: pcsCount,
            formatted: breakdownParts.join(', ')
          }
        };
      });

      return apiResponse.success(
        res,
        { products: formatted },
        'Products searched successfully',
        200,
        { count: formatted.length }
      );
    } catch (error) {
      next(error);
    }
  },

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

      // Filter by sub-category
      if (req.query.sub_category_id) {
        where.sub_category_id = req.query.sub_category_id;
      }

      // Filter by brand
      if (req.query.brand_id) {
        where.brand_id = req.query.brand_id;
      } else if (req.query.brand) {
        where[Op.or] = [
          { brand: req.query.brand },
          { '$brandRel.name$': req.query.brand }
        ];
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
          },
          {
            model: SubCategory,
            as: 'subCategory',
            attributes: ['id', 'name']
          },
          {
            model: Brand,
            as: 'brandRel',
            attributes: ['id', 'name']
          },
          {
            model: Unit,
            as: 'unitRel',
            attributes: ['id', 'name', 'code']
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
          },
          {
            model: SubCategory,
            as: 'subCategory',
            attributes: ['id', 'name']
          },
          {
            model: Brand,
            as: 'brandRel',
            attributes: ['id', 'name']
          },
          {
            model: Unit,
            as: 'unitRel',
            attributes: ['id', 'name', 'code']
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
        retail_price,
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
        sub_category_id,
        brand_id,
        unit_id,
        image_url,
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
            selling_price: parseFloat(selling_price ?? retail_price) || 0,
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
            sub_category_id: sub_category_id || null,
            brand_id: brand_id || null,
            unit_id: unit_id || null,
            image_url: image_url ? image_url.trim() : null,
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
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: SubCategory, as: 'subCategory', attributes: ['id', 'name'] },
          { model: Brand, as: 'brandRel', attributes: ['id', 'name'] },
          { model: Unit, as: 'unitRel', attributes: ['id', 'name', 'code'] }
        ]
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
        retail_price,
        low_stock_threshold,
        tax_rate,
        unit,
        wholesale_price,
        brand,
        batch_number,
        expiry_date,
        carton_pack_qty,
        category_id,
        sub_category_id,
        brand_id,
        unit_id,
        image_url,
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
      if (selling_price !== undefined || retail_price !== undefined) {
        updateData.selling_price = parseFloat(selling_price ?? retail_price) || 0;
      }
      if (low_stock_threshold !== undefined) updateData.low_stock_threshold = Math.max(0, parseInt(low_stock_threshold, 10) || 0);
      if (tax_rate !== undefined) updateData.tax_rate = parseFloat(tax_rate) || 0;
      if (unit !== undefined) updateData.unit = unit.trim();
      if (wholesale_price !== undefined) updateData.wholesale_price = parseFloat(wholesale_price) || 0;
      if (brand !== undefined) updateData.brand = brand ? brand.trim() : null;
      if (batch_number !== undefined) updateData.batch_number = batch_number ? batch_number.trim() : null;
      if (expiry_date !== undefined) updateData.expiry_date = expiry_date || null;
      if (carton_pack_qty !== undefined) updateData.carton_pack_qty = parseInt(carton_pack_qty, 10) || 1;
      if (category_id !== undefined) updateData.category_id = category_id || null;
      if (sub_category_id !== undefined) updateData.sub_category_id = sub_category_id || null;
      if (brand_id !== undefined) updateData.brand_id = brand_id || null;
      if (unit_id !== undefined) updateData.unit_id = unit_id || null;
      if (image_url !== undefined) updateData.image_url = image_url ? image_url.trim() : null;
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      await product.update(updateData);

      const updatedWithCategory = await Product.findByPk(product.id, {
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: SubCategory, as: 'subCategory', attributes: ['id', 'name'] },
          { model: Brand, as: 'brandRel', attributes: ['id', 'name'] },
          { model: Unit, as: 'unitRel', attributes: ['id', 'name', 'code'] }
        ]
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
