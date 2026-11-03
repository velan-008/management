import { Op } from 'sequelize';
import { sequelize, Unit, Product } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const unitController = {
  // GET /api/units
  list: async (req, res, next) => {
    try {
      const bId = parseInt(req.businessId, 10);
      const { q, status } = req.query;

      const where = { business_id: bId };

      if (status) {
        where.status = status;
      }

      if (q && q.trim()) {
        where[Op.or] = [
          { name: { [Op.like]: `%${q.trim()}%` } },
          { code: { [Op.like]: `%${q.trim()}%` } }
        ];
      }

      const units = await Unit.findAll({
        where,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM products AS p
                WHERE (p.unit_id = Unit.id OR LOWER(p.unit) = LOWER(Unit.name) OR LOWER(p.unit) = LOWER(Unit.code)) AND p.business_id = ${bId} AND p.is_active = true
              )`),
              'product_count'
            ]
          ]
        },
        order: [['name', 'ASC']]
      });

      return apiResponse.success(res, { units }, 'Units retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // GET /api/units/:id
  getById: async (req, res, next) => {
    try {
      const unit = await Unit.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!unit) {
        return apiResponse.error(res, 'Unit not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { unit }, 'Unit retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/units
  create: async (req, res, next) => {
    try {
      const { name, code, description, status = 'ACTIVE' } = req.body;
      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Unit name is required', 400, 'VALIDATION_ERROR');
      }
      if (!code || !code.trim()) {
        return apiResponse.error(res, 'Unit code is required', 400, 'VALIDATION_ERROR');
      }

      const trimmedName = name.trim();
      const trimmedCode = code.trim().toUpperCase();

      const existing = await Unit.findOne({
        where: {
          business_id: req.businessId,
          [Op.or]: [{ name: trimmedName }, { code: trimmedCode }]
        }
      });

      if (existing) {
        return apiResponse.error(
          res,
          'A unit with this name or code already exists in your organization',
          409,
          'UNIT_EXISTS'
        );
      }

      const unit = await Unit.create({
        business_id: req.businessId,
        name: trimmedName,
        code: trimmedCode,
        description: description ? description.trim() : null,
        status: status || 'ACTIVE'
      });

      return apiResponse.success(res, { unit }, 'Unit created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/units/:id
  update: async (req, res, next) => {
    try {
      const unit = await Unit.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!unit) {
        return apiResponse.error(res, 'Unit not found', 404, 'NOT_FOUND');
      }

      const { name, code, description, status } = req.body;
      const targetName = name !== undefined ? name.trim() : unit.name;
      const targetCode = code !== undefined ? code.trim().toUpperCase() : unit.code;

      if (targetName !== unit.name || targetCode !== unit.code) {
        const existing = await Unit.findOne({
          where: {
            business_id: req.businessId,
            [Op.or]: [{ name: targetName }, { code: targetCode }],
            id: { [Op.ne]: unit.id }
          }
        });

        if (existing) {
          return apiResponse.error(
            res,
            'A unit with this name or code already exists in your organization',
            409,
            'UNIT_EXISTS'
          );
        }
      }

      await unit.update({
        name: targetName,
        code: targetCode,
        description: description !== undefined ? (description ? description.trim() : null) : unit.description,
        status: status !== undefined ? status : unit.status
      });

      return apiResponse.success(res, { unit }, 'Unit updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/units/:id
  delete: async (req, res, next) => {
    try {
      const unit = await Unit.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!unit) {
        return apiResponse.error(res, 'Unit not found', 404, 'NOT_FOUND');
      }

      await sequelize.transaction(async (t) => {
        await Product.update(
          { unit_id: null },
          {
            where: { unit_id: unit.id, business_id: req.businessId },
            transaction: t
          }
        );

        await unit.destroy({ transaction: t });
      });

      return apiResponse.success(
        res,
        { id: unit.id },
        'Unit deleted successfully'
      );
    } catch (error) {
      next(error);
    }
  }
};

