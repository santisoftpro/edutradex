import { z } from 'zod';

// Schema for verifying 2FA setup (completing setup with TOTP code)
export const verify2FASetupSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification code is required')
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

// Schema for disabling 2FA (requires password)
export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Schema for regenerating backup codes (requires password)
export const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Schema for verifying 2FA during login
export const verify2FALoginSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  token: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits')
    .optional(),
  backupCode: z
    .string()
    .min(1)
    .max(20)
    .optional(),
}).refine(
  (data) => data.token || data.backupCode,
  { message: 'Either verification code or backup code is required' }
);

// Export TypeScript types
export type Verify2FASetupInput = z.infer<typeof verify2FASetupSchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;
export type Verify2FALoginInput = z.infer<typeof verify2FALoginSchema>;
