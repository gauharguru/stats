export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code?: string, details?: unknown) => new AppError(400, msg, code, details);
export const forbidden = (msg = 'You do not have permission to perform this action.') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (what = 'Record') => new AppError(404, `${what} not found.`, 'NOT_FOUND');
export const conflict = (msg: string, code?: string, details?: unknown) => new AppError(409, msg, code, details);

export function assert(cond: unknown, msg: string, code?: string): asserts cond {
  if (!cond) throw badRequest(msg, code);
}
