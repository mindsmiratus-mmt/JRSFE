export interface ModulePermissions {
  hasRead: boolean;
  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  canExport: boolean;
  isAdmin: boolean;
}

/**
 * Standardized utility to check permissions for a module.
 * Normalizes property casing (Module vs module, Read vs read, etc.)
 * and grants full access to Admin users.
 */
export const getModulePermissions = (
  permissions: any[],
  user: any,
  moduleNames: string | string[]
): ModulePermissions => {
  const isAdmin = user?.userRoles?.some((ur: any) => ur.role?.name === "Admin") ?? false;
  if (isAdmin) {
    return { hasRead: true, hasCreate: true, hasUpdate: true, hasDelete: true, canExport: true, isAdmin: true };
  }

  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return { hasRead: false, hasCreate: false, hasUpdate: false, hasDelete: false, canExport: false, isAdmin: false };
  }

  const targets = Array.isArray(moduleNames)
    ? moduleNames.map((m) => m.trim().toLowerCase())
    : [moduleNames.trim().toLowerCase()];

  // 1. First look for an exact module name match
  let match = permissions.find((p: any) => {
    if (!p) return false;
    const mod = (p.Module || p.module || "")?.trim()?.toLowerCase();
    if (!mod) return false;
    return targets.includes(mod);
  });

  // 2. If no exact match and checking reports, look for "reports", "sale report", or "invoice" fallback
  if (!match && targets.includes("reports")) {
    match = permissions.find((p: any) => {
      if (!p) return false;
      const mod = (p.Module || p.module || "")?.trim()?.toLowerCase();
      return mod === "reports" || mod === "sale report" || mod === "report" || mod === "invoice";
    });
  }

  // 3. Aliases for sale item & stock availability
  if (!match) {
    match = permissions.find((p: any) => {
      if (!p) return false;
      const mod = (p.Module || p.module || "")?.trim()?.toLowerCase();
      return targets.some(
        (t) =>
          (t.includes("sale item") && mod.includes("sale item")) ||
          (t.includes("stock available") && (mod.includes("stock") || mod.includes("sale item")))
      );
    });
  }

  if (!match) {
    return { hasRead: false, hasCreate: false, hasUpdate: false, hasDelete: false, canExport: false, isAdmin: false };
  }

  const hasRead = Boolean(match.Read ?? match.read);
  const hasCreate = Boolean(match.Create ?? match.create);
  const hasUpdate = Boolean(match.Update ?? match.update);
  const hasDelete = Boolean(match.Delete ?? match.delete);
  const canExport = hasCreate || hasUpdate;

  return {
    hasRead,
    hasCreate,
    hasUpdate,
    hasDelete,
    canExport,
    isAdmin: false,
  };
};
