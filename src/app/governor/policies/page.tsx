import GovernancePage from "@/app/governance/page";

export default function GovernorPoliciesPage() {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-violet-100 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-6 py-2.5">
        <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
          Governor
        </span>
        <p className="text-xs text-violet-600 dark:text-violet-400">
          Policies — enterprise-wide policy definitions and governance framework configuration
        </p>
      </div>
      <GovernancePage />
    </>
  );
}
