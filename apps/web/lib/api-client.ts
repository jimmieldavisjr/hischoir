/**
 * The API runs on Railway, on a different origin than this app. Every call
 * therefore needs an absolute URL and `credentials: "include"`, or the browser
 * will drop the session cookie set by the API.
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: options.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
    ...(options.body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) }),
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new ApiError(payload.error ?? "Something went wrong.", response.status);
  }
  return payload;
}

/** Sends the visitor back to the entry page when the session has expired. */
export function isUnauthorized(reason: unknown) {
  return reason instanceof ApiError && reason.status === 401;
}
