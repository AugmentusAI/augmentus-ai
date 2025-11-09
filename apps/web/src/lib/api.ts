export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://augmentus-ai-production.up.railway.app";

export async function registerUser(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Registration failed: ${msg}`);
  }

  return res.json(); // { access_token, token_type }
}

export async function loginUser(email: string, password: string) {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);

  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Login failed: ${msg}`);
  }

  return res.json(); // { access_token, token_type }
}