import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
  target?: ValidationTarget;
}

interface ValidationError {
  field: string;
  message: string;
}

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  options: ValidationOptions = {}
) {
  const { target = 'body' } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const dataToValidate = req[target];
    try {
      const validated = await schema.parseAsync(dataToValidate);

      // Replace the request data with validated and transformed data
      // Note: req.query is read-only, so we can't overwrite it
      if (target !== 'query') {
        req[target] = validated;
      } else {
        // For query params, store in a custom property since req.query is read-only
        (req as any).validatedQuery = validated;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: ValidationError[] = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        console.log('[VALIDATION ERROR]', {
          path: req.path,
          target,
          data: dataToValidate,
          errors: formattedErrors
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      console.log('[VALIDATION ERROR - UNKNOWN]', {
        path: req.path,
        target,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    }
  };
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, { target: 'body' });
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, { target: 'query' });
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, { target: 'params' });
}
