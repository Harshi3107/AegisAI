import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database connection
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import environmentRoutes from './routes/environment.js';
import claimsRoutes from './routes/claims.js';
import paymentRoutes from './routes/payment.js';

// Import jobs
import { startEnvironmentalMonitoring } from './jobs/environmentJob.js';

// Import middleware
import { errorHandler, notFound } from './middlewares/error.js';

// Connect to database
connectDB();

// Start cron job
startEnvironmentalMonitoring();

const app = express();


// ✅ FIX 1 — REMOVE CSP COMPLETELY (for demo)
app.use(helmet({
  contentSecurityPolicy: false
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);


// ✅ FIX 2 — SIMPLE CORS (ALLOW EVERYTHING FOR DEMO)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// ✅ IMPORTANT for preflight
app.options('*', cors());


// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
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
  res.json({
    success: true,
    message: 'Parametric Micro-Insurance API',
  });
});


// Error handling
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});


// Handle crashes
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;