import "server-only";
import axios from "axios";
import { cookies } from "next/headers";

export async function serverApi() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    headers: {
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      Cookie: refreshToken ? `refreshToken=${refreshToken}` : "",
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        refreshToken
      ) {
        originalRequest._retry = true;

        try {
          const refreshResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/refresh`,
            {},
            {
              headers: { Cookie: `refreshToken=${refreshToken}` },
            },
          );
          const newAccessToken = refreshResponse.data.accessToken;
          // Save new token in Next.js Server Cookies
          cookieStore.set("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });

          const user = await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/me`,
            {
              headers: { Authorization: `Bearer ${newAccessToken}` },
            },
          );

          cookieStore.set("userId", user.data?.user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60, // 15m
          });

          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

          return instance(originalRequest);
        } catch (refreshErr) {
          cookieStore.delete("accessToken");
          cookieStore.delete("refreshToken");
          cookieStore.delete("userId");
          return Promise.reject(refreshErr);
        }
      }
      return Promise.reject(error);
    },
  );
  return instance;
}
