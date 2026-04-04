import express from 'express';
import { createOrderController, verifyPaymentController } from '../controllers/paymentController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
router.use(protect);

router.post('/create-order', createOrderController);
router.post('/verify', verifyPaymentController);

export default router;
