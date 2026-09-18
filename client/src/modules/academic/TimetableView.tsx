import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface TimetableSlot {
  id: string;
  dayOfWeek: number; // 1-5 (Mon-Fri)
  hourSlot?: number;
  periodSlot?: number;
  roomNumber?: string;
  subjectName: string;
  facultyName: string;
  course?: { courseCode: string; title: string };
}

export const TimetableView: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = [1, 2, 3, 4];

  useEffect(() => {
    async function loadTimetable() {
      setLoading(true);
      try {
        const res = await apiClient.get('/academic/timetable');
        setTimetable(res.data.data.timetable || []);
      } catch (err) {
        console.error('Failed to load timetable:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTimetable();
  }, [activeCampus?.id]);

  const getSlotData = (dayIndex: number, slotIndex: number) => {
    return timetable.find(
      (t) =>
        t.dayOfWeek === dayIndex + 1 &&
        (isCollege ? t.hourSlot === slotIndex : t.periodSlot === slotIndex)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-academic-primary/20 text-academic-primary border border-academic-primary/30">
                Weekly Academic Schedule
              </span>
              <span className="text-xs text-obsidian-muted">
                {isCollege ? 'Semester 4 • Room CS-204 & Lab 3' : '10th Standard Section A'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-obsidian-text">
              Institutional Timetable Grid
            </h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Synchronized scheduling across lecture halls and laboratories with live faculty assignments.
            </p>
          </div>
        </div>
      </div>

      {/* Timetable Matrix Grid */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-obsidian-border bg-obsidian-card/60 text-xs uppercase tracking-wider text-obsidian-muted">
                <th className="py-3 px-4 w-32">Day</th>
                {slots.map((slot) => (
                  <th key={slot} className="py-3 px-4 text-center">
                    <div className="font-semibold text-obsidian-text">
                      {isCollege ? `Hour ${slot}` : `Period ${slot}`}
                    </div>
                    <div className="text-[10px] text-obsidian-muted font-normal lowercase">
                      {slot === 1
                        ? '09:00 - 10:00'
                        : slot === 2
                        ? '10:00 - 11:00'
                        : slot === 3
                        ? '11:15 - 12:15'
                        : '12:15 - 01:15'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-border/60 text-xs">
              {days.map((day, dayIdx) => (
                <tr key={day} className="hover:bg-obsidian-card/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-obsidian-text bg-obsidian-card/20">
                    {day}
                  </td>
                  {slots.map((slot) => {
                    const entry = getSlotData(dayIdx, slot);
                    return (
                      <td key={slot} className="py-3 px-3 text-center align-top">
                        {entry ? (
                          <div className="bg-obsidian-card border border-obsidian-border/80 hover:border-academic-primary/50 p-2.5 rounded-xl transition-all shadow-sm text-left">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono font-bold text-[11px] text-academic-primary">
                                {entry.course?.courseCode || 'CS8492'}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-obsidian-surface text-obsidian-muted border border-obsidian-border font-mono">
                                {entry.roomNumber || 'CS-204'}
                              </span>
                            </div>
                            <div className="font-medium text-xs text-obsidian-text line-clamp-1">
                              {entry.course?.title || entry.subjectName}
                            </div>
                            <div className="text-[10px] text-obsidian-muted flex items-center gap-1 mt-1">
                              <User className="w-2.5 h-2.5" />
                              <span className="truncate">{entry.facultyName}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 rounded-xl border border-dashed border-obsidian-border/40 flex items-center justify-center text-obsidian-muted/40 text-[10px]">
                            Break / Free
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimetableView;
