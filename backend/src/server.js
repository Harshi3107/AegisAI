import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import connectDB from './config/database.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import environmentRoutes from './routes/environment.js';
import claimsRoutes from './routes/claims.js';
import paymentRoutes from './routes/payment.js';

import { startEnvironmentalMonitoring } from './jobs/environmentJob.js';

import { errorHandler, notFound } from './middlewares/error.js';

connectDB();
startEnvironmentalMonitoring();

const app = express();


// ✅ DEBUG (to confirm deployment)
console.log("🔥 NEW BACKEND VERSION RUNNING");


// ✅ REMOVE CSP COMPLETELY
app.use(helmet({
  contentSecurityPolicy: false
}));


// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}));


// ✅ FULL CORS FIX (NO RESTRICTIONS)
app.use(cors());


// ✅ FORCE HEADERS (CRITICAL)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});


// ✅ HANDLE PREFLIGHT
app.options('*', (req, res) => {
  res.sendStatus(200);
});


// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Health
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    environment: process.env.NODE_ENV
  });
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/payment', paymentRoutes);


// Root
app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});


// Errors
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


process.on('unhandledRejection', (err) => {
  console.log(err.message);
  server.close(() => process.exit(1));
});

export default app;