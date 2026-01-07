import { z } from 'zod';
import { mobileProviderEnum, cryptoCurrencyEnum } from './deposit.schema';

export const mobileMoneyWithdrawalSchema = z.object({
  amount: z.number().min(1).max(100000),
  phone: z.string().min(10).max(15),
  provider: mobileProviderEnum,
});

export const cryptoWithdrawalSchema = z.object({
  amount: z.number().min(1).max(100000),
  currency: cryptoCurrencyEnum,
  walletAddress: z.string().min(10).max(200),
  network: z.string().optional(),
});

export const withdrawalFiltersSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  method: z.enum(['CRYPTO', 'MOBILE_MONEY']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sendVerificationCodeSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CRYPTO', 'MOBILE_MONEY']),
});

export const verifyWithdrawalCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

// Dynamic withdrawal validation - creates schema based on payment method and balance
export function createWithdrawalSchema(
  minAmount: number,
  maxAmount: number,
  balance: number,
  isMobileMoney: boolean
) {
  const effectiveMax = Math.min(maxAmount, balance);

  const amountSchema = z.number()
    .min(minAmount, `Minimum withdrawal is $${minAmount}`)
    .max(effectiveMax, balance < minAmount
      ? 'Insufficient balance'
      : `Maximum withdrawal is $${effectiveMax.toFixed(2)}`);

  if (isMobileMoney) {
    return z.object({
      amount: amountSchema,
      phone: z.string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number is too long')
        .regex(/^[\d+\s-]+$/, 'Invalid phone number format'),
    });
  }

  return z.object({
    amount: amountSchema,
    walletAddress: z.string()
      .min(20, 'Wallet address is too short')
      .max(200, 'Wallet address is too long'),
  });
}

export type MobileMoneyWithdrawalInput = z.infer<typeof mobileMoneyWithdrawalSchema>;
export type CryptoWithdrawalInput = z.infer<typeof cryptoWithdrawalSchema>;
export type WithdrawalFilters = z.infer<typeof withdrawalFiltersSchema>;
export type SendVerificationCodeInput = z.infer<typeof sendVerificationCodeSchema>;
export type VerifyWithdrawalCodeInput = z.infer<typeof verifyWithdrawalCodeSchema>;
