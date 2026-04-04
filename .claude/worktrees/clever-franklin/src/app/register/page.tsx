import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Create Account — Intellios" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Intellios
          </h1>
          <p className="mt-1 text-sm text-gray-500">Enterprise Agent Factory</p>
        </div>

        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
