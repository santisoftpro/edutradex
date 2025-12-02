import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { prisma } from '../../config/database.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { RegisterInput, LoginInput } from '../../validators/auth.validators.js';

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
  demoBalance: number;
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

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        demoBalance: config.trading.defaultDemoBalance,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        demoBalance: true,
      },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user: {
        ...user,
        demoBalance: Number(user.demoBalance),
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
        demoBalance: Number(user.demoBalance),
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
        demoBalance: true,
        isActive: true,
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
      demoBalance: Number(user.demoBalance),
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
}

export const authService = new AuthService();
export { AuthServiceError };
