import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { prisma } from '../../config/database.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { RegisterInput, LoginInput } from '../../validators/auth.validators.js';
import { referralService } from '../referral/referral.service.js';
import { emailService } from '../email/email.service.js';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
  liveBalance: number;
  demoBalance: number;
  activeAccountType: 'LIVE' | 'DEMO';
  emailVerified: boolean;
}

interface AuthResult {
  user: UserPublic;
  token: string;
}

class AuthServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async register(data: RegisterInput): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AuthServiceError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    // Generate unique referral code for this user
    const referralCode = referralService.generateReferralCode('temp', data.name);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        liveBalance: 0,
        demoBalance: config.trading.defaultDemoBalance,
        activeAccountType: 'LIVE', // Live is the main account
        referralCode,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
        emailVerified: true,
      },
    });

    // Process referral if a referral code was provided (just links the accounts, no instant bonus)
    if (data.referralCode) {
      try {
        await referralService.linkReferral(user.id, data.referralCode);
        logger.info('Referral linked for new user', { userId: user.id, referralCode: data.referralCode });
      } catch (error) {
        logger.error('Failed to link referral', { userId: user.id, referralCode: data.referralCode, error });
      }
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    // Send welcome email
    emailService.sendWelcomeEmail(user.email, user.name)
      .catch(err => logger.error('Failed to send welcome email', { userId: user.id, error: err }));

    return {
      user: {
        ...user,
        liveBalance: Number(user.liveBalance),
        demoBalance: Number(user.demoBalance),
        activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: user.emailVerified,
      },
      token,
    };
  }

  async login(data: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AuthServiceError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AuthServiceError('Account is deactivated', 403);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new AuthServiceError('Invalid email or password', 401);
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User logged in successfully', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        liveBalance: Number(user.liveBalance),
        demoBalance: Number(user.demoBalance),
        activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: user.emailVerified,
      },
      token,
    };
  }

  async getUserById(userId: string): Promise<UserPublic | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      liveBalance: Number(user.liveBalance),
      demoBalance: Number(user.demoBalance),
      activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
      emailVerified: user.emailVerified,
    };
  }

  async resetBalance(userId: string, newBalance?: number): Promise<{ demoBalance: number }> {
    const balance = newBalance ?? config.trading.defaultDemoBalance;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { demoBalance: balance },
      select: { demoBalance: true },
    });

    logger.info('User balance reset', { userId, newBalance: balance });

    return {
      demoBalance: Number(user.demoBalance),
    };
  }

  async updateBalance(userId: string, amount: number): Promise<{ demoBalance: number }> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        demoBalance: {
          increment: amount,
        },
      },
      select: { demoBalance: true },
    });

    return {
      demoBalance: Number(user.demoBalance),
    };
  }

  async topUpDemoBalance(userId: string, amount: number): Promise<{ demoBalance: number }> {
    if (amount <= 0 || amount > 100000) {
      throw new AuthServiceError('Invalid top-up amount. Must be between 1 and 100,000', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        demoBalance: {
          increment: amount,
        },
      },
      select: { demoBalance: true },
    });

    logger.info('Demo balance topped up', { userId, amount, newBalance: Number(user.demoBalance) });

    return {
      demoBalance: Number(user.demoBalance),
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      return decoded;
    } catch {
      throw new AuthServiceError('Invalid or expired token', 401);
    }
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as StringValue,
    });
  }

  async sendVerificationCode(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AuthServiceError('Email already verified', 400);
    }

    const code = await emailService.sendVerificationCode(user.email, user.name);
    return code !== null;
  }

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AuthServiceError('Email already verified', 400);
    }

    const isValid = await emailService.verifyCode(user.email, code);
    if (!isValid) {
      throw new AuthServiceError('Invalid or expired verification code', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Send confirmation email
    emailService.sendEmailVerified(user.email, user.name)
      .catch(err => logger.error('Failed to send email verified notification', { userId, error: err }));

    logger.info('Email verified successfully', { userId });
    return true;
  }

  async switchAccountType(userId: string, accountType: 'LIVE' | 'DEMO'): Promise<UserPublic> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { activeAccountType: accountType },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
        emailVerified: true,
      },
    });

    logger.info('User switched account type', { userId, accountType });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      liveBalance: Number(user.liveBalance),
      demoBalance: Number(user.demoBalance),
      activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
      emailVerified: user.emailVerified,
    };
  }

  async getActiveBalance(userId: string): Promise<{ balance: number; accountType: 'LIVE' | 'DEMO' }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
      },
    });

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    const balance = user.activeAccountType === 'LIVE'
      ? Number(user.liveBalance)
      : Number(user.demoBalance);

    return {
      balance,
      accountType: user.activeAccountType as 'LIVE' | 'DEMO',
    };
  }

  async updateActiveBalance(userId: string, amount: number): Promise<{ balance: number; accountType: 'LIVE' | 'DEMO' }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeAccountType: true },
    });

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    const balanceField = user.activeAccountType === 'LIVE' ? 'liveBalance' : 'demoBalance';

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        [balanceField]: {
          increment: amount,
        },
      },
      select: {
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
      },
    });

    const balance = updatedUser.activeAccountType === 'LIVE'
      ? Number(updatedUser.liveBalance)
      : Number(updatedUser.demoBalance);

    return {
      balance,
      accountType: updatedUser.activeAccountType as 'LIVE' | 'DEMO',
    };
  }
}

export const authService = new AuthService();
export { AuthServiceError };
