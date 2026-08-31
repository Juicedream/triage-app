"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loggingIn } from "./data";

export async function loginToApp(
  prevState: string | undefined,
  formData: FormData,
): Promise<string> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return "Email and password are required";
  }

  const payload = {
    email: String(email),
    password: String(password),
  };

  try {
    const data = await loggingIn(payload);

    // Set secure HTTP-only cookies instead of browser sessionStorage
    const cookieStore = await cookies();
    if (data?.token) {
      cookieStore.set("token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    if (data?.refreshToken) {
      cookieStore.set("refreshToken", data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
  } catch (error) {
    console.error("Unable to log in:", error);
    if (error instanceof Error) {
      return error.message; // Always return a string, never raw error objects
    }
    return "Failed to log in at the moment. Please try again.";
  }

  // MUST be called OUTSIDE the try-catch block
  redirect("/dashboard");
}
