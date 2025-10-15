import express from 'express';
import { authController } from '../controllers/authcontroller';

const router = express.Router();

// ===================================
// AUTHENTICATION ROUTES
// ===================================

// Signup - email + password → OTP
router.post('/signup', authController.signup);

// Login - email + password → verify → OTP
router.post('/login', authController.login);

// Verify OTP (for both signup and login)
router.post('/verify-code', authController.verifyCode);

// Resend OTP
router.post('/resend-code', authController.resendCode);

export default router;
