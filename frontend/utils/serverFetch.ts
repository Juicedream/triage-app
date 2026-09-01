import { cookies } from "next/headers";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
console.log(NEXT_PUBLIC_BACKEND_URL);

export async function serverFetch(url: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("token")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  const headers = new Headers(options.headers);

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (refreshToken) {
    headers.append("Cookie", `refreshToken=${refreshToken}`);
  }

  return fetch(`${NEXT_PUBLIC_BACKEND_URL}${url}`, {
    ...options,
    headers,
  });
}
