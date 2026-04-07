import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ALLOWED_ROLES = ["reviewer", "compliance_officer", "admin"];

export default async function GovernorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!ALLOWED_ROLES.includes(session.user.role ?? "")) {
    redirect("/");
  }

  return <>{children}</>;
}
