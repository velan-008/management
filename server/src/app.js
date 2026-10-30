import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.config.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiResponse } from './utils/apiResponse.js';
import routes from './routes/index.js';

export const app = express();

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman) in non-production
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by Access-Control-Allow-Origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// General Rate Limiting
if (env.NODE_ENV !== 'test') {
  app.use(apiLimiter);
}

// Master API Routes
app.use('/api', routes);

// 404 Handler for Unmatched Endpoints
app.use((req, res) => {
  return apiResponse.error(
    res,
    `Endpoint ${req.method} ${req.originalUrl} not found`,
    404,
    'NOT_FOUND'
  );
});

// Centralized Error Handling Middleware
app.use(errorHandler);
