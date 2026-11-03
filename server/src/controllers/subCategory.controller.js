import { Op } from 'sequelize';
import { sequelize, SubCategory, Category, Product } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const subCategoryController = {
  // GET /api/sub-categories
  list: async (req, res, next) => {
    try {
      const bId = parseInt(req.businessId, 10);
      const { category_id, q, status } = req.query;

      const where = { business_id: bId };

      if (category_id) {
        where.category_id = category_id;
      }

      if (status) {
        where.status = status;
      }

      if (q && q.trim()) {
        where.name = { [Op.like]: `%${q.trim()}%` };
      }

      const subCategories = await SubCategory.findAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ],
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM products AS p
                WHERE p.sub_category_id = SubCategory.id AND p.business_id = ${bId} AND p.is_active = true
              )`),
              'product_count'
            ]
          ]
        },
        order: [['name', 'ASC']]
      });

      return apiResponse.success(res, { subCategories }, 'Sub-categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // GET /api/sub-categories/:id
  getById: async (req, res, next) => {
    try {
      const subCategory = await SubCategory.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ]
      });

      if (!subCategory) {
        return apiResponse.error(res, 'Sub-category not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { subCategory }, 'Sub-category retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/sub-categories
  create: async (req, res, next) => {
    try {
      const { name, category_id, description, status = 'ACTIVE' } = req.body;
      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Sub-category name is required', 400, 'VALIDATION_ERROR');
      }
      if (!category_id) {
        return apiResponse.error(res, 'Category is required', 400, 'VALIDATION_ERROR');
      }

      const category = await Category.findOne({
        where: { id: category_id, business_id: req.businessId }
      });
      if (!category) {
        return apiResponse.error(res, 'Invalid category selected', 400, 'INVALID_CATEGORY');
      }

      const trimmedName = name.trim();
      const existing = await SubCategory.findOne({
        where: {
          business_id: req.businessId,
          category_id,
          name: trimmedName
        }
      });

      if (existing) {
        return apiResponse.error(
          res,
          'A sub-category with this name already exists in this category',
          409,
          'SUBCATEGORY_EXISTS'
        );
      }

      const subCategory = await SubCategory.create({
        business_id: req.businessId,
        category_id,
        name: trimmedName,
        description: description ? description.trim() : null,
        status: status || 'ACTIVE'
      });

      const loaded = await SubCategory.findByPk(subCategory.id, {
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      });

      return apiResponse.success(res, { subCategory: loaded }, 'Sub-category created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/sub-categories/:id
  update: async (req, res, next) => {
    try {
      const subCategory = await SubCategory.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!subCategory) {
        return apiResponse.error(res, 'Sub-category not found', 404, 'NOT_FOUND');
      }

      const { name, category_id, description, status } = req.body;

      const targetCategoryId = category_id !== undefined ? category_id : subCategory.category_id;
      const targetName = name !== undefined ? name.trim() : subCategory.name;

      if (targetCategoryId) {
        const cat = await Category.findOne({
          where: { id: targetCategoryId, business_id: req.businessId }
        });
        if (!cat) {
          return apiResponse.error(res, 'Invalid category selected', 400, 'INVALID_CATEGORY');
        }
      }

      if (targetName && (targetName !== subCategory.name || targetCategoryId !== subCategory.category_id)) {
        const existing = await SubCategory.findOne({
          where: {
            business_id: req.businessId,
            category_id: targetCategoryId,
            name: targetName,
            id: { [Op.ne]: subCategory.id }
          }
        });

        if (existing) {
          return apiResponse.error(
            res,
            'A sub-category with this name already exists in this category',
            409,
            'SUBCATEGORY_EXISTS'
          );
        }
      }

      await subCategory.update({
        name: targetName,
        category_id: targetCategoryId,
        description: description !== undefined ? (description ? description.trim() : null) : subCategory.description,
        status: status !== undefined ? status : subCategory.status
      });

      const loaded = await SubCategory.findByPk(subCategory.id, {
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      });

      return apiResponse.success(res, { subCategory: loaded }, 'Sub-category updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/sub-categories/:id
  delete: async (req, res, next) => {
    try {
      const subCategory = await SubCategory.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!subCategory) {
        return apiResponse.error(res, 'Sub-category not found', 404, 'NOT_FOUND');
      }

      await sequelize.transaction(async (t) => {
        await Product.update(
          { sub_category_id: null },
          {
            where: { sub_category_id: subCategory.id, business_id: req.businessId },
            transaction: t
          }
        );

        await subCategory.destroy({ transaction: t });
      });

      return apiResponse.success(
        res,
        { id: subCategory.id },
        'Sub-category deleted successfully'
      );
    } catch (error) {
      next(error);
    }
  }
};

