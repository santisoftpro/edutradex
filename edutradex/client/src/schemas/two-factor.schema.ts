import { z } from 'zod';

export const verify2FASetupSchema = z.object({
  token: z.string().length(6, 'Token must be exactly 6 digits').regex(/^\d{6}$/, 'Token must be 6 digits'),
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const verify2FALoginSchema = z
  .object({
    token: z.string().length(6).regex(/^\d{6}$/).optional(),
    backupCode: z.string().min(1).optional(),
  })
  .refine((data) => data.token || data.backupCode, {
    message: 'Either TOTP token or backup code is required',
  });

export type Verify2FASetupInput = z.infer<typeof verify2FASetupSchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;
export type Verify2FALoginInput = z.infer<typeof verify2FALoginSchema>;
