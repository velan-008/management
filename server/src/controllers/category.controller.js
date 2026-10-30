import { Op } from 'sequelize';
import { sequelize, Category, Product } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const categoryController = {
  // GET /api/categories or /api/products/categories
  list: async (req, res, next) => {
    try {
      const bId = parseInt(req.businessId, 10);
      const categories = await Category.findAll({
        where: { business_id: bId },
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM products AS p
                WHERE p.category_id = Category.id AND p.business_id = ${bId} AND p.is_active = true
              )`),
              'product_count'
            ]
          ]
        },
        order: [['name', 'ASC']]
      });

      return apiResponse.success(res, { categories }, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // GET /api/categories/:id
  getById: async (req, res, next) => {
    try {
      const category = await Category.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!category) {
        return apiResponse.error(res, 'Category not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { category }, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/categories
  create: async (req, res, next) => {
    try {
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Category name is required', 400, 'VALIDATION_ERROR');
      }

      const trimmedName = name.trim();

      const existing = await Category.findOne({
        where: { business_id: req.businessId, name: trimmedName }
      });

      if (existing) {
        return apiResponse.error(
          res,
          'A category with this name already exists in your organization',
          409,
          'CATEGORY_EXISTS'
        );
      }

      const category = await Category.create({
        business_id: req.businessId,
        name: trimmedName,
        description: description ? description.trim() : null
      });

      return apiResponse.success(res, { category }, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/categories/:id
  update: async (req, res, next) => {
    try {
      const category = await Category.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!category) {
        return apiResponse.error(res, 'Category not found', 404, 'NOT_FOUND');
      }

      const { name, description } = req.body;

      if (name && name.trim() !== category.name) {
        const existing = await Category.findOne({
          where: {
            business_id: req.businessId,
            name: name.trim(),
            id: { [Op.ne]: category.id }
          }
        });

        if (existing) {
          return apiResponse.error(
            res,
            'A category with this name already exists in your organization',
            409,
            'CATEGORY_EXISTS'
          );
        }
      }

      await category.update({
        name: name !== undefined ? name.trim() : category.name,
        description: description !== undefined ? (description ? description.trim() : null) : category.description
      });

      return apiResponse.success(res, { category }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/categories/:id — safely re-associates products to NULL
  delete: async (req, res, next) => {
    try {
      const category = await Category.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!category) {
        return apiResponse.error(res, 'Category not found', 404, 'NOT_FOUND');
      }

      await sequelize.transaction(async (t) => {
        // Re-associate referencing products to NULL to preserve product catalog integrity
        await Product.update(
          { category_id: null },
          {
            where: { category_id: category.id, business_id: req.businessId },
            transaction: t
          }
        );

        await category.destroy({ transaction: t });
      });

      return apiResponse.success(
        res,
        { id: category.id },
        'Category deleted successfully. Associated products have been set to Uncategorized.'
      );
    } catch (error) {
      next(error);
    }
  }
};
