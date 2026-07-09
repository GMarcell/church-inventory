"use client";

import { useSession } from "next-auth/react";
import { type Role, type Resource, type Action, can } from "./rbac";

export function usePermission() {
  const { data: session } = useSession();
  const role = ((session?.user as { role?: string })?.role || "viewer") as Role;

  return {
    role,
    can: (resource: Resource, action: Action): boolean => {
      return can(role, resource, action);
    },
    isAdmin: role === "admin",
    isEditor: role === "editor" || role === "admin",
    isViewer: role === "viewer",
  };
}
