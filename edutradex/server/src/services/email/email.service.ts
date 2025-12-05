import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { emailTemplates } from './email.templates.js';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  initialize(config: EmailConfig) {
    this.config = config;

    if (!config.user || !config.pass) {
      logger.warn('Email service not configured - SMTP credentials missing');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    logger.info('Email service initialized', { host: config.host, port: config.port });
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter || !this.config) {
      logger.warn('Email not sent - service not configured', { to, subject });
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
      });

      logger.info('Email sent successfully', { to, subject });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error });
      return false;
    }
  }

  // Generate 6-digit verification code
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code for signup
  async sendVerificationCode(email: string, userName: string): Promise<string | null> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      // Store verification code in database
      await prisma.emailVerification.create({
        data: {
          email,
          code,
          type: 'SIGNUP',
          expiresAt,
        },
      });

      const html = emailTemplates.verificationCode(userName, code);
      const sent = await this.sendEmail(email, 'Your Verification Code - OptigoBroker', html);

      return sent ? code : null;
    } catch (error) {
      logger.error('Failed to create verification code', { email, error });
      return null;
    }
  }

  // Verify code
  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const verification = await prisma.emailVerification.findFirst({
        where: {
          email,
          code,
          type: 'SIGNUP',
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!verification) {
        return false;
      }

      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verified: true },
      });

      return true;
    } catch (error) {
      logger.error('Failed to verify code', { email, error });
      return false;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const html = emailTemplates.welcome(userName);
    return this.sendEmail(email, 'Welcome to OptigoBroker!', html);
  }

  // Send deposit approved email
  async sendDepositApproved(email: string, userName: string, amount: number, method: string): Promise<boolean> {
    const html = emailTemplates.depositApproved(userName, amount, method);
    return this.sendEmail(email, 'Deposit Approved - OptigoBroker', html);
  }

  // Send deposit rejected email
  async sendDepositRejected(email: string, userName: string, amount: number, reason?: string): Promise<boolean> {
    const html = emailTemplates.depositRejected(userName, amount, reason);
    return this.sendEmail(email, 'Deposit Request Update - OptigoBroker', html);
  }

  // Send withdrawal approved email
  async sendWithdrawalApproved(email: string, userName: string, amount: number, method: string): Promise<boolean> {
    const html = emailTemplates.withdrawalApproved(userName, amount, method);
    return this.sendEmail(email, 'Withdrawal Approved - OptigoBroker', html);
  }

  // Send withdrawal rejected email
  async sendWithdrawalRejected(email: string, userName: string, amount: number, reason?: string): Promise<boolean> {
    const html = emailTemplates.withdrawalRejected(userName, amount, reason);
    return this.sendEmail(email, 'Withdrawal Request Update - OptigoBroker', html);
  }

  // Send referral signup notification
  async sendReferralSignup(referrerEmail: string, referrerName: string, newUserName: string, bonus: number): Promise<boolean> {
    const html = emailTemplates.referralSignup(referrerName, newUserName, bonus);
    return this.sendEmail(referrerEmail, 'New Referral Signup! - OptigoBroker', html);
  }

  // Send admin message to specific user
  async sendAdminMessage(
    email: string,
    userName: string,
    subject: string,
    content: string,
    adminId: string
  ): Promise<boolean> {
    // Store in database
    await prisma.adminMessage.create({
      data: {
        senderId: adminId,
        recipientId: null, // Will be looked up
        subject,
        content,
        type: 'GENERAL',
        sentViaEmail: true,
      },
    });

    const html = emailTemplates.adminMessage(userName, subject, content);
    return this.sendEmail(email, subject, html);
  }

  // Send admin message to all users
  async sendBulkAdminMessage(
    subject: string,
    content: string,
    adminId: string
  ): Promise<{ sent: number; failed: number }> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      // Store in database
      await prisma.adminMessage.create({
        data: {
          senderId: adminId,
          recipientId: user.id,
          subject,
          content,
          type: 'ANNOUNCEMENT',
          sentViaEmail: true,
        },
      });

      const html = emailTemplates.adminMessage(user.name, subject, content);
      const success = await this.sendEmail(user.email, subject, html);

      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info('Bulk email completed', { sent, failed, total: users.length });
    return { sent, failed };
  }

  // Send email verified confirmation
  async sendEmailVerified(email: string, userName: string): Promise<boolean> {
    const html = emailTemplates.emailVerified(userName);
    return this.sendEmail(email, 'Email Verified - OptigoBroker', html);
  }

  // Send KYC submitted notification
  async sendKYCSubmitted(email: string, userName: string): Promise<boolean> {
    const html = emailTemplates.kycSubmitted(userName);
    return this.sendEmail(email, 'KYC Documents Received - OptigoBroker', html);
  }

  // Send KYC approved notification
  async sendKYCApproved(email: string, userName: string): Promise<boolean> {
    const html = emailTemplates.kycApproved(userName);
    return this.sendEmail(email, 'KYC Verified - OptigoBroker', html);
  }

  // Send KYC rejected notification
  async sendKYCRejected(email: string, userName: string, reason: string): Promise<boolean> {
    const html = emailTemplates.kycRejected(userName, reason);
    return this.sendEmail(email, 'KYC Verification Update - OptigoBroker', html);
  }

  // Generate secure reset token
  private generateResetToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, userName: string, clientUrl: string): Promise<string | null> {
    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    try {
      // Store reset token in database
      await prisma.emailVerification.create({
        data: {
          email,
          code: token,
          type: 'PASSWORD_RESET',
          expiresAt,
        },
      });

      const resetLink = `${clientUrl}/reset-password?token=${token}`;
      const html = emailTemplates.passwordReset(userName, resetLink);
      const sent = await this.sendEmail(email, 'Reset Your Password - OptigoBroker', html);

      return sent ? token : null;
    } catch (error) {
      logger.error('Failed to create password reset token', { email, error });
      return null;
    }
  }

  // Verify password reset token
  async verifyResetToken(token: string): Promise<string | null> {
    try {
      const verification = await prisma.emailVerification.findFirst({
        where: {
          code: token,
          type: 'PASSWORD_RESET',
          verified: false,
          expiresAt: { gt: new Date() },
        },
      });

      return verification?.email || null;
    } catch (error) {
      logger.error('Failed to verify reset token', { error });
      return null;
    }
  }

  // Mark reset token as used
  async markResetTokenUsed(token: string): Promise<boolean> {
    try {
      await prisma.emailVerification.updateMany({
        where: { code: token, type: 'PASSWORD_RESET' },
        data: { verified: true },
      });
      return true;
    } catch (error) {
      logger.error('Failed to mark reset token as used', { error });
      return false;
    }
  }

  // Send password changed notification
  async sendPasswordChanged(email: string, userName: string): Promise<boolean> {
    const html = emailTemplates.passwordChanged(userName);
    return this.sendEmail(email, 'Password Changed - OptigoBroker', html);
  }
}

export const emailService = new EmailService();
