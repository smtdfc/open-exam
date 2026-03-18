"use client";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl mb-4">Chào mừng tới Open Exam</h1>
      <button
        onClick={handleGoogleLogin}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Đăng nhập bằng Google
      </button>
    </div>
  );
}
