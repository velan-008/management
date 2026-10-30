import { Business, AuditLog } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const businessController = {
  /**
   * GET /api/businesses/me — Current tenant organization profile
   */
  getMe: async (req, res, next) => {
    try {
      const business = await Business.findByPk(req.businessId);
      if (!business) return apiResponse.error(res, 'Business not found', 404, 'NOT_FOUND');
      return apiResponse.success(res, { business }, 'Business details retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/businesses/me — Update tenant organization profile
   */
  updateMe: async (req, res, next) => {
    try {
      const business = await Business.findByPk(req.businessId);
      if (!business) return apiResponse.error(res, 'Business not found', 404, 'NOT_FOUND');

      const {
        name,
        email,
        phone,
        address,
        tax_number,
        state,
        currency_code,
        currency_symbol
      } = req.body;

      const updateData = {};
      if (name !== undefined && typeof name === 'string' && name.trim()) {
        updateData.name = name.trim();
      }
      if (email !== undefined && typeof email === 'string' && email.trim()) {
        updateData.email = email.trim().toLowerCase();
      }
      if (phone !== undefined) {
        updateData.phone = phone && typeof phone === 'string' ? phone.trim() : null;
      }
      if (address !== undefined) {
        updateData.address = address && typeof address === 'string' ? address.trim() : null;
      }
      if (tax_number !== undefined) {
        updateData.tax_number = tax_number && typeof tax_number === 'string' ? tax_number.trim() : null;
      }
      if (state !== undefined && typeof state === 'string' && state.trim()) {
        updateData.state = state.trim();
      }
      if (currency_code !== undefined && typeof currency_code === 'string' && currency_code.trim()) {
        updateData.currency_code = currency_code.trim().toUpperCase();
      }
      if (currency_symbol !== undefined && typeof currency_symbol === 'string' && currency_symbol.trim()) {
        updateData.currency_symbol = currency_symbol.trim();
      }

      await business.update(updateData);

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'BUSINESS_UPDATE',
        entity: 'Business',
        entity_id: String(business.id),
        changes: { name: business.name, state: business.state },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { business }, 'Business settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
};
