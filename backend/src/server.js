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

// Start environmental monitoring job
startEnvironmentalMonitoring();

const app = express();

// Security middleware with CSP for Razorpay eval support and script sources
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://checkout.razorpay.com' ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'http://localhost:5000'],
        imgSrc: ["'self'", 'data:'],
        frameSrc: ["'self'", 'https://checkout.razorpay.com']
      }
    }
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS
const frontendUrls = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || frontendUrls.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/payment', paymentRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Parametric Micro-Insurance API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        getMe: 'GET /api/auth/me'
      },
      user: {
        updateLocation: 'POST /api/user/location',
        getProfile: 'GET /api/user/profile',
        updateProfile: 'PUT /api/user/profile'
      },
      environment: {
        fetchData: 'POST /api/environment/fetch',
        getLogs: 'GET /api/environment/logs',
        getLatest: 'GET /api/environment/latest',
        getJobStatus: 'GET /api/environment/job-status'
      }
    }
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

export default app;