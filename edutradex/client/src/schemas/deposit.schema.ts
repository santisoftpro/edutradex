import { z } from 'zod';

export const mobileProviderEnum = z.enum(['MPESA', 'AIRTEL_MONEY', 'MTN_MONEY', 'ORANGE_MONEY']);
export const cryptoCurrencyEnum = z.enum(['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'LTC']);

export const mobileMoneyDepositSchema = z.object({
  amount: z.number().min(1, 'Minimum deposit is $1').max(100000, 'Maximum deposit is $100,000'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long'),
  provider: mobileProviderEnum,
});

export const cryptoDepositSchema = z.object({
  amount: z.number().min(1, 'Minimum deposit is $1').max(100000, 'Maximum deposit is $100,000'),
  currency: cryptoCurrencyEnum,
});

export const depositFiltersSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  method: z.enum(['CRYPTO', 'MOBILE_MONEY']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Dynamic deposit validation - creates schema based on payment method
export function createDepositSchema(minAmount: number, maxAmount: number, isMobileMoney: boolean) {
  const amountSchema = z.number()
    .min(minAmount, `Minimum deposit is $${minAmount}`)
    .max(maxAmount, `Maximum deposit is $${maxAmount}`);

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
  });
}

export type MobileProvider = z.infer<typeof mobileProviderEnum>;
export type CryptoCurrency = z.infer<typeof cryptoCurrencyEnum>;
export type MobileMoneyDepositInput = z.infer<typeof mobileMoneyDepositSchema>;
export type CryptoDepositInput = z.infer<typeof cryptoDepositSchema>;
export type DepositFilters = z.infer<typeof depositFiltersSchema>;
