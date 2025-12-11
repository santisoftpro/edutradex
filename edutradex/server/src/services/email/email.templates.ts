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

  newTicketAdmin: (
    ticketNumber: string,
    subject: string,
    message: string,
    userName: string,
    userEmail: string,
    category: string,
    priority: string
  ): string => {
    const priorityColor = priority === 'URGENT' ? '#dc2626' : priority === 'HIGH' ? '#f59e0b' : '#10b981';
    return wrapTemplate(`
      <h2>New Support Ticket</h2>
      <div class="info">
        <strong>A new support ticket has been submitted</strong>
      </div>
      <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 120px;">Ticket Number:</td>
            <td style="padding: 8px 0; font-weight: 600;">${ticketNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">From:</td>
            <td style="padding: 8px 0;">${userName} (${userEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Category:</td>
            <td style="padding: 8px 0;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Priority:</td>
            <td style="padding: 8px 0;"><span style="color: ${priorityColor}; font-weight: 600;">${priority}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Subject:</td>
            <td style="padding: 8px 0; font-weight: 600;">${subject}</td>
          </tr>
        </table>
      </div>
      <div style="padding: 20px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Message:</p>
        <div style="white-space: pre-wrap;">${message}</div>
      </div>
      <p>Please log in to the admin panel to respond to this ticket.</p>
    `);
  },

  ticketReply: (
    userName: string,
    ticketNumber: string,
    subject: string,
    reply: string,
    isClosed: boolean
  ): string => {
    const statusBadge = isClosed
      ? '<span style="background-color: #6b7280; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px;">CLOSED</span>'
      : '<span style="background-color: #10b981; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px;">REPLIED</span>';

    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="success">
        <strong>Your support ticket has been updated!</strong>
      </div>
      <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 120px;">Ticket:</td>
            <td style="padding: 8px 0; font-weight: 600;">${ticketNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Subject:</td>
            <td style="padding: 8px 0;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Status:</td>
            <td style="padding: 8px 0;">${statusBadge}</td>
          </tr>
        </table>
      </div>
      <div style="padding: 20px; background-color: #fff; border: 1px solid #10b981; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #10b981; font-weight: 600; font-size: 14px;">Response from Support Team:</p>
        <div style="white-space: pre-wrap;">${reply}</div>
      </div>
      ${isClosed ? '<p>This ticket has been marked as closed. If you need further assistance, please create a new ticket.</p>' : '<p>If you have any follow-up questions, please reply through your dashboard.</p>'}
      <p>Thank you for contacting us!<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  ticketCreatedConfirmation: (
    userName: string,
    ticketNumber: string,
    subject: string
  ): string => {
    return wrapTemplate(`
      <h2>Hello ${userName},</h2>
      <div class="success">
        <strong>Your support ticket has been received!</strong>
      </div>
      <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #666;">Ticket Number</p>
        <p style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 10px 0;">${ticketNumber}</p>
        <p style="margin: 0; color: #666;">${subject}</p>
      </div>
      <div class="info">
        <strong>What happens next?</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Our support team will review your request</li>
          <li>You will receive an email when we respond</li>
          <li>You can also check the status in your dashboard</li>
        </ul>
      </div>
      <p style="margin-top: 20px;">Average response time: <strong>24-48 hours</strong></p>
      <p>Thank you for your patience!<br><strong>The OptigoBroker Team</strong></p>
    `);
  },

  withdrawalVerificationCode: (userName: string, code: string, amount: number, method: string): string => {
    return wrapTemplate(`
      <h2>Withdrawal Verification</h2>
      <p>Hello ${userName},</p>
      <p>You have requested a withdrawal of <strong>$${amount.toFixed(2)}</strong> via <strong>${method}</strong>.</p>
      <p>Use the verification code below to confirm your withdrawal:</p>
      <div class="code-box">
        <div class="code">${code}</div>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">This code expires in 10 minutes</p>
      </div>
      <div class="warning">
        <strong>Security Notice:</strong> Never share this code with anyone. OptigoBroker staff will never ask for this code.
      </div>
      <p>If you did not request this withdrawal, please secure your account immediately and contact support.</p>
    `);
  },
};
