import User from '../models/User.js';
import { generateToken } from '../config/jwt.js';
import { sendPolicyEmail, sendWelcomeEmail } from '../services/emailService.js';
import twilio from 'twilio';

// In-memory store for OTP (in production, use Redis or database)
const otpStore = new Map();

const hasValidTwilioCredentials = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const phoneNumber = process.env.TWILIO_SENDER_NUMBER || '';

  return accountSid.startsWith('AC') && authToken.length > 0 && phoneNumber.startsWith('+');
};

const getTwilioClient = () => {
  if (!hasValidTwilioCredentials()) {
    return null;
  }

  try {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.warn('Twilio client could not be initialized:', error.message);
    return null;
  }
};

const shouldExposeOtpFallback = () => process.env.NODE_ENV !== 'production' || process.env.OTP_FALLBACK_MODE === 'true';

const generatePolicyId = () => `AEGIS-${Math.floor(100000 + Math.random() * 900000)}`;

const formatPhoneNumber = (phone) => {
  const digitsOnly = String(phone || '').replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (String(phone || '').startsWith('+')) {
    return String(phone).trim();
  }

  return `+${digitsOnly}`;
};

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const normalizedPhone = String(phone || '').replace(/\D/g, '');

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP
    otpStore.set(normalizedPhone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // 🔥 ALWAYS fallback (NO TWILIO)
    console.log(`📲 DEMO OTP for ${normalizedPhone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: `OTP generated (demo mode)`,
      data: {
        phone: normalizedPhone,
        otp   // 👈 IMPORTANT: send OTP to frontend
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = String(phone || '').replace(/\D/g, '');

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone and OTP'
      });
    }

    const storedData = otpStore.get(normalizedPhone);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new OTP.'
      });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // OTP verified successfully
    otpStore.delete(normalizedPhone);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        phone: normalizedPhone,
        verified: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      firstName,
      lastName,
      username,
      phone,
      company,
      plan,
      risk,
      city,
      upi,
      policyId
    } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (normalizedUsername) {
      const existingUsername = await User.findOne({ username: normalizedUsername });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    const user = await User.create({
      username: normalizedUsername || undefined,
      name: name || `${firstName || ''} ${lastName || ''}`.trim(),
      email,
      password,
      phone,
      company,
      plan: plan || 'standard',
      risk: risk || 'Low',
      policyId: policyId || generatePolicyId(),
      upi,
      ...(city ? { location: { city } } : {})
    });

    // Send emails without blocking registration if delivery fails
    const displayName = firstName || name || 'User';
    await Promise.allSettled([
      sendWelcomeEmail(email, displayName, phone || 'N/A'),
      sendPolicyEmail(email, displayName, {
        plan: plan || 'Pending activation',
        coverage: '100,000',
        premium: '999',
        status: 'Pending activation',
        phone: phone || 'N/A'
      })
    ]);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, username, phone, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\D/g, '');

    // Validation
    if ((!normalizedEmail && !normalizedUsername && !normalizedPhone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, username, or phone and password'
      });
    }

    let query = null;
    if (normalizedEmail) {
      query = { email: normalizedEmail };
    } else if (normalizedUsername) {
      query = { username: normalizedUsername };
    } else {
      query = { phone: normalizedPhone };
    }

    // Check for user and include password for comparison
    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};