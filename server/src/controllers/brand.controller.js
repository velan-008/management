import { Op } from 'sequelize';
import { sequelize, Brand, Product } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const brandController = {
  // GET /api/brands
  list: async (req, res, next) => {
    try {
      const bId = parseInt(req.businessId, 10);
      const { q, status } = req.query;

      const where = { business_id: bId };

      if (status) {
        where.status = status;
      }

      if (q && q.trim()) {
        where.name = { [Op.like]: `%${q.trim()}%` };
      }

      const brands = await Brand.findAll({
        where,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM products AS p
                WHERE (p.brand_id = Brand.id OR p.brand = Brand.name) AND p.business_id = ${bId} AND p.is_active = true
              )`),
              'product_count'
            ]
          ]
        },
        order: [['name', 'ASC']]
      });

      return apiResponse.success(res, { brands }, 'Brands retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // GET /api/brands/:id
  getById: async (req, res, next) => {
    try {
      const brand = await Brand.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!brand) {
        return apiResponse.error(res, 'Brand not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { brand }, 'Brand retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/brands
  create: async (req, res, next) => {
    try {
      const { name, description, status = 'ACTIVE' } = req.body;
      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Brand name is required', 400, 'VALIDATION_ERROR');
      }

      const trimmedName = name.trim();
      const existing = await Brand.findOne({
        where: { business_id: req.businessId, name: trimmedName }
      });

      if (existing) {
        return apiResponse.error(
          res,
          'A brand with this name already exists in your organization',
          409,
          'BRAND_EXISTS'
        );
      }

      const brand = await Brand.create({
        business_id: req.businessId,
        name: trimmedName,
        description: description ? description.trim() : null,
        status: status || 'ACTIVE'
      });

      return apiResponse.success(res, { brand }, 'Brand created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/brands/:id
  update: async (req, res, next) => {
    try {
      const brand = await Brand.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!brand) {
        return apiResponse.error(res, 'Brand not found', 404, 'NOT_FOUND');
      }

      const { name, description, status } = req.body;

      if (name && name.trim() !== brand.name) {
        const existing = await Brand.findOne({
          where: {
            business_id: req.businessId,
            name: name.trim(),
            id: { [Op.ne]: brand.id }
          }
        });

        if (existing) {
          return apiResponse.error(
            res,
            'A brand with this name already exists in your organization',
            409,
            'BRAND_EXISTS'
          );
        }
      }

      await brand.update({
        name: name !== undefined ? name.trim() : brand.name,
        description: description !== undefined ? (description ? description.trim() : null) : brand.description,
        status: status !== undefined ? status : brand.status
      });

      return apiResponse.success(res, { brand }, 'Brand updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/brands/:id
  delete: async (req, res, next) => {
    try {
      const brand = await Brand.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!brand) {
        return apiResponse.error(res, 'Brand not found', 404, 'NOT_FOUND');
      }

      await sequelize.transaction(async (t) => {
        await Product.update(
          { brand_id: null },
          {
            where: { brand_id: brand.id, business_id: req.businessId },
            transaction: t
          }
        );

        await brand.destroy({ transaction: t });
      });

      return apiResponse.success(
        res,
        { id: brand.id },
        'Brand deleted successfully'
      );
    } catch (error) {
      next(error);
    }
  }
};

