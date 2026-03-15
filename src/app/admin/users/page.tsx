"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  enterpriseId: string | null;
  createdAt: string;
}

const ROLES = [
  { value: "designer",          label: "Designer" },
  { value: "reviewer",          label: "Reviewer" },
  { value: "compliance_officer", label: "Compliance Officer" },
  { value: "admin",             label: "Admin" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  designer:          "bg-blue-50 text-blue-700 border-blue-200",
  reviewer:          "bg-amber-50 text-amber-700 border-amber-200",
  compliance_officer: "bg-green-50 text-green-700 border-green-200",
  admin:             "bg-purple-50 text-purple-700 border-purple-200",
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

// ─── Create User Form ─────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: (user: User) => void;
  onCancel: () => void;
}

function CreateUserForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("designer");
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
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
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
      <div className="flex items-center gap-2">
        <RoleBadge role={role} />
        {!isSelf && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Edit
          </button>
        )}
        {isSelf && (
          <span className="text-xs text-gray-300">(you)</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={saving}
        autoFocus
        className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

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

  const roleCounts = ROLES.reduce(
    (acc, r) => ({ ...acc, [r.value]: userList.filter((u) => u.role === r.value).length }),
    {} as Record<string, number>
  );

  return (
    <div className="px-8 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage enterprise users, roles, and access</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            + New User
          </button>
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
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="text-2xl font-bold text-gray-900">{roleCounts[r.value] ?? 0}</div>
                <div className="mt-0.5 text-xs text-gray-500">{r.label}</div>
              </div>
            ))}
          </div>
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
              {!showCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Create the first user →
                </button>
              )}
            </div>
          )}

          {!loading && userList.length > 0 && (
            <>
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-2.5">
                <div className="grid grid-cols-[2fr_2fr_2fr_1fr] gap-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                  <span>User</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span className="text-right">Joined</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {userList.map((user) => (
                  <div key={user.id} className="grid grid-cols-[2fr_2fr_2fr_1fr] gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-medium text-gray-900">
                        {user.name}
                      </span>
                    </div>
                    <span className="truncate text-sm text-gray-500">{user.email}</span>
                    <InlineRoleEditor
                      user={user}
                      currentUserId={currentUserId}
                      onUpdated={handleUpdated}
                    />
                    <span className="text-right text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          {userList.length} user{userList.length === 1 ? "" : "s"} in this enterprise.
          Password changes must be performed by each user individually.
        </p>
      </div>
    </div>
  );
}
