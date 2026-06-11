// Use relative path for Vite proxy - requests to /api/v1/* will be proxied to backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;
const REQUEST_TIMEOUT_MS = 10000;

// Simple cache for GET requests
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

async function fetchWithTimeout(url, options = {}) {
  const { timeout = REQUEST_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export class ApiError extends Error {
  constructor(message, code, status = 0, cause = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function logApi(level, message, meta = {}) {
  const entry = { ts: new Date().toISOString(), ...meta };
  if (level === "error") console.error(`[API] ${message}`, entry);
  else console.info(`[API] ${message}`, entry);
}

function parseDetail(data) {
  if (!data?.detail) return null;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
  }
  return String(data.detail);
}

function mapFetchError(error, path, attempt = 0) {
  const msg = (error?.message || "").toLowerCase();
  if (error instanceof ApiError) return error;

  // Network-level errors
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || error?.name === "TypeError" || msg.includes("net::err")) {
    if (attempt < MAX_RETRIES) {
      return null; // Signal to retry
    }
    return new ApiError(
      "Backend server offline. Please ensure the server is running on port 8000.",
      "BACKEND_OFFLINE",
      0,
      error
    );
  }
  
  // Connection refused
  if (msg.includes("connection refused") || msg.includes("econnrefused")) {
    return new ApiError(
      "Backend server not accepting connections. Check if server is running on port 8000.",
      "CONNECTION_REFUSED",
      0,
      error
    );
  }
  
  return new ApiError(error?.message || `Request to ${path} failed`, "UNKNOWN", 0, error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem("soundwave_refresh_token");
  if (!refreshToken) return false;

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      timeout: 5000 // 5s timeout for refresh
    });
    if (!res.ok) {
      clearAuthTokens();
      return false;
    }
    const data = await res.json();
    if (data?.access_token) {
      localStorage.setItem("soundwave_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("soundwave_refresh_token", data.refresh_token);
      logApi("info", "Token refreshed silently");
      return true;
    }
  } catch (e) {
    logApi("error", "Silent token refresh failed", { error: e.message });
  }
  return false;
}

async function request(path, options = {}, attempt = 0, allowRefresh = true) {
  // Use a function to always get the freshest token from localStorage
  const getToken = () => localStorage.getItem("soundwave_token");
  const token = getToken();
  const method = options.method || "GET";

  // Invalidate cache on mutating requests
  if (method !== "GET") {
    apiCache.clear();
  }

  
  // Detailed logging for debugging
  if (path.includes("/auth/me") || path.includes("/workspace/")) {
    logApi("info", `Request ${method} ${path}`, { 
      hasToken: !!token, 
      tokenPreview: token ? `${token.substring(0, 10)}...` : "none",
      attempt 
    });
  }

  // Cache check for GET
  if (method === "GET" && apiCache.has(path)) {
    const { data, ts } = apiCache.get(path);
    if (Date.now() - ts < CACHE_TTL) {
      return data;
    }
    apiCache.delete(path);
  }

  let res;
  try {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    // Explicitly add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body,
    });
  } catch (error) {
    const apiError = mapFetchError(error, path, attempt);
    logApi("error", `${method} ${path} network failure`, { code: apiError?.code, attempt });

    if (error.name === "AbortError") {
      throw new ApiError("Request timed out. The server might be overloaded.", "TIMEOUT", 0, error);
    }

    // Retry on network errors if attempts remaining
    if (apiError === null && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return request(path, options, attempt + 1, allowRefresh);
    }
    
    // Only throw if we've exhausted retries or got a non-retryable error
    if (apiError) throw apiError;
    throw new ApiError("Request failed after retries", "MAX_RETRIES_EXCEEDED", 0, error);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  // Cache successful GET results
  if (method === "GET" && res.ok && data) {
    apiCache.set(path, { data, ts: Date.now() });
  }

  if (res.status === 401 && allowRefresh && path !== "/auth/refresh" && path !== "/auth/login") {
    const refreshed = await tryRefreshToken();
    if (refreshed) return request(path, options, attempt, false);
  }

  if (!res.ok) {
    const detail = parseDetail(data);
    let code = "HTTP_ERROR";
    let message = detail || `${method} ${path} failed (${res.status})`;

    if (res.status === 401) {
      code = detail?.toLowerCase().includes("expired") ? "SESSION_EXPIRED" : "UNAUTHORIZED";
      message = detail || "Session expired. Please sign in again.";
    } else if (res.status === 403) {
      code = "FORBIDDEN";
      message = detail || "You do not have permission for this action.";
    } else if (res.status === 404) {
      code = "ROUTE_NOT_FOUND";
      if (path.includes("/auth/")) {
        message = "Authentication route not found. Please ensure the backend is running the latest version.";
      } else {
        message = detail || `The requested resource was not found (404).`;
      }
    } else if (res.status === 422) {
      code = "VALIDATION_ERROR";
      message = detail || "Invalid request data. Please check your input.";
    } else if (res.status === 429) {
      code = "RATE_LIMIT";
      message = "Too many requests. Please wait a moment and try again.";
    } else if (res.status >= 500) {
      code = "SERVER_ERROR";
      message = detail || "Server error. The database or backend may be unavailable.";
    }

    logApi("error", `${method} ${path} failed`, { status: res.status, code, detail });
    throw new ApiError(message, code, res.status);
  }

  return data;
}

export async function apiGet(path) {
  return request(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPut(path, body) {
  return request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export async function apiSearch(query, type = "track", limit = 20) {
  return apiGet(`/discover/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
}

export async function apiPostNoBody(path) {
  return request(path, { method: "POST" });
}

export async function checkBackendHealth() {
  try {
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    const res = await fetchWithTimeout(`${base}/api/v1/health`, { method: "GET", timeout: 3000 });
    if (!res.ok) return { online: false, database: false };
    return await res.json();
  } catch {
    return { online: false, database: false };
  }
}

export function storeAuthTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem("soundwave_token", access_token);
  if (refresh_token) localStorage.setItem("soundwave_refresh_token", refresh_token);
}

export function clearAuthTokens() {
  localStorage.removeItem("soundwave_token");
  localStorage.removeItem("soundwave_refresh_token");
  localStorage.removeItem("soundwave_user");
}
