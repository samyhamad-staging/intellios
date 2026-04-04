"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, PenLine } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  enterpriseId: string | null;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { email: string; name: string };
}

const ROLES = [
  { value: "architect",          label: "Architect" },
  { value: "reviewer",          label: "Reviewer" },
  { value: "compliance_officer", label: "Compliance Officer" },
  { value: "admin",             label: "Admin" },
  { value: "viewer",            label: "Viewer" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  architect:         "bg-blue-50 text-blue-700 border-blue-200",
  reviewer:          "bg-amber-50 text-amber-700 border-amber-200",
  compliance_officer: "bg-green-50 text-green-700 border-green-200",
  admin:             "bg-purple-50 text-purple-700 border-purple-200",
  viewer:            "bg-slate-50 text-slate-600 border-slate-200",
};

const ROLE_ACCENT: Record<string, string> = {
  architect:         "border-blue-400",
  reviewer:          "border-amber-400",
  compliance_officer: "border-green-400",
  admin:             "border-purple-400",
  viewer:            "border-slate-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const label = ROLES.find((r) => r.value === role)?.label ?? role;
  const color = ROLE_COLORS[role] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1 hour";
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

// ─── Create User Form ─────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: (user: User) => void;
  onCancel: () => void;
}

function CreateUserForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("architect");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });

      const data = await res.json() as { user?: User; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Failed to create user");
        setSaving(false);
        return;
      }

      onCreated(data.user!);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">New User</h3>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Temporary password
            <span className="ml-1 font-normal text-gray-400">(min 8 chars)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Creating…" : "Create User"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Invite User Form ─────────────────────────────────────────────────────────

interface InviteFormProps {
  onInvited: (invitation: Invitation) => void;
  onCancel: () => void;
}

