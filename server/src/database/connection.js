import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/db.config.js';
import { logger } from '../utils/logger.js';

export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`Database connection established successfully [${dbConfig.database}@${dbConfig.host}:${dbConfig.port}].`);
  } catch (error) {
    logger.error(`Unable to connect to the database: ${error.message}`, { error });
    throw error;
  }
};
