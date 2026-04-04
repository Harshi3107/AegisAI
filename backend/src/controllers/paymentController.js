import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createOrder, verifyPayment } from '../services/paymentService.js';

export const createOrderController = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const order = await createOrder(Number(amount));

    res.status(201).json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount / 100,
        currency: order.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPaymentController = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
      return res.status(400).json({ success: false, message: 'Missing verification fields' });
    }

    const isValid = verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const withdrawAmount = Number(amount);
    if (withdrawAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount for withdrawal' });
    }

    if (user.wallet_balance < withdrawAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    user.wallet_balance = Math.max(user.wallet_balance - withdrawAmount, 0);
    await user.save();

    await Transaction.create({
      user_id: user._id,
      amount: withdrawAmount,
      type: 'debit',
      reason: 'Razorpay withdrawal test transaction'
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      data: {
        wallet_balance: user.wallet_balance,
        amount: withdrawAmount,
        razorpay_payment_id,
        razorpay_order_id
      }
    });
  } catch (error) {
    next(error);
  }
};