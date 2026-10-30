import { authService } from '../services/auth.service.js';
import { apiResponse } from '../utils/apiResponse.js';

export const authController = {
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return apiResponse.success(res, result, 'Logged in successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  register: async (req, res, next) => {
    try {
      const result = await authService.registerBusiness(req.body);
      return apiResponse.success(res, result, 'Business organization and admin account registered successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  me: async (req, res, next) => {
    try {
      // req.user is attached by authenticate middleware
      return apiResponse.success(
        res,
        {
          user: req.user.toSafeObject(),
          business: req.user.business
        },
        'Profile retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      // JWT is stateless; client removes token.
      // In production with token blacklisting, token identifier or session would be invalidated here.
      return apiResponse.success(
        res,
        { loggedOut: true },
        'Logged out successfully. Please clear the local authorization token.'
      );
    } catch (error) {
      next(error);
    }
  }
};
