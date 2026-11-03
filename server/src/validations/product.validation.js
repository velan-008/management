import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150),
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  barcode: z.string().trim().max(80).optional().nullable().or(z.literal('')),
  category_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  sub_category_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  brand_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  unit_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  brand: z.string().trim().max(80).optional().nullable().or(z.literal('')),
  expiry_date: z.string().optional().nullable().or(z.literal('')),
  image_url: z.string().optional().nullable().or(z.literal('')),
  description: z.string().trim().optional().nullable().or(z.literal('')),
  cost_price: z.coerce.number().min(0, 'Cost price must be non-negative').default(0),
  selling_price: z.coerce.number().positive('Selling price must be greater than zero').optional(),
  retail_price: z.coerce.number().positive('Retail price must be greater than zero').optional(),
  wholesale_price: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0, 'Initial quantity must be non-negative').default(0),
  low_stock_threshold: z.coerce.number().int().min(0, 'Low stock threshold must be non-negative').default(5),
  tax_rate: z.coerce.number().min(0, 'Tax rate must be at least 0').max(100, 'Tax rate cannot exceed 100').default(0),
  unit: z.string().trim().max(20).default('pcs'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  is_active: z.boolean().default(true)
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150).optional(),
  sku: z.string().trim().min(1, 'SKU is required').max(60).optional(),
  barcode: z.string().trim().max(80).optional().nullable().or(z.literal('')),
  category_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  sub_category_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  brand_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  unit_id: z.coerce.number().int().positive().optional().nullable().or(z.literal('')),
  brand: z.string().trim().max(80).optional().nullable().or(z.literal('')),
  expiry_date: z.string().optional().nullable().or(z.literal('')),
  image_url: z.string().optional().nullable().or(z.literal('')),
  description: z.string().trim().optional().nullable().or(z.literal('')),
  cost_price: z.coerce.number().min(0, 'Cost price must be non-negative').optional(),
  selling_price: z.coerce.number().positive('Selling price must be greater than zero').optional(),
  retail_price: z.coerce.number().positive('Retail price must be greater than zero').optional(),
  wholesale_price: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  low_stock_threshold: z.coerce.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
  tax_rate: z.coerce.number().min(0, 'Tax rate must be at least 0').max(100, 'Tax rate cannot exceed 100').optional(),
  unit: z.string().trim().max(20).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  is_active: z.boolean().optional()
});

export const adjustStockSchema = z.object({
  quantity_change: z.coerce.number().int().refine((val) => val !== 0, {
    message: 'quantity_change must be a non-zero integer'
  }),
  type: z.enum(['PURCHASE', 'SALE', 'RETURN', 'DAMAGE', 'ADJUSTMENT']).default('ADJUSTMENT'),
  notes: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  reference_id: z.string().trim().max(80).optional().nullable().or(z.literal(''))
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(80),
  description: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
});

export const subCategorySchema = z.object({
  name: z.string().trim().min(1, 'Sub-category name is required').max(100),
  category_id: z.coerce.number().int().positive('Valid category is required'),
  description: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
});

export const brandSchema = z.object({
  name: z.string().trim().min(1, 'Brand name is required').max(100),
  description: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
});

export const unitSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required').max(50),
  code: z.string().trim().min(1, 'Unit code is required').max(20),
  description: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
});
