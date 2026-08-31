"use client";
import { Label } from "@/components/ui/label";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { loginToApp } from "../lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(loginToApp, "");
  console.log({ errorMessage });
  return (
    <form action={formAction}>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            className="rounded-md"
            id="email"
            type="email"
            name="email"
            placeholder="example@triage.com"
            required
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/login"
              className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
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
            required
          />
        </div>
        <div className="grid gap-1">
          <Button
            type="submit"
            disabled={isPending}
            className={`rounded-md w-full ${isPending ? "opacity-60" : ""}`}
          >
            {isPending ? <Loader2 className="animate-spin size-5" /> : "Login"}
          </Button>
        </div>
      </div>
    </form>
  );
}