function InviteUserForm({ onInvited, onCancel }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("architect");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json() as { invitation?: Invitation; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Failed to send invitation");
        setSending(false);
        return;
      }

      onInvited(data.invitation!);
    } catch {
      setError("Network error. Please try again.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-violet-200 bg-violet-50 px-6 py-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Invite User</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          The invitee will receive an email to create their own account. Invitation expires in 72 hours.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending…" : "Send Invitation"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── P2-512: Bulk CSV Invite Form ────────────────────────────────────────────

interface BulkRow {
  email: string;
  role: string;
  status: "pending" | "sending" | "ok" | "error";
  message?: string;
}

function BulkInviteForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const VALID_ROLES = new Set(ROLES.map((r) => r.value));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parsed: BulkRow[] = [];
      for (const line of lines) {
        // Skip header lines (email,role or Email,Role)
        if (line.toLowerCase().startsWith("email")) continue;
        const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
        const email = parts[0] ?? "";
        const role = (parts[1] ?? "architect").toLowerCase();
        if (!email.includes("@")) continue;
        const normalizedRole = VALID_ROLES.has(role) ? role : "architect";
        parsed.push({ email, role: normalizedRole, status: "pending" });
      }
      if (parsed.length === 0) {
        setParseError("No valid rows found. Expected format: email,role (one per line).");
        return;
      }
      if (parsed.length > 50) {
        setParseError(`Too many rows (${parsed.length}). Maximum 50 invitations per upload.`);
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleSend() {
    setRunning(true);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status !== "pending") continue;
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "sending" } : r));
      try {
        const res = await fetch("/api/admin/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: rows[i].email, role: rows[i].role }),
        });
        const data = await res.json() as { message?: string };
        setRows((prev) => prev.map((r, idx) =>
          idx === i
            ? { ...r, status: res.ok ? "ok" : "error", message: res.ok ? undefined : (data.message ?? "Failed") }
            : r
        ));
      } catch {
        setRows((prev) => prev.map((r, idx) =>
          idx === i ? { ...r, status: "error", message: "Network error" } : r
        ));
      }
    }
    setRunning(false);
    setDone(true);
  }

  const allDone = rows.length > 0 && rows.every((r) => r.status === "ok" || r.status === "error");
  const successCount = rows.filter((r) => r.status === "ok").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-6 py-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Bulk Invite via CSV</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Upload a CSV with columns: <code className="font-mono bg-white px-1 rounded">email,role</code>.
          Valid roles: {ROLES.map((r) => r.value).join(", ")}. Defaults to <code className="font-mono bg-white px-1 rounded">architect</code> if omitted.
        </p>
      </div>

      {parseError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{parseError}</div>
      )}

      {rows.length === 0 ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-violet-700 hover:file:bg-violet-200"
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-2 pl-3 pr-2 text-left font-semibold text-gray-500">Email</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Role</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pl-3 pr-2 text-gray-700">{row.email}</td>
                  <td className="px-2 py-1.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{row.role}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    {row.status === "pending" && <span className="text-gray-400">Pending</span>}
                    {row.status === "sending" && <span className="text-violet-600 animate-pulse">Sending…</span>}
                    {row.status === "ok" && <span className="text-green-700 font-semibold">✓ Sent</span>}
                    {row.status === "error" && <span className="text-red-600">✗ {row.message}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {allDone && (
        <p className="text-xs font-medium text-gray-700">
          Done: {successCount} sent, {errorCount} failed.
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        {rows.length > 0 && !done && (
          <button
            onClick={handleSend}
            disabled={running}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {running ? "Sending…" : `Send ${rows.length} Invitation${rows.length !== 1 ? "s" : ""}`}
          </button>
        )}
        {rows.length > 0 && !running && !done && (
          <button
            onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = ""; }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Change file
          </button>
        )}
        {done ? (
          <button
            onClick={onDone}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline Role Editor ───────────────────────────────────────────────────────

interface RoleEditorProps {
  user: User;
  currentUserId: string;
  onUpdated: (user: User) => void;
}

function InlineRoleEditor({ user, currentUserId, onUpdated }: RoleEditorProps) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const isSelf = user.id === currentUserId;

  async function saveRole() {
    if (role === user.role) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json() as { user?: User; message?: string };
      if (res.ok && data.user) {
        onUpdated(data.user);
        setEditing(false);
      } else {
        setRole(user.role); // revert
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <RoleBadge role={role} />
        {!isSelf && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-all"
            title="Edit role"
            aria-label="Edit role"
          >
            <PenLine size={12} />
          </button>
        )}
        {isSelf && (
          <span className="text-xs text-gray-300">you</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={setRole} disabled={saving}>
        <SelectTrigger className="h-7 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        onClick={saveRole}
        disabled={saving}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
      >
        {saving ? "…" : "Save"}
      </button>
      <button
        onClick={() => { setRole(user.role); setEditing(false); }}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [userList, setUserList] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [inviteSuccessToast, setInviteSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current user ID for self-protection
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { id?: string }) => { if (d.id) setCurrentUserId(d.id); })
      .catch(() => {});

    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: { users?: User[]; message?: string }) => {
        if (d.users) {
          setUserList(d.users.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          setError(d.message ?? "Failed to load users");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load users");
        setLoading(false);
      });

    fetch("/api/admin/users/invitations")
      .then((r) => r.json())
      .then((d: { invitations?: Invitation[] }) => {
        if (d.invitations) setInvitations(d.invitations);
        setInvitationsLoading(false);
      })
      .catch(() => setInvitationsLoading(false));
  }, []);

  function handleCreated(user: User) {
    setUserList((prev) =>
      [...prev, user].sort((a, b) => a.name.localeCompare(b.name))
    );
    setShowCreate(false);
  }

  function handleUpdated(updated: User) {
    setUserList((prev) =>
      prev.map((u) => (u.id === updated.id ? updated : u))
    );
  }

  function handleInvited(invitation: Invitation) {
    setInvitations((prev) => [...prev, invitation]);
    setShowInvite(false);
    setInviteSuccessToast(`Invitation sent to ${invitation.email}`);
    setTimeout(() => setInviteSuccessToast(null), 4000);
  }

  const roleCounts = ROLES.reduce(
    (acc, r) => ({ ...acc, [r.value]: userList.filter((u) => u.role === r.value).length }),
    {} as Record<string, number>
  );

  const showingForm = showCreate || showInvite || showBulkInvite;

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Success toast */}
      {inviteSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-lg">
          ✓ {inviteSuccessToast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage enterprise users, roles, and access</p>
        </div>
        {!showingForm && (
          <div className="flex items-center gap-2">
            {/* P2-512: Bulk CSV invite */}
            <button
              onClick={() => setShowBulkInvite(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Bulk invite via CSV"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Bulk CSV
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-4 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors"
            >
              <Mail size={13} />
              Invite User
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              + New User
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Role summary stats */}
        {!loading && userList.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {ROLES.map((r) => (
              <div
                key={r.value}
                className={`rounded-lg border border-gray-200 border-l-2 ${ROLE_ACCENT[r.value]} bg-white px-4 py-3`}
              >
                <div className="text-2xl font-bold text-gray-900">{roleCounts[r.value] ?? 0}</div>
                <div className="mt-0.5 text-xs text-gray-500">{r.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Invite form */}
        {showInvite && (
          <InviteUserForm
            onInvited={handleInvited}
            onCancel={() => setShowInvite(false)}
          />
        )}

        {/* P2-512: Bulk CSV invite form */}
        {showBulkInvite && (
          <BulkInviteForm
            onDone={() => { setShowBulkInvite(false); void fetch("/api/admin/users/invitations").then((r) => r.json()).then((d: { invitations?: Invitation[] }) => { if (d.invitations) setInvitations(d.invitations); }); }}
            onCancel={() => setShowBulkInvite(false)}
          />
        )}

        {/* Create form */}
        {showCreate && (
          <CreateUserForm
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* User table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading && (
            <div className="space-y-0 divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && userList.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">No users yet.</p>
              {!showingForm && (
                <div className="mt-3 flex justify-center gap-4">
                  <button
                    onClick={() => setShowInvite(true)}
                    className="text-sm text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    Invite a user →
                  </button>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Create the first user →
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && userList.length > 0 && (
            <>
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-2.5">
                <div className="grid grid-cols-[3fr_2fr_1fr] gap-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                  <span>User</span>
                  <span>Role</span>
                  <span className="text-right">Joined</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {userList.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <div
                      key={user.id}
                      className={`grid grid-cols-[3fr_2fr_1fr] gap-4 items-center px-6 py-3.5 transition-colors ${isSelf ? "bg-violet-50/40 hover:bg-violet-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="truncate text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <InlineRoleEditor
                        user={user}
                        currentUserId={currentUserId}
                        onUpdated={handleUpdated}
                      />
                      <span className="text-right text-xs text-gray-400 whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pending Invitations */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Pending Invitations</h2>

          {invitationsLoading && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100 ml-auto" />
                </div>
              ))}
            </div>
          )}

          {!invitationsLoading && invitations.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center">
              <p className="text-sm text-gray-400">No pending invitations.</p>
            </div>
          )}

          {!invitationsLoading && invitations.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-2.5">
                <div className="grid grid-cols-[2fr_1.5fr_2fr_1fr] gap-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                  <span>Email</span>
                  <span>Role</span>
                  <span>Invited by</span>
                  <span className="text-right">Expires in</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-[2fr_1.5fr_2fr_1fr] gap-4 items-center px-6 py-3"
                  >
                    <span className="truncate text-sm text-gray-700">{inv.email}</span>
                    <RoleBadge role={inv.role} />
                    <span className="truncate text-xs text-gray-500">
                      {inv.invitedBy.name || inv.invitedBy.email}
                    </span>
                    <span className="text-right text-xs text-amber-600 font-medium">
                      {timeUntil(inv.expiresAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
