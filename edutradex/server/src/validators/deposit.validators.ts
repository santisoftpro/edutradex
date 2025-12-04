import { z } from 'zod';

export const mobileMoneyDepositSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(1, 'Minimum deposit is $1')
    .max(100000, 'Maximum deposit is $100,000'),

  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[+]?[0-9]+$/, 'Invalid phone number format'),

  mobileProvider: z
    .enum(['MPESA', 'AIRTEL', 'MTN', 'VODAFONE', 'ORANGE', 'TIGO', 'OTHER'], {
      message: 'Invalid mobile money provider',
    }),
});

export const cryptoDepositSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(1, 'Minimum deposit is $1')
    .max(100000, 'Maximum deposit is $100,000'),

  cryptoCurrency: z
    .string()
    .min(1, 'Cryptocurrency is required'),
});

export const depositFiltersSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  method: z.enum(['MOBILE_MONEY', 'CRYPTO']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
});

export const processDepositSchema = z.object({
  adminNote: z
    .string()
    .max(500, 'Note must be less than 500 characters')
    .optional(),
});

export type MobileMoneyDepositInput = z.infer<typeof mobileMoneyDepositSchema>;
export type CryptoDepositInput = z.infer<typeof cryptoDepositSchema>;
export type DepositFiltersInput = z.infer<typeof depositFiltersSchema>;
export type ProcessDepositInput = z.infer<typeof processDepositSchema>;
