import { app } from './src/app.js';
import { env } from './src/config/env.config.js';
import { connectDB, sequelize } from './src/database/connection.js';
import { logger } from './src/utils/logger.js';

const startServer = async () => {
  try {
    // 1. Verify database connectivity
    await connectDB();

    // 2. Start HTTP Listener
    const server = app.listen(env.PORT, () => {
      logger.info(`BUSINESSFLOW API server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
      logger.info(`Health check available at: http://localhost:${env.PORT}/api/health`);
    });

    // 3. Graceful Shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await sequelize.close();
          logger.info('Database connection pool closed.');
          process.exit(0);
        } catch (err) {
          logger.error('Error closing database connection:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10s if graceful fails
      setTimeout(() => {
        logger.error('Forcefully terminating server.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    logger.error('Fatal server boot error:', error);
    process.exit(1);
  }
};

startServer();
