import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Validate API key exists
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendVerificationEmailParams {
  email: string;
  code: string;
  name: string;
}

export const emailService = {
  async sendVerificationEmail({
    email,
    code,
    name,
  }: SendVerificationEmailParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: [email],
        subject: 'Verify your Lynq account',
        html: getVerificationEmailHTML(name, code, email),
      });

      if (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send verification email');
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },
};

// Beautiful Email Template
function getVerificationEmailHTML(
  name: string,
  code: string,
  email: string
): string {
  const verificationUrl = `${
    process.env.FRONTEND_URL
  }/verify?email=${encodeURIComponent(email)}&code=${code}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .code-container {
          background: #f7f7f7;
          border: 2px dashed #667eea;
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
        }
        .code-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .code {
          font-size: 36px;
          font-weight: 700;
          color: #667eea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .verify-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 40px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .verify-button:hover {
          transform: translateY(-2px);
        }
        .divider {
          text-align: center;
          margin: 30px 0;
          color: #999;
          font-size: 14px;
        }
        .footer {
          background: #f9f9f9;
          padding: 30px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .expires {
          margin-top: 20px;
          padding: 15px;
          background: #fff3cd;
          border-radius: 8px;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔗 Lynq</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Hi ${name}! 👋</p>
          
          <p class="message">
            Welcome to <strong>Lynq</strong>! We're excited to have you join our community. 
            To complete your registration, please verify your email address.
          </p>

          <div class="code-container">
            <div class="code-label">Your Verification Code</div>
            <div class="code">${code}</div>
          </div>

          <p class="message" style="text-align: center;">
            Enter this code in the app to verify your account
          </p>

          <div class="divider">OR</div>

          <div class="button-container">
            <a href="${verificationUrl}" class="verify-button">
              Verify Email Address
            </a>
          </div>

          <div class="expires">
            ⏱️ This code will expire in <strong>10 minutes</strong> for security reasons.
          </div>

          <p class="message" style="margin-top: 30px; font-size: 14px;">
            If you didn't create a Lynq account, please ignore this email or 
            <a href="mailto:support@lynq.com" style="color: #667eea;">contact support</a> if you have concerns.
          </p>
        </div>

        <div class="footer">
          <p>
            <strong>Lynq</strong> - Where conversations flow naturally<br>
            © ${new Date().getFullYear()} Lynq. All rights reserved.
          </p>
          <p style="margin-top: 15px;">
            <a href="${process.env.FRONTEND_URL}/terms">Terms of Service</a> • 
            <a href="${process.env.FRONTEND_URL}/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
