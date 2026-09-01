import { LoginForm } from "@/app/ui/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center h-full w-full justify-center">
      <div className="bg-[#ffffff] shadow-black/50 shadow-xs rounded-md py-6 w-2/4 px-4">
        <div className="flex-col gap-2 mb-6">
          <h2 className="text-primary text-xl">Welcome Back 👋</h2>
          <span className="text-accent-foreground text-xs">
            Kindly enter the details below:
          </span>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
