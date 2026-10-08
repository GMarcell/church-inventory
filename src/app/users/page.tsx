"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermission } from "@/lib/use-permission";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const perm = usePermission();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "editor",
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/");
          return;
        }
        setError("Failed to load users");
        return;
      }
      setUsers(await res.json());
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;
    if (!perm.isAdmin) {
      router.push("/");
      return;
    }
    fetchUsers();
  }, [status, router, perm.isAdmin, fetchUsers]);

  const handleRoleChange = useCallback(
    async (userId: string, newRole: string) => {
      setSavingRole(userId);
      setError("");

      try {
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, role: newRole }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update role");
          return;
        }

        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: newRole } : u
          )
        );
        setRoleChanges((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } catch {
        setError("Failed to update role");
      } finally {
        setSavingRole(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (userId: string, userEmail: string) => {
      if (
        !confirm(
          `Are you sure you want to delete ${userEmail}? This action cannot be undone.`
        )
      )
        return;

      setDeleting(userId);
      setError("");

      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to delete user");
          return;
        }

        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch {
        setError("Failed to delete user");
      } finally {
        setDeleting(null);
      }
    },
    []
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    if (createForm.password !== createForm.confirmPassword) {
      setError("Passwords do not match");
      setCreating(false);
      return;
    }

    if (createForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user");
        return;
      }

      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "editor",
      });
    } catch {
      setError("Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  User Management
                </h1>
              </div>
              <p className="text-blue-200 text-sm mt-1">
                Manage user roles and access permissions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create User
                </span>
              </button>
              <Link
                href="/"
                className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Back to Inventory
              </Link>
              {session?.user && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-blue-500/30">
                  <span className="text-xs text-blue-200 hidden sm:inline">
                    {session.user.name || session.user.email}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-400 text-blue-900">
                    admin
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="px-3 py-2 text-sm bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Users ({users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {user.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={roleChanges[user.id] ?? user.role}
                          onChange={(e) =>
                            setRoleChanges((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className={`text-xs px-2 py-1 rounded border outline-none font-medium ${
                            (roleChanges[user.id] ?? user.role) === "admin"
                              ? "bg-amber-50 border-amber-200 text-amber-800"
                              : (roleChanges[user.id] ?? user.role) === "editor"
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                          disabled={user.id === session?.user?.id}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        {roleChanges[user.id] &&
                          roleChanges[user.id] !== user.role && (
                            <button
                              onClick={() =>
                                handleRoleChange(user.id, roleChanges[user.id])
                              }
                              disabled={savingRole === user.id}
                              className="text-xs px-2 py-1 font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              {savingRole === user.id ? "Saving..." : "Save"}
                            </button>
                          )}
                        {user.id === session?.user?.id && (
                          <span className="text-[10px] text-slate-400 italic">
                            (you)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.id !== session?.user?.id && (
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          disabled={deleting === user.id}
                          className="text-xs px-3 py-1.5 font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deleting === user.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Role Descriptions
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <span className="text-xs font-bold uppercase text-amber-800">
                Admin
              </span>
              <p className="text-xs text-amber-700 mt-1">
                Full access: create, edit, delete assets, categories, locations,
                and manage users.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-xs font-bold uppercase text-green-800">
                Editor
              </span>
              <p className="text-xs text-green-700 mt-1">
                Can create and edit assets, categories, and locations. Cannot
                delete or manage users.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-600">
                Viewer
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Read-only access to view all inventory data. Cannot create, edit,
                or delete anything.
              </p>
            </div>
          </div>
        </div>
        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">
                  Create User
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="user@church.org"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Min. 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Repeat password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm font-medium ${
                      createForm.role === "admin"
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : createForm.role === "editor"
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      creating ||
                      !createForm.email ||
                      !createForm.password ||
                      !createForm.confirmPassword
                    }
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 rounded-lg transition-colors"
                  >
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
