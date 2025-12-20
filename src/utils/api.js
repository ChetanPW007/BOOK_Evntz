// Determined the backend base URL
const getBaseURL = () => {
  // 1. Check if VITE_API_BASE_URL is explicitly set (e.g. in Vercel or .env)
  let url = import.meta.env.VITE_API_BASE_URL || "";

  // 2. If not set, and we are on localhost, default to local backend
  if (!url && typeof window !== "undefined" && window.location.hostname === "localhost") {
    url = "http://localhost:5000";
  }

  // 3. If still not set, default to relative "/api" (Vite proxy)
  if (!url) return "/api";

  // 4. Ensure it has the /api suffix if it doesn't already
  // but don't append if it's already there
  const trimmed = url.replace(/\/$/, "");
  if (!trimmed.endsWith("/api")) {
    return trimmed + "/api";
  }
  return trimmed;
};

export const BASE = getBaseURL();

console.log("🔧 API Base URL:", BASE);

async function request(path, opts = {}) {
  const url = BASE + path;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  const text = await res.text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { status: "error", message: "Server Error (Invalid JSON)", raw: text };
  }
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  request(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) =>
  request(path, { method: "DELETE" });
