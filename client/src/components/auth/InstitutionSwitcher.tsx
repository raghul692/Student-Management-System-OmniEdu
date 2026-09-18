import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Building2, School, GraduationCap, ChevronDown, Check } from 'lucide-react';
import { InstitutionType } from '../../types';

export const InstitutionSwitcher: React.FC = () => {
  const { activeOrganization, activeInstitution, selectInstitution } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const institutions = activeOrganization?.institutions || [];

  if (institutions.length <= 1 && !activeInstitution) {
    return null;
  }

  const getInstitutionIcon = (type: InstitutionType | string) => {
    if (type === 'SCHOOL') {
      return <School className="w-4 h-4 text-emerald-400" />;
    }
    return <GraduationCap className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all text-xs font-medium text-slate-200 shadow-sm"
        title="Switch active institution context"
      >
        <div className="p-1 rounded-lg bg-slate-900/60 border border-slate-700/50">
          {activeInstitution ? getInstitutionIcon(activeInstitution.type) : <Building2 className="w-4 h-4 text-slate-400" />}
        </div>
        <div className="text-left hidden sm:block">
          <p className="font-semibold text-slate-200 leading-none truncate max-w-[140px]">
            {activeInstitution?.name || 'Select Campus'}
          </p>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {activeInstitution?.type || 'Institution'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeOrganization?.name || 'Institutions'}
            </p>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {institutions.map((inst) => {
              const isSelected = activeInstitution?.id === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => {
                    selectInstitution(inst.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all text-xs ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                      {getInstitutionIcon(inst.type)}
                    </div>
                    <div className="truncate">
                      <p className="font-medium truncate">{inst.name}</p>
                      <p className="text-[10px] text-slate-400">{inst.type}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
