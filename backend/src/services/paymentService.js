import Razorpay from 'razorpay';
import crypto from 'crypto';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ Razorpay credentials are missing in .env (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Payment endpoints will be disabled.');
}

const razorpayClient = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;


export const createOrder = async (amount) => {
  if (!razorpayClient) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.');
  }
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount for order creation');
  }

  const options = {
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `withdraw-${Date.now()}`,
    payment_capture: 1
  };

  const order = await razorpayClient.orders.create(options);
  return order;
};

export const verifyPayment = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error('Missing payment verification fields');
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  return generated_signature === razorpay_signature;
};