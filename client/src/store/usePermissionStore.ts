import { create } from 'zustand';

interface PermissionState {
  permissions: string[];
  systemRole: string | null;
  institutionRole: string | null;
  setPermissions: (permissions: string[], systemRole?: string, institutionRole?: string) => void;
  clearPermissions: () => void;
  can: (resource: string, action: string, scope?: string) => boolean;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  systemRole: null,
  institutionRole: null,

  setPermissions: (permissions, systemRole, institutionRole) => {
    set({
      permissions,
      systemRole: systemRole || null,
      institutionRole: institutionRole || null,
    });
  },

  clearPermissions: () => {
    set({ permissions: [], systemRole: null, institutionRole: null });
  },

  can: (resource: string, action: string, scope?: string) => {
    const { permissions, systemRole, institutionRole } = get();
    // Platform and Org Admins have universal permission
    if (systemRole === 'PLATFORM_ADMIN' || systemRole === 'ORG_ADMIN') return true;
    if (institutionRole === 'INSTITUTION_ADMIN') return true;

    if (scope) {
      return permissions.includes(`${resource}:${action}:${scope}`);
    }

    // Any match on resource:action
    return permissions.some((p) => p.startsWith(`${resource}:${action}:`));
  },
}));
