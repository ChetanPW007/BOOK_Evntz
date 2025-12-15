const BASE = "/api";

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
