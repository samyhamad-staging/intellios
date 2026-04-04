import MonitorPage from "@/app/monitor/page";

export default function GovernorFleetPage() {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-violet-100 bg-violet-50 px-6 py-2.5">
        <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
          Governor
        </span>
        <p className="text-xs text-violet-600">
          Fleet Monitor — production health and observability for all deployed agents
        </p>
      </div>
      <MonitorPage />
    </>
  );
}
