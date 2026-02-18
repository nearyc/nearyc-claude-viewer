import type { Response } from 'express';
import type { ApiResponse } from '../types';

/**
 * Send a successful API response
 */
export function sendSuccess<T>(res: Response, data: T, count?: number): void {
  const response: ApiResponse<T> & { count?: number } = {
    success: true,
    data,
  };
  if (count !== undefined) {
    response.count = count;
  }
  res.json(response);
}

/**
 * Send an error API response
 */
export function sendError(res: Response, status: number, message: string): void {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };
  res.status(status).json(response);
}

/**
 * Send a 404 not found response
 */
export function sendNotFound(res: Response, resource: string): void {
  sendError(res, 404, `${resource} not found`);
}

/**
 * Send a 400 validation error response
 */
export function sendValidationError(res: Response, message: string): void {
  sendError(res, 400, message);
}
