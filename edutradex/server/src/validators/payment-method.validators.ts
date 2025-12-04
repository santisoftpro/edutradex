import { z } from 'zod';

export const createCryptoPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50).regex(/^[a-z0-9-]+$/, 'Code must be lowercase alphanumeric with dashes'),
  cryptoCurrency: z.string().min(1, 'Cryptocurrency is required').max(20),
  network: z.string().max(50).optional(),
  walletAddress: z.string().min(10, 'Wallet address must be at least 10 characters').max(200),
  iconUrl: z.string().url().optional().or(z.literal('')),
  iconBg: z.string().max(50).optional(),
  minAmount: z.number().min(1).optional(),
  maxAmount: z.number().min(1).optional(),
  processingTime: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createMobileMoneyPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50).regex(/^[a-z0-9-]+$/, 'Code must be lowercase alphanumeric with dashes'),
  mobileProvider: z.string().min(1, 'Mobile provider is required').max(50),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters').max(20),
  accountName: z.string().max(100).optional(),
  iconUrl: z.string().url().optional().or(z.literal('')),
  iconBg: z.string().max(50).optional(),
  minAmount: z.number().min(1).optional(),
  maxAmount: z.number().min(1).optional(),
  processingTime: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  walletAddress: z.string().min(10).max(200).optional(),
  phoneNumber: z.string().min(8).max(20).optional(),
  accountName: z.string().max(100).optional(),
  iconUrl: z.string().url().optional().or(z.literal('')),
  iconBg: z.string().max(50).optional(),
  minAmount: z.number().min(1).optional(),
  maxAmount: z.number().min(1).optional(),
  processingTime: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const paymentMethodIdSchema = z.object({
  id: z.string().uuid('Invalid payment method ID'),
});

export const paymentMethodFiltersSchema = z.object({
  type: z.enum(['CRYPTO', 'MOBILE_MONEY']).optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  isPopular: z.string().transform((val) => val === 'true').optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type CreateCryptoPaymentMethodInput = z.infer<typeof createCryptoPaymentMethodSchema>;
export type CreateMobileMoneyPaymentMethodInput = z.infer<typeof createMobileMoneyPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
