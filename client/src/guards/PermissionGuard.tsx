import React from 'react';
import { usePermissionStore } from '../store/usePermissionStore';
import { useSandboxStore } from '../store/useSandboxStore';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  resource: string;
  action: string;
  scope?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedState?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  scope,
  children,
  fallback = null,
  showDeniedState = false,
}) => {
  const { can } = usePermissionStore();
  const { isSandbox } = useSandboxStore();

  // In Sandbox demo mode, all viewing operations are permitted for demonstration
  if (isSandbox || can(resource, action, scope)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  if (showDeniedState) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/50 border border-red-500/20 rounded-2xl my-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 mb-4 ring-1 ring-red-500/30">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          Your current active role does not possess the <code className="text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded text-xs">{resource}:{action}{scope ? `:${scope}` : ''}</code> permission in this institution.
        </p>
      </div>
    );
  }

  return null;
};
