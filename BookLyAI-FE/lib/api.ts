import { API_URL } from "@/constants";
import { ApiError, type ApiErrorBody, type ApiSuccess } from "@/types";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiErrorBody;

  if (!response.ok || !payload.success) {
    const error = !payload.success
      ? payload.error
      : { code: "REQUEST_FAILED", message: "Request failed." };
    throw new ApiError(response.status, error.code, error.message);
  }

  return payload.data;
}
