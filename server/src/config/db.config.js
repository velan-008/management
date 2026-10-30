import { env } from './env.config.js';
import { logger } from '../utils/logger.js';

export const dbConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  dialect: 'mysql',
  timezone: '+00:00', // Enforce UTC
  pool: {
    max: 15,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
};
