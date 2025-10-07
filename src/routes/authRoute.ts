import express from 'express';
import { authController } from '../controllers/authcontroller';

const router = express.Router();

router.get('/google/url', authController.getGoogleAuthUrl);
router.post('/google/callback', authController.googleCallback);
router.post('/send-verification', authController.sendVerificationCode);
router.post('/verify-code', authController.verifyCode);

export default router;
