import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { findBlueprintTemplate } from "@/lib/templates/blueprint-templates";
import { ExpressLaneEditor } from "@/components/intake/express-lane-editor";

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
    <ExpressLaneEditor
      templateId={template.id}
      templateName={template.name}
      templateDescription={template.description}
      templateCategory={template.category}
      templateGovernanceTier={template.governanceTier}
      templateTags={template.tags}
      initialAbp={template.abp}
    />
  );
}
