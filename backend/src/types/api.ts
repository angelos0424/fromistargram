export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    cursor?: string;
    total?: number;
    [key: string]: unknown;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
