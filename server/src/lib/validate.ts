import { z } from 'zod';
import { badRequest } from './errors';
import { isValidAmount } from './money';
import { DATE_RE } from './dates';

export { z };

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ` : '') + i.message).join('; ');
    throw badRequest(msg, 'VALIDATION_ERROR', r.error.issues);
  }
  return r.data;
}

export const id = z.coerce.number().int().positive();
export const optId = z.coerce.number().int().positive().nullish();
export const amount = z.coerce
  .number()
  .refine(isValidAmount, 'Amount must be greater than zero with at most 2 decimals');
export const nonNegAmount = z.coerce
  .number()
  .refine((v) => v === 0 || isValidAmount(v), 'Amount must be zero or positive with at most 2 decimals');
export const date = z.string().regex(DATE_RE, 'Date must be YYYY-MM-DD');
export const optDate = z
  .string()
  .regex(DATE_RE, 'Date must be YYYY-MM-DD')
  .nullish()
  .or(z.literal('').transform(() => null));
export const str = (max: number) => z.string().trim().min(1, 'Required').max(max);
export const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const allocationList = z
  .array(z.object({ chargeId: id, amount: amount }))
  .nullish();

/** Parses ?a=1&b=x query values; empty strings become undefined. */
export function q(req: { query: Record<string, unknown> }, key: string): string | undefined {
  const v = req.query[key];
  if (v === undefined || v === null || v === '') return undefined;
  return String(v);
}
export function qNum(req: { query: Record<string, unknown> }, key: string): number | undefined {
  const v = q(req, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest(`Invalid ${key}`);
  return n;
}
export function qDate(req: { query: Record<string, unknown> }, key: string): string | undefined {
  const v = q(req, key);
  if (v !== undefined && !DATE_RE.test(v)) throw badRequest(`Invalid ${key}`);
  return v;
}
