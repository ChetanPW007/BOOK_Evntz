// Use environment variable for API base URL
// In development: defaults to "/api" (uses Vite proxy)
// In production: set VITE_API_BASE_URL in Vercel env vars to your backend URL

// Force backend URL for now
const BASE = "https://turbo007.pythonanywhere.com";

console.log("🔧 API Base URL:", BASE);
console.log("🔧 Env variable:", import.meta.env.VITE_API_BASE_URL);

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
