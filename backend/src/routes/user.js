import express from 'express';
import { updateLocation, getProfile, updateProfile } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/location', updateLocation);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;