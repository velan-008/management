import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredVars = ['JWT_SECRET', 'DB_NAME', 'DB_USER'];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`CRITICAL CONFIG ERROR: Environment variable "${varName}" is missing.`);
  }
}

if (process.env.NODE_ENV === 'production') {
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters in production.');
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_NAME: process.env.NODE_ENV === 'test' 
    ? (process.env.DB_TEST_NAME || 'businessflow_test')
    : (process.env.DB_NAME || 'businessflow_dev'),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h'
};
