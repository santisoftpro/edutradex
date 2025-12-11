import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { emailTemplates } from './email.templates.js';
import { randomUUID } from 'crypto';

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

  async sendVerificationCode(email: string, userName: string): Promise<string | null> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const now = new Date();

    try {
      await query(
        `INSERT INTO "EmailVerification" (id, email, code, type, "expiresAt", verified, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), email, code, 'SIGNUP', expiresAt, false, now]
      );

      const html = emailTemplates.verificationCode(userName, code);
      const sent = await this.sendEmail(email, 'Your Verification Code - OptigoBroker', html);

      return sent ? code : null;
    } catch (error) {
      logger.error('Failed to create verification code', { email, error });
      return null;
    }
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const verification = await queryOne<{ id: string }>(
        `SELECT id FROM "EmailVerification"
         WHERE email = $1 AND code = $2 AND type = 'SIGNUP' AND verified = false AND "expiresAt" > $3
         ORDER BY "createdAt" DESC LIMIT 1`,
        [email, code, new Date()]
      );

      if (!verification) {
        return false;
      }

      await query(
        `UPDATE "EmailVerification" SET verified = true WHERE id = $1`,
        [verification.id]
      );

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

  async sendAdminMessage(
    email: string,
    userName: string,
    subject: string,
    content: string,
    adminId: string
  ): Promise<boolean> {
    const now = new Date();
    await query(
      `INSERT INTO "AdminMessage" (id, "senderId", "recipientId", subject, content, type, "sentViaEmail", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), adminId, null, subject, content, 'GENERAL', true, now]
    );

    const html = emailTemplates.adminMessage(userName, subject, content);
    return this.sendEmail(email, subject, html);
  }

  async sendBulkAdminMessage(
    subject: string,
    content: string,
    adminId: string
  ): Promise<{ sent: number; failed: number }> {
    const users = await queryMany<{ id: string; email: string; name: string }>(
      `SELECT id, email, name FROM "User" WHERE "isActive" = true`
    );

    let sent = 0;
    let failed = 0;
    const now = new Date();

    for (const user of users) {
      await query(
        `INSERT INTO "AdminMessage" (id, "senderId", "recipientId", subject, content, type, "sentViaEmail", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), adminId, user.id, subject, content, 'ANNOUNCEMENT', true, now]
      );

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

  async sendPasswordResetEmail(email: string, userName: string, clientUrl: string): Promise<string | null> {
    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    try {
      await query(
        `INSERT INTO "EmailVerification" (id, email, code, type, "expiresAt", verified, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), email, token, 'PASSWORD_RESET', expiresAt, false, now]
      );

      const resetLink = `${clientUrl}/reset-password?token=${token}`;
      const html = emailTemplates.passwordReset(userName, resetLink);
      const sent = await this.sendEmail(email, 'Reset Your Password - OptigoBroker', html);

      return sent ? token : null;
    } catch (error) {
      logger.error('Failed to create password reset token', { email, error });
      return null;
    }
  }

  async verifyResetToken(token: string): Promise<string | null> {
    try {
      const verification = await queryOne<{ email: string }>(
        `SELECT email FROM "EmailVerification"
         WHERE code = $1 AND type = 'PASSWORD_RESET' AND verified = false AND "expiresAt" > $2`,
        [token, new Date()]
      );

      return verification?.email || null;
    } catch (error) {
      logger.error('Failed to verify reset token', { error });
      return null;
    }
  }

  async markResetTokenUsed(token: string): Promise<boolean> {
    try {
      await query(
        `UPDATE "EmailVerification" SET verified = true WHERE code = $1 AND type = 'PASSWORD_RESET'`,
        [token]
      );
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

  // Send withdrawal verification code
  async sendWithdrawalVerificationCode(
    email: string,
    userName: string,
    amount: number,
    method: string
  ): Promise<string | null> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const now = new Date();

    try {
      await query(
        `INSERT INTO "EmailVerification" (id, email, code, type, "expiresAt", verified, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), email, code, 'WITHDRAWAL', expiresAt, false, now]
      );

      const html = emailTemplates.withdrawalVerificationCode(userName, code, amount, method);
      const sent = await this.sendEmail(email, 'Withdrawal Verification Code - OptigoBroker', html);

      return sent ? code : null;
    } catch (error) {
      logger.error('Failed to create withdrawal verification code', { email, error });
      return null;
    }
  }

  // Verify withdrawal code
  async verifyWithdrawalCode(email: string, code: string): Promise<boolean> {
    try {
      const verification = await queryOne<{ id: string }>(
        `SELECT id FROM "EmailVerification"
         WHERE email = $1 AND code = $2 AND type = 'WITHDRAWAL' AND verified = false AND "expiresAt" > $3
         ORDER BY "createdAt" DESC LIMIT 1`,
        [email, code, new Date()]
      );

      if (!verification) {
        return false;
      }

      await query(
        `UPDATE "EmailVerification" SET verified = true WHERE id = $1`,
        [verification.id]
      );

      return true;
    } catch (error) {
      logger.error('Failed to verify withdrawal code', { email, error });
      return false;
    }
  }

  // Send new ticket notification to admin
  async sendNewTicketNotification(
    adminEmail: string,
    ticketNumber: string,
    subject: string,
    message: string,
    userName: string,
    userEmail: string,
    category: string,
    priority: string
  ): Promise<boolean> {
    const html = emailTemplates.newTicketAdmin(
      ticketNumber,
      subject,
      message,
      userName,
      userEmail,
      category,
      priority
    );
    return this.sendEmail(
      adminEmail,
      `[${priority}] New Support Ticket: ${ticketNumber} - OptigoBroker`,
      html
    );
  }

  // Send ticket reply notification to user
  async sendTicketReplyNotification(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    subject: string,
    reply: string,
    isClosed: boolean
  ): Promise<boolean> {
    const html = emailTemplates.ticketReply(userName, ticketNumber, subject, reply, isClosed);
    return this.sendEmail(
      userEmail,
      `Support Ticket Update: ${ticketNumber} - OptigoBroker`,
      html
    );
  }

  // Send ticket created confirmation to user
  async sendTicketCreatedConfirmation(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    subject: string
  ): Promise<boolean> {
    const html = emailTemplates.ticketCreatedConfirmation(userName, ticketNumber, subject);
    return this.sendEmail(
      userEmail,
      `Ticket Received: ${ticketNumber} - OptigoBroker`,
      html
    );
  }
}

export const emailService = new EmailService();
