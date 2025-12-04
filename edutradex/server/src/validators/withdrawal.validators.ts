import { z } from 'zod';

export const mobileMoneyWithdrawalSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(1, 'Minimum withdrawal is $1').max(100000, 'Maximum withdrawal is $100,000'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters').max(20, 'Phone number is too long').regex(/^[+]?[0-9]+$/, 'Invalid phone number format'),
  mobileProvider: z.enum(['MPESA', 'AIRTEL', 'MTN', 'VODAFONE', 'ORANGE', 'TIGO', 'OTHER']),
});

export const cryptoWithdrawalSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(1, 'Minimum withdrawal is $1').max(100000, 'Maximum withdrawal is $100,000'),
  cryptoCurrency: z.enum(['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'OTHER']),
  walletAddress: z.string().min(20, 'Wallet address is too short').max(100, 'Wallet address is too long'),
});

export const withdrawalFiltersSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  method: z.enum(['MOBILE_MONEY', 'CRYPTO']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const processWithdrawalSchema = z.object({
  adminNote: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
});

export const userWithdrawalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type MobileMoneyWithdrawalInput = z.infer<typeof mobileMoneyWithdrawalSchema>;
export type CryptoWithdrawalInput = z.infer<typeof cryptoWithdrawalSchema>;
export type WithdrawalFiltersInput = z.infer<typeof withdrawalFiltersSchema>;
export type ProcessWithdrawalInput = z.infer<typeof processWithdrawalSchema>;
