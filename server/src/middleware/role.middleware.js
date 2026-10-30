import { apiResponse } from '../utils/apiResponse.js';

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse.error(res, 'Authentication required before checking permissions', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return apiResponse.error(
        res,
        `Access forbidden: required role [${allowedRoles.join(' or ')}], but your role is [${req.user.role}]`,
        403,
        'FORBIDDEN_ACCESS'
      );
    }

    next();
  };
};
