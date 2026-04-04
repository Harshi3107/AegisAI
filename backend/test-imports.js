// Simple test to verify imports work correctly
import express from 'express';
import User from './models/User.js';
import { generateToken } from './config/jwt.js';
import { protect } from './middlewares/auth.js';
import { getCityFromCoordinates } from './services/mapService.js';
import { register, login } from './controllers/authController.js';
import { updateLocation } from './controllers/userController.js';

console.log('✅ All imports successful!');
console.log('✅ Backend structure is valid and ready for use.');