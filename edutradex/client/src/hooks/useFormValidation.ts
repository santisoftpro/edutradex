import { useState, useCallback } from 'react';
import { z, ZodError, ZodSchema } from 'zod';

export type ValidationErrors = Record<string, string>;

export function useFormValidation<T extends ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = useCallback(
    (data: unknown): { success: boolean; data?: z.infer<T>; errors?: ValidationErrors } => {
      try {
        const validData = schema.parse(data);
        setErrors({});
        return { success: true, data: validData };
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldErrors: ValidationErrors = {};
          error.issues.forEach((issue) => {
            const path = issue.path.join('.');
            if (path && !fieldErrors[path]) {
              fieldErrors[path] = issue.message;
            }
          });
          setErrors(fieldErrors);
          return { success: false, errors: fieldErrors };
        }
        return { success: false, errors: { _form: 'Validation failed' } };
      }
    },
    [schema]
  );

  const validateField = useCallback(
    (field: string, value: unknown): string | undefined => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schemaShape = (schema as unknown as z.ZodObject<z.ZodRawShape>)._def?.shape as Record<string, z.ZodSchema> | undefined;
        if (schemaShape && schemaShape[field]) {
          schemaShape[field].parse(value);
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
          return undefined;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.issues[0]?.message || 'Invalid value';
          setErrors((prev) => ({ ...prev, [field]: message }));
          return message;
        }
      }
      return undefined;
    },
    [schema]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  return {
    errors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
}
