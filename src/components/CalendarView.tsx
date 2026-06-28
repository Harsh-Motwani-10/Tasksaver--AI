/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScheduleSlot, Task } from '../types';
import { Calendar, Clock, RefreshCw, AlertTriangle, Cloud, Lock, Check, Sparkles } from 'lucide-react';

interface CalendarViewProps {
  slots: ScheduleSlot[];
  tasks: Task[];
  loading: boolean;
  onRegenerateSchedule: () => void;
}

export default function CalendarView({ slots, tasks, loading, onRegenerateSchedule }: CalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [syncedWithGoogle, setSyncedWithGoogle] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Simulate Google Calendar API Integration with OAuth
  const handleGoogleCalendarSync = async () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncedWithGoogle(true);
    }, 1500);
  };

  const formatHour = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl" id="calendar-schedule-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150 dark:border-slate-800 mb-5">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            AI Day Planner & CalSync
          </h2>
          <p className="text-xs text-slate-500">Your optimal day slots sequenced dynamically by task energy constraints</p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={handleGoogleCalendarSync}
            disabled={syncing}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              syncedWithGoogle
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15'
            }`}
          >
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : syncedWithGoogle ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Cloud className="w-3.5 h-3.5" />
            )}
            {syncing ? 'Syncing...' : syncedWithGoogle ? 'Synced to Google' : 'Sync Google Calendar'}
          </button>

          <button
            onClick={onRegenerateSchedule}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Auto-Schedule
          </button>
        </div>
      </div>

      {/* Main timeline view */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-3 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-3 border-t-indigo-500 rounded-full animate-spin" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">Formulating optimal schedule blocks...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center p-6">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">No Scheduled Tasks for Today</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
            Add tasks with effort hours and click "Auto-Schedule". The AI will sequence your tasks and add buffer rest spots automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {slots.map((slot, index) => {
            const associatedTask = tasks.find((t) => t.id === slot.taskId);
            const isBuffer = slot.type === 'buffer' || slot.type === 'break';
            const isPersonal = slot.type === 'personal';

            return (
              <div
                key={slot.id || index}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:translate-x-1 ${
                  isBuffer
                    ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850 text-slate-500 dark:text-slate-400'
                    : isPersonal
                    ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-150 dark:border-emerald-500/10 text-emerald-850 dark:text-emerald-200'
                    : associatedTask?.importance === 'high'
                    ? 'bg-rose-50 dark:bg-red-500/5 border-rose-150 dark:border-red-500/10 text-rose-900 dark:text-rose-200'
                    : 'bg-indigo-50 dark:bg-indigo-500/5 border-indigo-150 dark:border-indigo-500/10 text-indigo-900 dark:text-indigo-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shrink-0 text-center min-w-[75px]">
                    <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 leading-none">
                      {formatHour(slot.startTime)}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500 mt-1.5 leading-none">
                      {formatHour(slot.endTime)}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{slot.title}</h4>
                    {associatedTask && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          associatedTask.importance === 'high' ? 'bg-red-50 dark:bg-red-500/10 text-rose-600 dark:text-rose-400 border-red-150 dark:border-red-500/15' :
                          associatedTask.importance === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-150 dark:border-amber-500/15' :
                          'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {associatedTask.importance} Impact
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold font-mono">
                          Effort: {associatedTask.effortHours}h
                        </span>
                      </div>
                    )}
                    {isBuffer && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400/80 italic mt-1.5 block">
                        ⚡ Rest interval curated by coach to preserve battery life and mental stamina
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    isBuffer ? 'bg-slate-100 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-850' :
                    isPersonal ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
                    'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20'
                  }`}>
                    {slot.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security note */}
      <div className="mt-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-xl p-3 flex gap-2.5 items-center text-[11px] text-slate-500 font-medium">
        <Lock className="w-4 h-4 text-slate-450 dark:text-slate-650 shrink-0" />
        <p>Sandbox scheduling operates inside secure state container without sending unauthorized activity logs to outer cloud targets.</p>
      </div>
    </div>
  );
}
