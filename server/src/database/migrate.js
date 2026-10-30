import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, 'migrations');

export const runMigrations = async (direction = 'up') => {
  const queryInterface = sequelize.getQueryInterface();

  // Ensure metadata table exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sequelize_meta (
      name VARCHAR(255) NOT NULL PRIMARY KEY
    ) ENGINE=InnoDB;
  `);

  const [appliedRows] = await sequelize.query('SELECT name FROM sequelize_meta ORDER BY name ASC;');
  const appliedMigrations = new Set(appliedRows.map((r) => r.name));

  const allFiles = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  if (direction === 'up') {
    logger.info('Starting database migrations (UP)...');
    let count = 0;
    for (const file of allFiles) {
      if (!appliedMigrations.has(file)) {
        logger.info(`Applying migration: ${file}`);
        const migrationPath = path.resolve(migrationsDir, file);
        const migration = await import(`file://${migrationPath.replace(/\\/g, '/')}`);
        
        await migration.up(queryInterface, sequelize.constructor);
        await sequelize.query('INSERT INTO sequelize_meta (name) VALUES (?);', {
          replacements: [file]
        });
        count++;
      }
    }
    logger.info(`Migrations complete. Applied ${count} new migration(s).`);
  } else if (direction === 'undo') {
    logger.info('Undoing last migration (DOWN)...');
    const appliedFiles = allFiles.filter((f) => appliedMigrations.has(f));
    if (appliedFiles.length > 0) {
      const lastFile = appliedFiles[appliedFiles.length - 1];
      logger.info(`Reverting migration: ${lastFile}`);
      const migrationPath = path.resolve(migrationsDir, lastFile);
      const migration = await import(`file://${migrationPath.replace(/\\/g, '/')}`);
      
      await migration.down(queryInterface, sequelize.constructor);
      await sequelize.query('DELETE FROM sequelize_meta WHERE name = ?;', {
        replacements: [lastFile]
      });
      logger.info(`Reverted migration: ${lastFile}`);
    } else {
      logger.info('No applied migrations to revert.');
    }
  }
};

// If run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  const arg = process.argv[2] === 'undo' ? 'undo' : 'up';
  runMigrations(arg)
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Migration failed: ${err.message}`, { err });
      process.exit(1);
    });
}
