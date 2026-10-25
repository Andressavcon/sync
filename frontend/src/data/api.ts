/** HTTP client for the Sync. API. Screens never call it directly: they use repositories. */

import { getAccessToken } from "@/data/auth";

// Empty in development (Vite proxies /api to the backend); full URL in production
const BASE_URL: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Query = Record<string, string | string[] | undefined>;

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    // Arrays become repeated keys: ?tagIds=a&tagIds=b
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  const search = params.toString();
  return `${BASE_URL}${path}${search ? `?${search}` : ""}`;
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Query } = {}
): Promise<T> {
  const hasBody = options.body !== undefined;
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`; // logged in
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : `Erro ${response.status}`;
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body: unknown, query?: Query) =>
    request<T>("POST", path, { body, query }),
  patch: <T>(path: string, body: unknown, query?: Query) =>
    request<T>("PATCH", path, { body, query }),
  put: <T>(path: string, body: unknown, query?: Query) => request<T>("PUT", path, { body, query }),
  delete: (path: string, query?: Query) => request<void>("DELETE", path, { query }),
};

/** True when the request never reached the server (no internet, server down). */
export function isOfflineError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/** Text to show the user for any error thrown by the API or the code. */
export function getErrorMessage(error: unknown): string {
  // The API answers in English; the screen speaks Portuguese
  if (error instanceof ApiError) {
    if (error.status === 0) return error.message;
    if (error.status === 401) return "Sua sessão expirou. Entre de novo.";
    if (error.status === 404) return "Não encontrado: talvez já tenha sido excluído.";
    if (error.status === 409) return "Já existe um registro com esse nome.";
    if (error.status === 422) return "Dados inválidos. Confira os campos.";
    if (error.status >= 500) return "Erro no servidor. Tente de novo.";
  }
  return "Algo deu errado. Tente de novo.";
}
