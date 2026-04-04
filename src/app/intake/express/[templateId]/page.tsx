import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { findBlueprintTemplate } from "@/lib/templates/blueprint-templates";
import { ExpressLaneEditor } from "@/components/intake/express-lane-editor";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function ExpressLanePage({ params }: PageProps) {
  const { templateId } = await params;

  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (user.role !== "architect" && user.role !== "admin") redirect("/");

  const template = findBlueprintTemplate(templateId);
  if (!template) notFound();

  // Serialize template data for client component
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-surface px-4 py-2">
        <Breadcrumb
          items={[
            { label: "Intake Sessions", href: "/intake" },
            { label: "Express Lane", href: "/intake/express" },
            { label: template.name },
          ]}
        />
      </div>
      <ExpressLaneEditor
        templateId={template.id}
        templateName={template.name}
        templateDescription={template.description}
        templateCategory={template.category}
        templateGovernanceTier={template.governanceTier}
        templateTags={template.tags}
        initialAbp={template.abp}
      />
    </div>
  );
}
