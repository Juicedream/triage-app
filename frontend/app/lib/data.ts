export async function loggingIn(payload: { email: string; password: string }) {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message);
  }

  return data;
}
