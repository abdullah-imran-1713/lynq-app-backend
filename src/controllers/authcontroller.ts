import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { emailService } from '../services/emailService';
import { generateVerificationCode } from '../utils/generateCode';

// Temporary in-memory storage (replace with database)
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();
const users = new Map<string, any>();

export const authController = {
  // Send verification code
  async sendVerificationCode(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Generate 6-digit code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store code (in production, use database)
      verificationCodes.set(email, { code, expiresAt });

      // Send email
      await emailService.sendVerificationEmail({
        email,
        code,
        name: email.split('@')[0], // Temporary name
      });

      res.json({
        success: true,
        message: 'Verification code sent to email',
      });
    } catch (error) {
      console.error('Send verification error:', error);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  },

  // Verify code
  async verifyCode(req: Request, res: Response) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ message: 'Email and code are required' });
      }

      const storedData = verificationCodes.get(email);

      if (!storedData) {
        return res.status(400).json({ message: 'No verification code found' });
      }

      if (new Date() > storedData.expiresAt) {
        verificationCodes.delete(email);
        return res.status(400).json({ message: 'Verification code expired' });
      }

      if (storedData.code !== code) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      // Code is valid - create/update user
      const user = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0],
        isVerified: true,
        createdAt: new Date(),
      };

      users.set(email, user);
      verificationCodes.delete(email);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Email verified successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error('Verify code error:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  },

  // Google OAuth URL
  async getGoogleAuthUrl(req: Request, res: Response) {
    try {
      // TODO: Implement Google OAuth URL generation
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile`;

      res.json({ url: authUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate auth URL' });
    }
  },

  // Google OAuth Callback
  async googleCallback(req: Request, res: Response) {
    try {
      const { code } = req.body;

      // TODO: Exchange code for Google user info
      // For now, mock response
      const email = 'user@gmail.com';

      // Check if user needs verification
      const existingUser = users.get(email);

      if (existingUser?.isVerified) {
        // User already verified
        const token = jwt.sign(
          { id: existingUser.id, email: existingUser.email },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        return res.json({
          needsVerification: false,
          token,
          user: existingUser,
        });
      }

      // New user - needs verification
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      verificationCodes.set(email, { code: verificationCode, expiresAt });

      await emailService.sendVerificationEmail({
        email,
        code: verificationCode,
        name: email.split('@')[0],
      });

      res.json({
        needsVerification: true,
        email,
        message: 'Verification code sent to email',
      });
    } catch (error) {
      console.error('Google callback error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  },
};
