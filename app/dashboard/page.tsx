import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <div>Bạn không có quyền ở đây!</div>;
  }

  return (
    <div>
      <h1>Chào mừng Admin {session.user.name}</h1>
      <p>Email của bạn: {session.user.email}</p>
    </div>
  );
}
