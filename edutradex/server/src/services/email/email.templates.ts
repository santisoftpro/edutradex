// Professional email templates for OptigoBroker

const baseStyles = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
  .header .tagline { color: #10b981; font-size: 14px; margin-top: 5px; }
  .content { padding: 30px; }
  .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .footer { background-color: #1a1a2e; color: #888; padding: 20px 30px; text-align: center; font-size: 12px; }
  .highlight { color: #10b981; font-weight: 600; }
  .amount { font-size: 24px; color: #10b981; font-weight: 700; }
  .code-box { background-color: #f8f9fa; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
  .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; }
  .warning { background-color: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .info { background-color: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px; }
`;

const header = `
  <div class="header">
    <h1>OptigoBroker</h1>
    <div class="tagline">Trade Smarter. Trade Better.</div>
  </div>
`;

const getFooter = () => `
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} OptigoBroker. All rights reserved.</p>
    <p>This is an automated message. Please do not reply directly to this email.</p>
  </div>
`;

function wrapTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        ${header}
        <div class="content">
          ${content}
        </div>
        ${getFooter()}
      </div>
    </body>
    </html>
  `;
}

export const emailTemplates = {
  verificationCode: (userName: string, code: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <p>Use the verification code below to complete your registration:</p>
      <div class="code-box">
        <div class="code">${code}</div>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">This code expires in 15 minutes</p>
      </div>
      <div class="warning">
        <strong>Security Notice:</strong> Never share this code with anyone.
      </div>
      <p>If you did not request this code, please ignore this email.</p>
    `);
  },

  welcome: (userName: string): string => {
    return wrapTemplate(`
      <h2>Welcome to OptigoBroker, ${userName}!</h2>
      <div class="success">
        <strong>Your account is ready!</strong> You can now start exploring our trading platform.
      </div>
      <p>Here is what you can do next:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Explore the Demo Account</strong> - Practice trading with virtual funds</li>
        <li><strong>Make Your First Deposit</strong> - Fund your account to start real trading</li>
        <li><strong>Discover Copy Trading</strong> - Follow successful traders</li>
        <li><strong>Invite Friends</strong> - Earn rewards through our referral program</li>
      </ul>
      <p>Happy Trading!<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  depositApproved: (userName: string, amount: number, method: string): string => {
    return wrapTemplate(`
      <h2>Great News, ${userName}!</h2>
      <div class="success">
        <strong>Your deposit has been approved!</strong>
      </div>
      <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #666;">Amount Deposited</p>
        <p class="amount">$${amount.toFixed(2)}</p>
        <p style="margin: 0; color: #666;">via ${method}</p>
      </div>
      <p>Your balance has been updated and you can start trading immediately.</p>
      <p>Thank you for choosing OptigoBroker!</p>
    `);
  },

  depositRejected: (userName: string, amount: number, reason?: string): string => {
    const reasonHtml = reason ? `<div class="info"><strong>Reason:</strong> ${reason}</div>` : '';
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="warning">
        <strong>Your deposit request could not be processed.</strong>
      </div>
      <p>Your deposit request for <strong>$${amount.toFixed(2)}</strong> was not approved.</p>
      ${reasonHtml}
      <p>Please try again or contact our support team for assistance.</p>
    `);
  },

  withdrawalApproved: (userName: string, amount: number, method: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="success">
        <strong>Your withdrawal has been approved!</strong>
      </div>
      <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #666;">Amount Withdrawn</p>
        <p class="amount">$${amount.toFixed(2)}</p>
        <p style="margin: 0; color: #666;">via ${method}</p>
      </div>
      <div class="info">
        <strong>Processing Time:</strong> Mobile Money: 5-30 min | Crypto: 10-60 min | Bank: 1-3 days
      </div>
      <p>Thank you for trading with OptigoBroker!</p>
    `);
  },

  withdrawalRejected: (userName: string, amount: number, reason?: string): string => {
    const reasonHtml = reason ? `<div class="info"><strong>Reason:</strong> ${reason}</div>` : '';
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="warning">
        <strong>Your withdrawal request could not be processed.</strong>
      </div>
      <p>Your withdrawal request for <strong>$${amount.toFixed(2)}</strong> was not approved.</p>
      ${reasonHtml}
      <p>Your funds remain safely in your trading account. Please contact support for assistance.</p>
    `);
  },

  referralSignup: (referrerName: string, newUserName: string, bonus: number): string => {
    return wrapTemplate(`
      <h2>Congratulations, ${referrerName}!</h2>
      <div class="success">
        <strong>You have earned a referral bonus!</strong>
      </div>
      <p><span class="highlight">${newUserName}</span> just signed up using your referral code.</p>
      <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #666;">Your Bonus</p>
        <p class="amount">$${bonus.toFixed(2)}</p>
        <p style="margin: 0; color: #666;">credited to your account</p>
      </div>
      <p>Keep sharing your referral link to earn more rewards!</p>
    `);
  },

  adminMessage: (userName: string, subject: string, content: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="info">
        <strong>Message from OptigoBroker Team</strong>
      </div>
      <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${subject}</h3>
        <div style="white-space: pre-wrap;">${content}</div>
      </div>
      <p>Best regards,<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  emailVerified: (userName: string): string => {
    return wrapTemplate(`
      <h2>Congratulations, ${userName}!</h2>
      <div class="success">
        <strong>Your email has been verified!</strong>
      </div>
      <p>Your email address has been successfully verified. You now have full access to all features on OptigoBroker.</p>
      <p>Get started by:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Complete KYC Verification</strong> - Unlock higher limits</li>
        <li><strong>Make a Deposit</strong> - Start trading with real funds</li>
        <li><strong>Explore Markets</strong> - Trade forex, crypto, and more</li>
      </ul>
      <p>Happy Trading!<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  kycApproved: (userName: string): string => {
    return wrapTemplate(`
      <h2>Great News, ${userName}!</h2>
      <div class="success">
        <strong>Your KYC verification has been approved!</strong>
      </div>
      <p>Your identity has been successfully verified. You now have access to:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Higher deposit limits</strong></li>
        <li><strong>Faster withdrawals</strong></li>
        <li><strong>Full platform features</strong></li>
      </ul>
      <p>Thank you for completing the verification process.</p>
      <p>Happy Trading!<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  kycRejected: (userName: string, reason: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="warning">
        <strong>Your KYC verification requires attention</strong>
      </div>
      <p>Unfortunately, we could not verify your identity with the documents provided.</p>
      <div class="info">
        <strong>Reason:</strong> ${reason}
      </div>
      <p><strong>What to do next:</strong></p>
      <ul style="padding-left: 20px;">
        <li>Review the reason above</li>
        <li>Ensure your documents are clear and readable</li>
        <li>Make sure all information matches</li>
        <li>Submit new documents through your account</li>
      </ul>
      <p>If you have questions, please contact our support team.</p>
      <p>Best regards,<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  passwordReset: (userName: string, resetLink: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" class="btn" style="color: #fff;">Reset Password</a>
      </div>
      <div class="warning">
        <strong>This link expires in 1 hour.</strong> If you didn't request this, please ignore this email.
      </div>
      <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #10b981; font-size: 14px;">${resetLink}</p>
    `);
  },

  passwordChanged: (userName: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="success">
        <strong>Your password has been changed successfully!</strong>
      </div>
      <p>If you did not make this change, please contact our support team immediately.</p>
      <p>Best regards,<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  kycSubmitted: (userName: string): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="info">
        <strong>Your KYC documents have been received!</strong>
      </div>
      <p>We have received your identity verification documents. Our team will review them shortly.</p>
      <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #666;">Estimated Review Time</p>
        <p style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 10px 0;">24-48 hours</p>
      </div>
      <p>You will receive an email once the review is complete.</p>
      <p>Thank you for your patience!<br><strong>The OptigoBroker Team</strong></p>
    `);
  },
};
