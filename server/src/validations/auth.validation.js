import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

export const registerBusinessSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters'),
  businessEmail: z.string().trim().email('Valid business email is required'),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Valid user email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  state: z.string().trim().optional(),
  currencyCode: z.string().trim().max(5).optional(),
  currencySymbol: z.string().trim().max(5).optional()
  // NOTE: 'role' is intentionally omitted here to prevent privilege escalation
});
