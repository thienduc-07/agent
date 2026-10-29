import { ApiErrorResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClientError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = "API_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined | null>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const config: RequestInit = {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorCode = "HTTP_ERROR";
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const errorData: ApiErrorResponse = await response.json();
        if (errorData?.error) {
          errorCode = errorData.error.code || errorCode;
          errorMessage = errorData.error.message || errorMessage;
        }
      } catch {
        // Fallback if not valid JSON
      }

      throw new ApiClientError(errorMessage, errorCode, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error?.message || "Không thể kết nối đến máy chủ backend (Network Error)",
      "NETWORK_ERROR",
      0
    );
  }
}
