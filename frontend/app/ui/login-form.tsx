"use client";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { loginToApp } from "../lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { User } from "../lib/definitions";

export interface LoginActionState {
  user: User | null;
  error: string | null;
  timestamp?: number;
}

const initialState: LoginActionState = {
  user: null,
  error: null,
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [state, formAction, isPending] = useActionState(
    loginToApp,
    initialState,
  );

  useEffect(() => {
    if (state.error) {
      toast.add({
        type: "error",
        title: "Error",
        description: state.error,
      });
    }

    if (state.user) {
      // Adding user to our useAuthStore
      setAuth(state.user);
      toast.add({
        type: "success",
        title: "Success",
        description: "Logged in successfully!",
      });
      router.push("/dashboard");
    }
  }, [state, router, setAuth]);

  return (
    <>
      <form action={formAction}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              className="rounded-md"
              id="email"
              type="email"
              name="email"
              placeholder="example@triage.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/login"
                className="ml-auto inline-block text-xs underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            <Input
              className="rounded-md"
              id="password"
              type="password"
              name="password"
              placeholder="************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1">
            <Button
              type="submit"
              disabled={isPending}
              className={`rounded-md w-full ${isPending ? "opacity-60" : ""}`}
            >
              {isPending ? (
                <Loader2 className="animate-spin size-5" />
              ) : (
                "Login"
              )}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
