import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 via-amber-50 to-orange-100">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10 sm:px-6">
        <LoginForm />
      </div>
    </div>
  );
}
