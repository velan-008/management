import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config.js';
import { sequelize, User, Business } from '../models/index.js';

export const authService = {
  /**
   * Authenticate user with email and password
   */
  login: async (email, password) => {
    // Find user by email across businesses
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [
        {
          model: Business,
          as: 'business',
          attributes: ['id', 'name', 'email', 'phone', 'address', 'tax_number', 'currency_code', 'currency_symbol', 'state']
        }
      ]
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Your account has been deactivated. Please contact your administrator.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_DEACTIVATED';
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Sign JWT
    const tokenPayload = {
      id: user.id,
      business_id: user.business_id,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(tokenPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm
    });

    return {
      token,
      user: user.toSafeObject()
    };
  },

  /**
   * Register a new business organization with an initial Admin
   */
  registerBusiness: async (data) => {
    return await sequelize.transaction(async (t) => {
      // Check if user email already exists
      const existingUser = await User.findOne({
        where: { email: data.email.toLowerCase().trim() },
        transaction: t
      });

      if (existingUser) {
        const error = new Error('An account with this email address already exists');
        error.statusCode = 409;
        error.code = 'EMAIL_ALREADY_EXISTS';
        throw error;
      }

      // Create Business
      const business = await Business.create(
        {
          name: data.businessName.trim(),
          email: data.businessEmail.toLowerCase().trim(),
          state: data.state || 'Default',
          currency_code: data.currencyCode || 'USD',
          currency_symbol: data.currencySymbol || '$'
        },
        { transaction: t }
      );

      // Create initial Admin User for this new business
      const user = await User.create(
        {
          business_id: business.id,
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          password_hash: data.password, // Hook hashes with bcrypt
          role: 'ADMIN', // The creator of a new business is always its initial Admin
          is_active: true
        },
        { transaction: t }
      );

      // Sign JWT
      const token = jwt.sign(
        {
          id: user.id,
          business_id: business.id,
          role: user.role,
          email: user.email
        },
        jwtConfig.secret,
        {
          expiresIn: jwtConfig.expiresIn,
          algorithm: jwtConfig.algorithm
        }
      );

      const safeUser = user.toSafeObject();
      safeUser.business = {
        id: business.id,
        name: business.name,
        currency_code: business.currency_code,
        currency_symbol: business.currency_symbol,
        state: business.state
      };

      return {
        token,
        user: safeUser
      };
    });
  }
};
