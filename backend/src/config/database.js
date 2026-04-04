import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let retryTimer = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  } catch (error) {
    console.error('Database connection error:', error.message);

    // Keep the API alive in development and retry periodically for transient Atlas/IP issues.
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDB();
      }, 10000);
    }
  }
};

export default connectDB;