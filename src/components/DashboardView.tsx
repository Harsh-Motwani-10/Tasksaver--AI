/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Goal, AIRecommendation, ScheduleSlot, UserPreferences, TaskFilters } from '../types';
import { 
  Sparkles, AlertCircle, Calendar, Clock, CheckCircle2, 
  Flame, TrendingUp, ArrowRight, Zap, Target, RefreshCw,
  Plus, Play, Check, CheckSquare, Activity, AlertTriangle
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

interface DashboardViewProps {
  tasks: Task[];
  goals: Goal[];
  recommendations: AIRecommendation[];
  preferences: UserPreferences;
  scheduleSlots: ScheduleSlot[];
  scheduling: boolean;
  onNavigate: (section: 'dashboard' | 'tasks' | 'calendar' | 'goals' | 'ai_assistant' | 'settings', filters?: Partial<TaskFilters>) => void;
  onPrioritize: () => void;
  onAutonomousBreakdown: (goalText: string) => void;
  onAddTask: (task: Task) => void;
  onIncrementGoal: (id: string) => void;
  onQuickComplete: (task: Task) => void;
  onRegenerateSchedule: () => void;
  prioritizing: boolean;
}

export default function DashboardView({
  tasks,
  goals,
  recommendations,
  preferences,
  scheduleSlots,
  scheduling,
  onNavigate,
  onPrioritize,
  onAutonomousBreakdown,
  onAddTask,
  onIncrementGoal,
  onQuickComplete,
  onRegenerateSchedule,
  prioritizing
}: DashboardViewProps) {
  
  // Quick-Add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDue, setQuickDue] = useState<'today' | 'tomorrow' | 'next_week'>('tomorrow');
  const [quickImportance, setQuickImportance] = useState<Task['importance']>('medium');

  // Urgency calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const incompleteTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  
  const completionRatio = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  const overdue = incompleteTasks.filter(t => {
    const d = new Date(t.dueDate);
    return d < now && d.toISOString().split('T')[0] !== todayStr;
  });

  const dueToday = incompleteTasks.filter(t => {
    const dStr = t.dueDate.split('T')[0];
    return dStr === todayStr;
  });

  const upcoming = incompleteTasks.filter(t => {
    const d = new Date(t.dueDate);
    return d > now && t.dueDate.split('T')[0] !== todayStr;
  });

  // Today's priorities
  const sortedPriorities = [...incompleteTasks].sort((a, b) => {
    return (b.priorityScore || 0) - (a.priorityScore || 0);
  });
  const topPriorities = sortedPriorities.slice(0, 3);

  const activeStreaks = goals.filter(g => g.streak > 0);

  // Quick Action greeting
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Submit quick-added task
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    let targetDate = new Date();
    if (quickDue === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (quickDue === 'next_week') {
      targetDate.setDate(targetDate.getDate() + 7);
    }
    // Set typical evening due time
    targetDate.setHours(18, 0, 0, 0);

    const newTask: Task = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      title: quickTitle.trim(),
      dueDate: targetDate.toISOString().substring(0, 16),
      effortHours: 2,
      importance: quickImportance,
      status: 'todo',
      progress: 0,
      subtasks: []
    };

    onAddTask(newTask);
    setQuickTitle('');
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
    <div className="space-y-6" id="dashboard-view-root">
      
      {/* 1. Header Hero Welcome with glowing accent card */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-650/5 dark:bg-indigo-650/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" /> Mission Control
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                Active Streak: {activeStreaks.length > 0 ? `${Math.max(...activeStreaks.map(g => g.streak))} Days` : '0 Days'}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3.5xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
              {getGreeting()}, {preferences.name || 'Achiever'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl">
              Your procrastination shield is primed. Here is your unified focus sequence, adaptive timeline, and coaching center.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={() => onNavigate('ai_assistant')}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/15 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              Ask Coach What's Next
            </button>
            <button
              onClick={onPrioritize}
              disabled={prioritizing || tasks.length === 0}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-50 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {prioritizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />}
              Re-Prioritize AI Score
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Stats & Metrics Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="kpi-metrics-hub">
        
        {/* Dynamic Focus Progress Ring Metric */}
        <button 
          onClick={() => onNavigate('tasks', { status: 'completed', due: 'all', importance: 'all' })}
          className="w-full text-left bg-gradient-to-b from-white to-slate-50/70 dark:from-slate-900/90 dark:to-indigo-950/20 border border-slate-200/80 dark:border-indigo-500/60 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 transition-all duration-300 shadow-[0_6px_0_0_rgba(99,102,241,0.18)] dark:shadow-[0_6px_0_0_rgba(99,102,241,0.6)] hover:-translate-y-1.5 hover:shadow-[0_10px_0_0_rgba(99,102,241,0.28)] dark:hover:shadow-[0_10px_0_0_rgba(99,102,241,0.75)] dark:hover:border-indigo-400 active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(99,102,241,0.2)] cursor-pointer group"
        >
          {/* Subtle Corner Glow Accent */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/25 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="relative shrink-0 w-16 h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            {/* Background Circle */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeWidth="4.5" fill="transparent" />
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                stroke="currentColor" 
                strokeWidth="4.5" 
                fill="transparent" 
                strokeDasharray={175} 
                strokeDashoffset={175 - (175 * completionRatio) / 100} 
                strokeLinecap="round"
                className="transition-all duration-500 ease-out text-indigo-500 dark:text-indigo-400"
              />
            </svg>
            <span className="text-sm font-bold font-mono text-indigo-650 dark:text-indigo-400">{completionRatio}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider font-mono">Workload Finished</p>
            <h4 className="text-sm lg:text-base font-extrabold text-slate-800 dark:text-white mt-0.5 truncate">{completedTasksCount} / {tasks.length} Completed</h4>
            <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 flex items-center gap-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
              View finished <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
            </p>
          </div>
        </button>

        {/* Due Today Card */}
        <button 
          onClick={() => onNavigate('tasks', { status: 'all', due: 'today', importance: 'all' })}
          className="w-full text-left bg-gradient-to-b from-white to-slate-50/70 dark:from-slate-900/90 dark:to-amber-950/20 border border-slate-200/80 dark:border-amber-500/60 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-[0_6px_0_0_rgba(245,158,11,0.18)] dark:shadow-[0_6px_0_0_rgba(245,158,11,0.6)] hover:-translate-y-1.5 hover:shadow-[0_10px_0_0_rgba(245,158,11,0.28)] dark:hover:shadow-[0_10px_0_0_rgba(245,158,11,0.75)] dark:hover:border-amber-400 active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(245,158,11,0.2)] cursor-pointer group"
        >
          {/* Subtle Corner Glow Accent */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 dark:bg-amber-500/25 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="min-w-0">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider font-mono">Due Today</p>
              <h3 className="text-xl lg:text-2xl font-black font-display text-slate-800 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                {dueToday.length} Tasks
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/45 rounded-xl border border-amber-200/40 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-4 flex items-center gap-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            View today's tasks <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
          </p>
        </button>

        {/* Overdue Card */}
        <button 
          onClick={() => onNavigate('tasks', { status: 'all', due: 'overdue', importance: 'all' })}
          className="w-full text-left bg-gradient-to-b from-white to-slate-50/70 dark:from-slate-900/90 dark:to-rose-950/20 border border-slate-200/80 dark:border-rose-500/60 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-[0_6px_0_0_rgba(244,63,94,0.18)] dark:shadow-[0_6px_0_0_rgba(244,63,94,0.6)] hover:-translate-y-1.5 hover:shadow-[0_10px_0_0_rgba(244,63,94,0.28)] dark:hover:shadow-[0_10px_0_0_rgba(244,63,94,0.75)] dark:hover:border-rose-400 active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(244,63,94,0.2)] cursor-pointer group"
        >
          {/* Subtle Corner Glow Accent */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/25 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="min-w-0">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider font-mono">Overdue Debt</p>
              <h3 className="text-xl lg:text-2xl font-black font-display text-slate-800 dark:text-white mt-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                {overdue.length} Tasks
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/45 rounded-xl border border-rose-200/40 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-4 flex items-center gap-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            View overdue tasks <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
          </p>
        </button>

        {/* Habit Streaks Gauge */}
        <button 
          onClick={() => onNavigate('goals')}
          className="w-full text-left bg-gradient-to-b from-white to-slate-50/70 dark:from-slate-900/90 dark:to-emerald-950/20 border border-slate-200/80 dark:border-emerald-500/60 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-[0_6px_0_0_rgba(16,185,129,0.18)] dark:shadow-[0_6px_0_0_rgba(16,185,129,0.6)] hover:-translate-y-1.5 hover:shadow-[0_10px_0_0_rgba(16,185,129,0.28)] dark:hover:shadow-[0_10px_0_0_rgba(16,185,129,0.75)] dark:hover:border-emerald-400 active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(16,185,129,0.2)] cursor-pointer group"
        >
          {/* Subtle Corner Glow Accent */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/25 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">Active Habits</p>
              <h3 className="text-xl lg:text-2xl font-black font-display text-slate-800 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                {goals.length} Tracked
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/45 rounded-xl border border-emerald-200/40 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-4 flex items-center gap-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Manage atomic habits <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
          </p>
        </button>

      </div>

      {/* Analytics Charts Component (Realistic interactive visuals) */}
      <AnalyticsCharts tasks={tasks} preferences={preferences} />

      {/* 3. Fast Quick-Add Interactive Command Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/15 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
        
        <form onSubmit={handleQuickAddSubmit} className="flex flex-col md:flex-row items-center gap-3.5">
          <div className="flex items-center gap-2 shrink-0">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-mono font-bold flex items-center gap-1">
              ⚡ Capture Task
            </span>
          </div>

          <div className="flex-1 w-full relative">
            <input 
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Instantly type task name (e.g. Code auth backend)..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
            {/* Quick date switches */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850 text-[10px] font-bold">
              <button 
                type="button" 
                onClick={() => setQuickDue('today')}
                className={`px-2 py-1 rounded-md transition-all ${quickDue === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Today
              </button>
              <button 
                type="button" 
                onClick={() => setQuickDue('tomorrow')}
                className={`px-2 py-1 rounded-md transition-all ${quickDue === 'tomorrow' ? 'bg-indigo-600 text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Tomorrow
              </button>
              <button 
                type="button" 
                onClick={() => setQuickDue('next_week')}
                className={`px-2 py-1 rounded-md transition-all ${quickDue === 'next_week' ? 'bg-indigo-600 text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Next Week
              </button>
            </div>

            {/* Quick importance switches */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850 text-[10px] font-bold uppercase">
              <button 
                type="button" 
                onClick={() => setQuickImportance('low')}
                className={`px-2 py-1 rounded-md transition-all ${quickImportance === 'low' ? 'bg-slate-200 dark:bg-slate-800 text-slate-850 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}
              >
                Low
              </button>
              <button 
                type="button" 
                onClick={() => setQuickImportance('medium')}
                className={`px-2 py-1 rounded-md transition-all ${quickImportance === 'medium' ? 'bg-amber-600/25 text-amber-300 border border-amber-500/10' : 'text-slate-600'}`}
              >
                Mid
              </button>
              <button 
                type="button" 
                onClick={() => setQuickImportance('high')}
                className={`px-2 py-1 rounded-md transition-all ${quickImportance === 'high' ? 'bg-red-600/35 text-rose-300 border border-rose-500/10' : 'text-slate-600'}`}
              >
                High
              </button>
            </div>

            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </form>
      </div>      {/* 4. Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left / Center Side: Focus Sequence Timeline & Habit Logging */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Timeline Agenda Preview Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Today's Ideal Time-Sequenced Agenda
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={onRegenerateSchedule}
                  disabled={scheduling}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${scheduling ? 'animate-spin' : ''}`} />
                  Plan Day
                </button>
                <button 
                  onClick={() => onNavigate('calendar')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-550 dark:hover:text-indigo-300 font-semibold flex items-center gap-0.5"
                >
                  Full View <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {scheduleSlots.length === 0 ? (
              <div className="py-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-center p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Your schedule isn't formulated yet.</p>
                <button 
                  onClick={onRegenerateSchedule}
                  className="mt-2.5 px-3.5 py-1.5 bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-650 hover:text-white rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 cursor-pointer transition-all"
                >
                  ⚡ Generate Optimal Timeline
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {scheduleSlots.slice(0, 4).map((slot, index) => {
                  const isBreak = slot.type === 'buffer' || slot.type === 'break';
                  return (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850/80 rounded-xl text-xs transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-850">
                          {formatHour(slot.startTime)}
                        </span>
                        <p className={`font-semibold ${isBreak ? 'text-slate-500 dark:text-slate-400 italic' : 'text-slate-800 dark:text-slate-100'}`}>
                          {slot.title}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                        isBreak ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500' : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-150 dark:border-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {slot.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Critical Priorities Queue */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                High-Impact Execution roadmap
              </h3>
              <button 
                onClick={() => onNavigate('tasks')}
                className="text-xs text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold flex items-center gap-0.5 transition-all"
              >
                Manage Task Pool <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {topPriorities.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">No active tasks found!</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Capture your assignments above to score priorities.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {topPriorities.map((task) => (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -15, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-700/60 rounded-xl transition-all flex items-center justify-between gap-4"
                    >
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                          {task.priorityScore !== undefined && (
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
                              Score: {task.priorityScore}
                            </span>
                          )}
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                            task.importance === 'high' ? 'bg-red-50 dark:bg-red-500/10 border-red-150 dark:border-red-500/10 text-rose-600 dark:text-rose-400' :
                            task.importance === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-150 dark:border-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {task.importance}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          Due: {task.dueDate.replace('T', ' ')} | Duration: {task.effortHours}h
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => onQuickComplete(task)}
                          className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-650/10 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                          title="Mark Complete"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => onNavigate('tasks')}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Proactive AI Alerts & Quick Habit Logging Loop */}
        <div className="space-y-6">
          
          {/* Rapid Habit Incrementor (Click and complete in 1-tap) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Quick-Log Atomic Habits
              </h3>
              <button 
                onClick={() => onNavigate('goals')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-550 dark:hover:text-emerald-300 font-semibold flex items-center gap-0.5"
              >
                Edit routines <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="py-6 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">No routines built yet.</p>
                <button 
                  onClick={() => onNavigate('goals')}
                  className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-450 hover:underline font-bold font-mono"
                >
                  + Add Routines
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {goals.map(goal => {
                  const isDone = goal.currentCount >= goal.targetCount;
                  return (
                    <div key={goal.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{goal.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-mono">
                          <span>Streak:</span>
                          <span className="text-amber-650 dark:text-amber-400 font-bold flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-current" /> {goal.streak}d
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onIncrementGoal(goal.id)}
                        disabled={isDone}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          isDone 
                            ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/10'
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3" /> : '+ Log'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coach Insight Proactive Alert Nudges */}
          <div className="bg-gradient-to-br from-indigo-50/25 to-white dark:from-indigo-950/10 dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-spin-slow" />
              Proactive Coach Nudges
            </h3>

            {recommendations.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">No risks detected by core analysis engine. Great job!</p>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 2).map((rec) => (
                  <div key={rec.id} className="p-3 bg-white dark:bg-slate-950/85 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1.5 shadow-sm">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                      {rec.title}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">{rec.content}</p>
                    
                    {rec.suggestedAction && (
                      <button
                        onClick={() => onNavigate('tasks')}
                        className="text-[10px] text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-bold tracking-wider uppercase flex items-center gap-0.5 cursor-pointer mt-1"
                      >
                        Resolve: {rec.suggestedAction} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
