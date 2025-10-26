"use client";

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  // Auto-logout if token expired or invalid
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/login";
    throw new Error("Session expired, please log in again.");
  }

  return res;
}