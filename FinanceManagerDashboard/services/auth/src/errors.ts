export class ServiceError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details?: unknown) {
  return new ServiceError(400, code, message, details);
}

export function unauthorized(code: string, message: string, details?: unknown) {
  return new ServiceError(401, code, message, details);
}

export function forbidden(code: string, message: string, details?: unknown) {
  return new ServiceError(403, code, message, details);
}

export function conflict(code: string, message: string, details?: unknown) {
  return new ServiceError(409, code, message, details);
}

export function gone(code: string, message: string, details?: unknown) {
  return new ServiceError(410, code, message, details);
}

export function tooManyRequests(code: string, message: string, details?: unknown) {
  return new ServiceError(429, code, message, details);
}

export function internalError(code: string, message: string, details?: unknown) {
  return new ServiceError(500, code, message, details);
}
