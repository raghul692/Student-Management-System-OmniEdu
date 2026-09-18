import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  CampusSummary,
  InstitutionSummary,
  TenantType,
  InstitutionRole,
  SystemRole,
} from '../types';
import { apiClient } from '../services/apiClient';
import { usePermissionStore } from './usePermissionStore';

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  type?: string;
  role: SystemRole;
  institutions: Array<
    InstitutionSummary & {
      role: InstitutionRole;
      deptId?: string | null;
      classId?: string | null;
    }
  >;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  organizations: UserOrganization[];
  activeOrganization: UserOrganization | null;
  activeInstitution: InstitutionSummary | null;
  activeCampus: CampusSummary | null; // Backwards compatible alias
  institutionRole: InstitutionRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, orgSlug?: string) => Promise<void>;
  demoLogin: (roleKey: string) => Promise<void>;
  selectOrganization: (orgId: string) => void;
  selectInstitution: (institutionId: string) => Promise<void>;
  switchCampus: (campus: CampusSummary) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  getActiveTenantType: () => TenantType;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      organizations: [],
      activeOrganization: null,
      activeInstitution: null,
      activeCampus: null,
      institutionRole: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string, _orgSlug?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post('/auth/login', { email, password });
          const { user, organizations, defaultInstitution, accessToken } = res.data.data;

          const defaultOrg = organizations && organizations.length > 0 ? organizations[0] : null;
          const initialInst = defaultInstitution || (defaultOrg?.institutions?.[0] ?? null);

          set({
            user: {
              ...user,
              role: initialInst?.role || user.systemRole,
            },
            accessToken,
            organizations: organizations || [],
            activeOrganization: defaultOrg,
            activeInstitution: initialInst,
            activeCampus: initialInst,
            institutionRole: initialInst?.role || null,
            isAuthenticated: true,
            isLoading: false,
          });

          // If there's an active institution, establish the scoped session
          if (initialInst?.id) {
            get().selectInstitution(initialInst.id).catch(() => {});
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Login failed',
          });
          throw err;
        }
      },

      demoLogin: async (roleKey: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post('/auth/demo-login', { role: roleKey });
          const { user, organizations, defaultInstitution, accessToken } = res.data.data;

          const defaultOrg = organizations && organizations.length > 0 ? organizations[0] : null;
          const initialInst = defaultInstitution || (defaultOrg?.institutions?.[0] ?? null);

          set({
            user: {
              ...user,
              role: initialInst?.role || user.systemRole,
            },
            accessToken,
            organizations: organizations || [],
            activeOrganization: defaultOrg,
            activeInstitution: initialInst,
            activeCampus: initialInst,
            institutionRole: initialInst?.role || null,
            isAuthenticated: true,
            isLoading: false,
          });

          if (initialInst?.id) {
            get().selectInstitution(initialInst.id).catch(() => {});
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Demo login failed',
          });
          throw err;
        }
      },

      selectOrganization: (orgId: string) => {
        const { organizations } = get();
        const targetOrg = organizations.find((o) => o.id === orgId);
        if (targetOrg) {
          const firstInst = targetOrg.institutions?.[0] || null;
          set({
            activeOrganization: targetOrg,
            activeInstitution: firstInst,
            activeCampus: firstInst,
            institutionRole: firstInst?.role || null,
          });
          if (firstInst?.id) {
            get().selectInstitution(firstInst.id).catch(() => {});
          }
        }
      },

      selectInstitution: async (institutionId: string) => {
        try {
          const res = await apiClient.post('/auth/select-institution', { institutionId });
          const { institutionSession, accessToken } = res.data.data;

          const updatedInst: InstitutionSummary = {
            id: institutionSession.institutionId,
            organizationId: institutionSession.organizationId,
            name: institutionSession.institutionName,
            code: institutionSession.institutionId.slice(0, 8),
            type: institutionSession.institutionType,
            role: institutionSession.role,
          };

          set((state) => ({
            accessToken: accessToken || state.accessToken,
            activeInstitution: updatedInst,
            activeCampus: updatedInst,
            institutionRole: institutionSession.role,
            user: state.user
              ? {
                  ...state.user,
                  role: institutionSession.role,
                }
              : null,
          }));

          // Synchronize permissions into PermissionStore
          usePermissionStore
            .getState()
            .setPermissions(
              institutionSession.permissions || [],
              get().user?.systemRole,
              institutionSession.role
            );
        } catch (err) {
          console.warn('Could not establish scoped institution session, falling back locally', err);
        }
      },

      switchCampus: async (campus: CampusSummary) => {
        set({ activeInstitution: campus, activeCampus: campus });
        await get().selectInstitution(campus.id);
      },

      logout: () => {
        usePermissionStore.getState().clearPermissions();
        set({
          user: null,
          accessToken: null,
          organizations: [],
          activeOrganization: null,
          activeInstitution: null,
          activeCampus: null,
          institutionRole: null,
          isAuthenticated: false,
          error: null,
        });
        localStorage.removeItem('omniedu_auth');
      },

      clearError: () => set({ error: null }),

      getActiveTenantType: () => {
        const { activeInstitution, activeCampus, user } = get();
        const inst = activeInstitution || activeCampus;
        if (inst?.type) return inst.type as TenantType;
        return (user?.tenant?.type as TenantType) || 'COLLEGE';
      },
    }),
    {
      name: 'omniedu_auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        organizations: state.organizations,
        activeOrganization: state.activeOrganization,
        activeInstitution: state.activeInstitution,
        activeCampus: state.activeCampus,
        institutionRole: state.institutionRole,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
