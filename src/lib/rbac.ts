export type Role = "admin" | "editor" | "viewer";

export type Resource = "assets" | "categories" | "locations" | "users";
export type Action = "create" | "read" | "update" | "delete" | "manage";

export type Permission = `${Resource}:${Action}`;

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "assets:create",
    "assets:read",
    "assets:update",
    "assets:delete",
    "categories:create",
    "categories:read",
    "categories:update",
    "categories:delete",
    "locations:create",
    "locations:read",
    "locations:update",
    "locations:delete",
    "users:manage",
  ],
  editor: [
    "assets:create",
    "assets:read",
    "assets:update",
    "categories:create",
    "categories:read",
    "categories:update",
    "locations:create",
    "locations:read",
    "locations:update",
  ],
  viewer: [
    "assets:read",
    "categories:read",
    "locations:read",
  ],
};

export function hasPermission(
  role: Role | undefined | null,
  permission: Permission
): boolean {
  if (!role) return false;
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function hasAnyPermission(
  role: Role | undefined | null,
  ...permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getAllPermissions(): Permission[] {
  return [
    "assets:create",
    "assets:read",
    "assets:update",
    "assets:delete",
    "categories:create",
    "categories:read",
    "categories:update",
    "categories:delete",
    "locations:create",
    "locations:read",
    "locations:update",
    "locations:delete",
    "users:manage",
  ];
}

export function can(
  role: Role | undefined | null,
  resource: Resource,
  action: Action
): boolean {
  return hasPermission(role, `${resource}:${action}` as Permission);
}
