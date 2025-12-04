import { z } from 'zod';

// Supported symbols list
const SUPPORTED_SYMBOLS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'NZD/USD', 'USD/CHF',
  'OTC_EUR/USD', 'OTC_GBP/USD',
  'VOL_10', 'VOL_25', 'VOL_50', 'VOL_100'
];

export const createSpreadConfigSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .refine(
      (val) => SUPPORTED_SYMBOLS.includes(val),
      { message: 'Symbol is not supported' }
    ),
  markupPips: z.number()
    .min(0.5, 'Markup must be at least 0.5 pips')
    .max(10, 'Markup cannot exceed 10 pips'),
  description: z.string()
    .max(255, 'Description cannot exceed 255 characters')
    .optional(),
  isActive: z.boolean().default(true),
});

export const updateSpreadConfigSchema = z.object({
  markupPips: z.number()
    .min(0.5, 'Markup must be at least 0.5 pips')
    .max(10, 'Markup cannot exceed 10 pips')
    .optional(),
  description: z.string()
    .max(255, 'Description cannot exceed 255 characters')
    .optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type CreateSpreadConfigInput = z.infer<typeof createSpreadConfigSchema>;
export type UpdateSpreadConfigInput = z.infer<typeof updateSpreadConfigSchema>;
