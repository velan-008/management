import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config.js';
import { User, Business } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse.error(res, 'Authorization token required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return apiResponse.error(res, 'Session token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      return apiResponse.error(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
    }

    // Verify user still exists and is active
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Business,
          as: 'business',
          attributes: ['id', 'name', 'email', 'phone', 'address', 'tax_number', 'currency_code', 'currency_symbol', 'state']
        }
      ]
    });

    if (!user || !user.is_active) {
      return apiResponse.error(res, 'User account not found or has been deactivated', 401, 'UNAUTHORIZED');
    }

    // Attach verified user and business scope to request
    req.user = user;
    req.businessId = user.business_id;

    next();
  } catch (error) {
    next(error);
  }
};
