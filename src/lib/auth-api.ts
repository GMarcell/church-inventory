import { auth } from "./auth";
import { NextResponse } from "next/server";
import { type Role, type Resource, type Action, can } from "./rbac";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

export async function requireAuth(): Promise<{
  user: AuthUser;
  error: NextResponse | null;
}> {
  const session = await auth();

  if (!session?.user) {
    return {
      user: null as unknown as AuthUser,
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const user = session.user as unknown as AuthUser;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "viewer",
    },
    error: null,
  };
}

export async function requirePermission(
  resource: Resource,
  action: Action
): Promise<{
  user: AuthUser;
  error: NextResponse | null;
}> {
  const { user, error } = await requireAuth();

  if (error) return { user, error };

  if (!can(user.role, resource, action)) {
    return {
      user,
      error: NextResponse.json(
        { error: "You do not have permission to perform this action" },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
