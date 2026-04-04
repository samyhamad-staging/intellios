import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GovernorSidebar } from "@/components/nav/governor-sidebar";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

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

  const branding = session.user.enterpriseId
    ? (await getEnterpriseSettings(session.user.enterpriseId)).branding
    : null;

  return (
    <div className="flex h-full">
      <GovernorSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
        branding={branding}
      />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--content-bg)" }}>
        {children}
      </main>
    </div>
  );
}
