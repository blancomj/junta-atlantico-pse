export interface APIErrorResponse {
  status: number;
  code: string;
  message: string;
  data?: unknown;
}
