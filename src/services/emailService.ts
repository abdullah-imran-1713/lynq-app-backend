import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate Gmail credentials
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error('❌ Gmail credentials missing in .env file!');
  throw new Error(
    'GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment variables'
  );
}

console.log('📧 Email Service Configuration:');
console.log('Gmail User:', process.env.GMAIL_USER);
console.log('App Password exists:', !!process.env.GMAIL_APP_PASSWORD);

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // 16-digit app password
  },
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail transporter verification failed:', error);
  } else {
    console.log('✅ Gmail transporter is ready to send emails!');
  }
});

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
    console.log('📧 === SENDING VERIFICATION EMAIL ===');
    console.log('To:', email);
    console.log('Code:', code);
    console.log('Name:', name);

    try {
      const info = await transporter.sendMail({
        from: `"Lynq" <${process.env.GMAIL_USER}>`, // Sender name and email
        to: email, // Recipient - kisi ko bhi bhej sakte hain! ✅
        subject: 'Verify your Lynq account',
        html: getVerificationEmailHTML(name, code, email),
        // Optional: Plain text version
        text: `Hi ${name}!\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nBest regards,\nLynq Team`,
      });

      console.log('✅ Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);

      return info;
    } catch (error: any) {
      console.error('❌ Failed to send email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
      });
      throw new Error('Failed to send verification email');
    }
  },
};

// Beautiful Email Template
// Beautiful Email Template
function getVerificationEmailHTML(
  name: string,
  code: string,
  email: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Verify Your Lynq Account</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          line-height: 1.6;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
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
          letter-spacing: 1px;
        }
        .header p {
          color: rgba(255, 255, 255, 0.9);
          margin-top: 10px;
          font-size: 14px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          color: #333;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          color: #666;
          line-height: 1.8;
          margin-bottom: 30px;
        }
        .code-section {
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
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 600;
        }
        .code {
          font-size: 40px;
          font-weight: 700;
          color: #667eea;
          letter-spacing: 10px;
          font-family: 'Courier New', Courier, monospace;
          padding: 10px;
        }
        .expires-notice {
          margin-top: 30px;
          padding: 20px;
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          border-radius: 8px;
        }
        .expires-notice strong {
          color: #856404;
          font-size: 15px;
        }
        .expires-notice p {
          margin: 5px 0 0 0;
          color: #856404;
          font-size: 14px;
        }
        .footer {
          background: #f9f9f9;
          padding: 30px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        .footer strong {
          color: #333;
          font-size: 16px;
        }
        .footer p {
          margin: 10px 0;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        .help-text {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 13px;
          color: #999;
          text-align: center;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            margin: 0;
            border-radius: 0;
          }
          .header h1 {
            font-size: 24px;
          }
          .code {
            font-size: 32px;
            letter-spacing: 6px;
          }
          .content {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <h1>🔗 Lynq</h1>
          <p>Where conversations flow naturally</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <p class="greeting">Hi ${name}! 👋</p>
          
          <p class="message">
            Welcome to <strong>Lynq</strong>! We're excited to have you join our community. 
            To complete your registration and start connecting, please verify your email address.
          </p>

          <!-- Code Section -->
          <div class="code-section">
            <div class="code-label">Your Verification Code</div>
            <div class="code">${code}</div>
          </div>

          <p class="message" style="text-align: center; margin-bottom: 15px;">
            Enter this code in the app to verify your account
          </p>

          <!-- Expiry Notice -->
          <div class="expires-notice">
            <strong>Important:</strong>
            <p>This verification code will expire in <strong>10 minutes</strong> for security reasons.</p>
          </div>

          <!-- Help Text -->
          <div class="help-text">
            <p>
              If you didn't create a Lynq account, please ignore this email or 
              <a href="mailto:lynq.service@gmail.com">contact our support team</a> if you have concerns.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Lynq</strong></p>
          <p style="margin: 5px 0;">Where conversations flow naturally</p>
          <p style="margin-top: 20px; color: #999;">
            © ${new Date().getFullYear()} Lynq. All rights reserved.
          </p>
          <p style="margin-top: 15px;">
            Need help? Contact us at 
            <a href="mailto:lynq.service@gmail.com">lynq.service@gmail.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
