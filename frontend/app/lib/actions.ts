"use server";
import api from "@/app/lib/api";
import { User } from "./definitions";
import { LoginActionState } from "../ui/login-form";
import { cookies } from "next/headers";
import { isAxiosError } from "axios";

const isAuthorizedRoles = ["admin", "agent"];

export async function loginToApp(
  prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return {
      user: null,
      error: "Email and password are required",
      timestamp: Date.now(),
    };
  }

  const payload = {
    email: String(email),
    password: String(password),
  };

  try {
    const response = await api.post(`/auth/login`, payload);
    const { accessToken, refreshToken } = response.data;

    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    const cookieStore = await cookies();

    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15m
    });

    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // fetch auth user
    const result = await api.get(`/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user: User = result.data.user;

    if (user && !isAuthorizedRoles.includes(user.role)) {
      await api.post(
        "/auth/logout",
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      cookieStore.delete("refreshToken");
      cookieStore.delete("accessToken");
      cookieStore.delete("userId");

      return { error: "Forbidden: Unauthorized access", user: null };
    }

    cookieStore.set("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15m
    });

    return { user, error: null, timestamp: Date.now() };
  } catch (error) {
    console.error("Login action error:", error);

    let errorMessage = "Failed to log in at the moment. Please try again.";

    if (isAxiosError(error) && error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      user: null,
      error: errorMessage,
      timestamp: Date.now(),
    };
  }
}
