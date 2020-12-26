export enum WebSocketCodes {
  INTERNAL_ERROR = 1011,
}

export enum AppErrorCodes {
  BAD_REQUEST_CODE = 400,
}

export const USERS_VALIDATION = 'Wrong users format';

export class BadRequestError extends Error {
  public readonly code = AppErrorCodes.BAD_REQUEST_CODE;

  constructor(message?: string, public readonly description?: any) {
    super(message);
  }
}
