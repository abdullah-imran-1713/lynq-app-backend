import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { emailService } from '../services/emailService';
import { generateVerificationCode } from '../utils/generateCode';
import prisma from '../lib/prisma';

// ===================================
// TYPES
// ===================================
interface SignupRequest {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface VerifyRequest {
  email: string;
  code: string;
}

// ===================================
// HELPERS
// ===================================
const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
};

const createVerificationCode = async (
  email: string,
  purpose: 'signup' | 'login'
): Promise<string> => {
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing codes for this email
  await prisma.verificationCode.deleteMany({
    where: { email },
  });

  // Create new verification code
  await prisma.verificationCode.create({
    data: {
      email,
      code,
      purpose,
      expiresAt,
    },
  });

  return code;
};

// ===================================
// AUTH CONTROLLER
// ===================================
export const authController = {
  // ===================================
  // SIGNUP
  // ===================================
  async signup(req: Request, res: Response) {
    try {
      const { email, password }: SignupRequest = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Check for uppercase
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase letter',
        });
      }

      // Check for lowercase
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one lowercase letter',
        });
      }

      // Check for number
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one number',
        });
      }

      // Check for special character
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({
          success: false,
          message:
            'Password must contain at least one special character (!@#$%^&*)',
        });
      }
      console.log('📝 Signup request for:', email);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        if (existingUser.isVerified) {
          return res.status(409).json({
            success: false,
            message: 'Account already exists. Please login instead.',
            accountExists: true,
          });
        } else {
          // User exists but not verified - allow re-signup
          console.log('⚠️  User exists but not verified. Resending OTP...');

          // Update password (user might want to change it)
          const hashedPassword = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
          });

          // Generate and send new OTP
          const code = await createVerificationCode(email, 'signup');

          await emailService.sendVerificationEmail({
            email,
            code,
            name: existingUser.name || email.split('@')[0],
          });

          console.log('✅ New OTP sent to existing unverified user');

          return res.json({
            success: true,
            message: 'Verification code sent to email',
            email,
          });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user (unverified)
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: email.split('@')[0],
          isVerified: false,
        },
      });

      console.log('💾 User created (unverified):', user.id);

      // Generate verification code
      const code = await createVerificationCode(email, 'signup');

      console.log('🔑 OTP generated:', code);

      // Send verification email
      await emailService.sendVerificationEmail({
        email,
        code,
        name: user.name || email.split('@')[0],
      });

      console.log('✅ Signup OTP sent successfully');

      res.status(201).json({
        success: true,
        message: 'Verification code sent to email',
        email,
      });
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Signup failed. Please try again.',
      });
    }
  },

  // ===================================
  // LOGIN
  // ===================================
  async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      console.log('🔐 Login attempt for:', email);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Account not found. Please sign up first.',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.log('❌ Invalid password for:', email);
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
        });
      }

      console.log('✅ Password verified for:', email);

      // Check if user is verified
      if (!user.isVerified) {
        console.log('⚠️  User not verified. Sending OTP...');

        // Generate and send OTP
        const code = await createVerificationCode(email, 'signup');

        await emailService.sendVerificationEmail({
          email,
          code,
          name: user.name || email.split('@')[0],
        });

        return res.json({
          success: true,
          message: 'Please verify your email. Verification code sent.',
          email,
          needsVerification: true,
        });
      }

      // User is verified - send 2FA OTP
      const code = await createVerificationCode(email, 'login');

      console.log('🔑 Login OTP generated:', code);

      // Send 2FA email
      await emailService.sendVerificationEmail({
        email,
        code,
        name: user.name || email.split('@')[0],
      });

      console.log('✅ Login OTP sent (2FA)');

      res.json({
        success: true,
        message: "Verifying it's really you. Check your email for the code.",
        email,
        needsVerification: true,
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
      });
    }
  },

  // ===================================
  // VERIFY OTP CODE
  // ===================================
  async verifyCode(req: Request, res: Response) {
    try {
      const { email, code }: VerifyRequest = req.body;

      // Validation
      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email and verification code are required',
        });
      }

      console.log('🔍 Verifying OTP for:', email);

      // Find verification code
      const storedCode = await prisma.verificationCode.findFirst({
        where: {
          email,
          code,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!storedCode) {
        console.log('❌ Invalid OTP for:', email);
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
        });
      }

      // Check if code is expired
      if (new Date() > storedCode.expiresAt) {
        console.log('⏰ Expired OTP for:', email);

        // Delete expired code
        await prisma.verificationCode.delete({
          where: { id: storedCode.id },
        });

        return res.status(400).json({
          success: false,
          message: 'Verification code expired. Please request a new one.',
        });
      }

      console.log('✅ Valid OTP for:', email);

      // Get user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Mark user as verified (if not already)
      let updatedUser = user;
      if (!user.isVerified) {
        updatedUser = await prisma.user.update({
          where: { email },
          data: { isVerified: true },
        });
        console.log('✅ User marked as verified:', email);
      }

      // Delete used verification code
      await prisma.verificationCode.delete({
        where: { id: storedCode.id },
      });

      console.log('🗑️  Verification code deleted');

      // Generate JWT token
      const token = generateToken(updatedUser.id, updatedUser.email);

      console.log('✅ User authenticated successfully:', email);

      res.json({
        success: true,
        message: 'Verification successful',
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          isVerified: updatedUser.isVerified,
        },
      });
    } catch (error: any) {
      console.error('❌ Verify code error:', error);
      res.status(500).json({
        success: false,
        message: 'Verification failed. Please try again.',
      });
    }
  },

  // ===================================
  // RESEND OTP
  // ===================================
  async resendCode(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      console.log('🔄 Resending OTP for:', email);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Determine purpose based on verification status
      const purpose = user.isVerified ? 'login' : 'signup';

      // Generate new code
      const code = await createVerificationCode(email, purpose);

      console.log('🔑 New OTP generated:', code);

      // Send email
      await emailService.sendVerificationEmail({
        email,
        code,
        name: user.name || email.split('@')[0],
      });

      console.log('✅ OTP resent successfully');

      res.json({
        success: true,
        message: 'New verification code sent to email',
      });
    } catch (error: any) {
      console.error('❌ Resend error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend code. Please try again.',
      });
    }
  },
};
