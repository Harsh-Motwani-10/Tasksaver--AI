/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, SubTask, TaskFilters } from '../types';
import { 
  CheckSquare, Clock, Plus, Trash2, ArrowUpRight, 
  HelpCircle, AlertTriangle, Play, CheckCircle2, ChevronDown, 
  ChevronUp, Sparkles, AlertCircle, Flame, Filter, ArrowUpDown,
  Compass, ListTodo, Split, Eye, EyeOff, Calendar, Target
} from 'lucide-react';

interface TaskDashboardProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onPrioritizeAll: () => void;
  prioritizing: boolean;
  onAutonomousBreakdown: (goalText: string) => Promise<void>;
  breakdownLoading: boolean;
  filterState?: TaskFilters;
  onFilterStateChange?: (filters: TaskFilters) => void;
}

export default function TaskDashboard({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onPrioritizeAll,
  prioritizing,
  onAutonomousBreakdown,
  breakdownLoading,
  filterState,
  onFilterStateChange
}: TaskDashboardProps) {
  // Manual Task fields
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [effortHours, setEffortHours] = useState(2);
  const [importance, setImportance] = useState<Task['importance']>('medium');
  const [description, setDescription] = useState('');

  // Autonomous planning fields
  const [vagueGoal, setVagueGoal] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // New subtask text state map
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<'priority' | 'urgency' | 'effort' | 'title'>('priority');
  
  // Use parent state if provided, fallback to local state
  const [localImportance, setLocalImportance] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [localStatus, setLocalStatus] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [localDue, setLocalDue] = useState<'all' | 'today' | 'overdue'>('all');

  const filterImportance = filterState ? filterState.importance : localImportance;
  const filterStatus = filterState ? filterState.status : localStatus;
  const filterDue = filterState ? filterState.due : localDue;

  const setFilterImportance = (val: 'all' | 'high' | 'medium' | 'low') => {
    if (onFilterStateChange && filterState) {
      onFilterStateChange({ ...filterState, importance: val });
    } else {
      setLocalImportance(val);
    }
  };

  const setFilterStatus = (val: 'all' | 'todo' | 'in_progress' | 'completed') => {
    if (onFilterStateChange && filterState) {
      onFilterStateChange({ ...filterState, status: val });
    } else {
      setLocalStatus(val);
    }
  };

  const setFilterDue = (val: 'all' | 'today' | 'overdue') => {
    if (onFilterStateChange && filterState) {
      onFilterStateChange({ ...filterState, due: val });
    } else {
      setLocalDue(val);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const newTask: Task = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate,
      effortHours: Number(effortHours) || 1,
      importance,
      status: 'todo',
      progress: 0,
      subtasks: []
    };

    onAddTask(newTask);
    setTitle('');
    setDescription('');
    setDueDate('');
    setEffortHours(2);
  };

  const handleAutonomousSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vagueGoal.trim()) return;
    await onAutonomousBreakdown(vagueGoal.trim());
    setVagueGoal('');
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(st => {
      if (st.id === subtaskId) {
        return { ...st, completed: !st.completed };
      }
      return st;
    });

    // Recalculate progress
    const completedCount = updatedSubtasks.filter(st => st.completed).length;
    const progress = Math.round((completedCount / updatedSubtasks.length) * 100);

    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks,
      progress,
      status: progress === 100 ? 'completed' : task.status === 'completed' ? 'in_progress' : task.status
    });
  };

  const addManualSubtask = (taskId: string) => {
    const text = newSubtaskText[taskId]?.trim();
    if (!text) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSt: SubTask = {
      id: 'sub_' + Math.random().toString(36).substring(2, 9),
      title: text,
      completed: false
    };

    const updatedSubtasks = [...(task.subtasks || []), newSt];
    const completedCount = updatedSubtasks.filter(st => st.completed).length;
    const progress = Math.round((completedCount / updatedSubtasks.length) * 100);

    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks,
      progress
    });

    setNewSubtaskText({ ...newSubtaskText, [taskId]: '' });
  };

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    onUpdateTask({
      ...task,
      status,
      progress: status === 'completed' ? 100 : task.progress
    });
  };

  // Helper to toggle completed status quickly
  const handleQuickComplete = (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    onUpdateTask({
      ...task,
      status: nextStatus,
      progress: nextStatus === 'completed' ? 100 : 0,
      subtasks: task.subtasks?.map(st => ({ ...st, completed: nextStatus === 'completed' }))
    });
  };

  // Urgency & Countdown Calculator
  const getTaskUrgencyDetails = (task: Task) => {
    if (task.status === 'completed') {
      return { 
        label: 'Completed', 
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', 
        ring: 'border-slate-800 focus:border-slate-700 hover:border-slate-700/80',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      };
    }

    const dueTime = new Date(task.dueDate).getTime();
    const nowTime = new Date().getTime();
    const diffHours = (dueTime - nowTime) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { 
        label: 'Overdue!', 
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10 animate-pulse', 
        ring: 'border-rose-500/30 focus:border-rose-500 hover:border-rose-500/50',
        badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
      };
    } else if (diffHours <= 2) {
      return { 
        label: `Due in ${Math.round(diffHours * 60)}m`, 
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', 
        ring: 'border-rose-400/40 focus:border-rose-400 hover:border-rose-400/60',
        badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
      };
    } else if (diffHours <= 24) {
      const hrs = Math.round(diffHours);
      return { 
        label: `Due in ${hrs}h`, 
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', 
        ring: 'border-amber-500/30 focus:border-amber-500 hover:border-amber-500/50',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      };
    } else if (diffHours <= 72) {
      const days = Math.round(diffHours / 24);
      return { 
        label: `Due in ${days}d`, 
        color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5', 
        ring: 'border-indigo-500/20 focus:border-indigo-500 hover:border-indigo-500/40',
        badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      };
    }

    return { 
      label: 'On Track', 
      color: 'text-slate-400 border-slate-700/60 bg-slate-900/30', 
      ring: 'border-slate-800 focus:border-slate-700 hover:border-slate-750',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700/50'
    };
  };

  // 1. Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesImportance = filterImportance === 'all' || task.importance === filterImportance;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    
    let matchesDue = true;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (filterDue === 'today') {
      const dStr = task.dueDate.split('T')[0];
      matchesDue = dStr === todayStr;
    } else if (filterDue === 'overdue') {
      const d = new Date(task.dueDate);
      matchesDue = task.status !== 'completed' && d < now && task.dueDate.split('T')[0] !== todayStr;
    }

    return matchesImportance && matchesStatus && matchesDue;
  });

  // 2. Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      return (b.priorityScore || 0) - (a.priorityScore || 0);
    }
    if (sortBy === 'urgency') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === 'effort') {
      return b.effortHours - a.effortHours;
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Grid of Quick Controls and Create Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Vague Goal Autonomous Planning Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="autonomous-planning-box">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">Autonomous AI Goal Breakdown</h3>
              <p className="text-[11px] text-slate-500">Deconstruct any heavy or vague goal into a sequence of micro-tasks</p>
            </div>
          </div>

          <form onSubmit={handleAutonomousSubmit} className="space-y-4">
            <textarea
              value={vagueGoal}
              onChange={(e) => setVagueGoal(e.target.value)}
              placeholder="e.g. 'Study for calculus finals next Tuesday' or 'Prepare pitch deck for client review'"
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-slate-800 dark:text-white text-xs font-medium resize-none h-20 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
              required
            />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-semibold flex items-center gap-1.5 font-mono">
                ✨ Generates checklists & schedules automatically
              </span>
              <button
                type="submit"
                disabled={breakdownLoading}
                className="px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {breakdownLoading ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Planning...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Decompose Goal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Manual Task Addition */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl" id="manual-add-box">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/30 text-slate-550 dark:text-slate-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">Create Custom Task</h3>
              <p className="text-[11px] text-slate-550">Insert specific milestones or individual tasks manually</p>
            </div>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Title (e.g., Run Audit)"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/10 rounded-xl text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-650 transition-all"
                required
              />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/10 rounded-xl text-slate-800 dark:text-white text-xs font-medium transition-all"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl">
                <label className="text-[10px] text-slate-500 font-bold shrink-0 uppercase font-mono">Effort:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={effortHours}
                  onChange={(e) => setEffortHours(Number(e.target.value))}
                  className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-white text-xs font-mono font-bold text-center"
                />
                <span className="text-[11px] text-slate-500 shrink-0">hours</span>
              </div>

              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as Task['importance'])}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl text-slate-800 dark:text-white text-xs font-medium transition-all"
              >
                <option value="low">Low Impact</option>
                <option value="medium">Medium Impact</option>
                <option value="high">High Impact / Critical</option>
              </select>
            </div>

            <div className="flex justify-between items-center pt-1.5">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional task description or notes..."
                className="flex-1 mr-3 px-3 py-1.5 bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-white text-[11px] placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
              />
              <button
                type="submit"
                className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0 shadow-sm"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      </div>      {/* Main tasks rendering section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl" id="looming-tasks-container">
        
        {/* Header with AI Trigger */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-150 dark:border-slate-800 mb-5">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Focus Roadmap & Task Pool
            </h2>
            <p className="text-xs text-slate-500">Deconstruct details, structure milestones, and monitor due targets.</p>
          </div>

          <button
            onClick={onPrioritizeAll}
            disabled={prioritizing || tasks.length === 0}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-150 dark:border-indigo-500/20 disabled:opacity-50 hover:text-indigo-700 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shrink-0 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${prioritizing ? 'animate-spin' : ''}`} />
            Run Priority Scoring
          </button>
        </div>

        {/* Sort/Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850/80 mb-5 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Importance */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 flex items-center gap-1 font-medium"><Filter className="w-3.5 h-3.5" /> Impact:</span>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {(['all', 'high', 'medium', 'low'] as const).map(imp => (
                  <button
                    key={imp}
                    onClick={() => setFilterImportance(imp)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      filterImportance === imp 
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-250 dark:border-slate-700/50 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {imp}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Status:</span>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {(['all', 'todo', 'in_progress', 'completed'] as const).map(stat => (
                  <button
                    key={stat}
                    onClick={() => setFilterStatus(stat)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold capitalize transition-all cursor-pointer ${
                      filterStatus === stat 
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-250 dark:border-slate-700/50 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {stat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Timeline */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Timeline:</span>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {(['all', 'today', 'overdue'] as const).map(dueOpt => (
                  <button
                    key={dueOpt}
                    onClick={() => setFilterDue(dueOpt)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold capitalize transition-all cursor-pointer ${
                      filterDue === dueOpt 
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-250 dark:border-slate-700/50 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {dueOpt === 'all' ? 'All Time' : dueOpt === 'today' ? 'Due Today' : 'Overdue'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1 font-medium"><ArrowUpDown className="w-3.5 h-3.5" /> Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:outline-none text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              <option value="priority">Priority Score</option>
              <option value="urgency">Urgency (Due Date)</option>
              <option value="effort">Effort Hours</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="py-20 text-center bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-2xl p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">No matching tasks found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {tasks.length === 0 
                ? "Your workspace is fully pristine! Add tasks manually or trigger a generative micro-breakdown with AI."
                : "Adjust your filter tags to locate your saved roadmap tasks."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {sortedTasks.map((task) => {
                const urgency = getTaskUrgencyDetails(task);
                const isExpanded = expandedTaskId === task.id;

                return (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -15, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className={`bg-white dark:bg-slate-950 border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md ${urgency.ring}`}
                  >
                  {/* Task Card Header Area */}
                  <div className="p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-bold text-sm tracking-tight transition-colors ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                          {task.title}
                        </span>
                        
                        {/* Priority Badge */}
                        {task.priorityScore !== undefined && (
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold font-mono px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400 fill-current animate-pulse" />
                            AI Score: {task.priorityScore}
                          </span>
                        )}

                        {/* Urgency countdown Pill */}
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${urgency.color}`}>
                          {urgency.label}
                        </span>

                        {/* Category Label if present */}
                        {task.category && (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 font-mono px-2 py-0.5 rounded-lg uppercase">
                            {task.category}
                          </span>
                        )}
                      </div>

                      {/* Metadata row */}
                      <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                          Due: <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">{task.dueDate.replace('T', ' ')}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                          Effort: <span className="text-slate-600 dark:text-slate-400 font-semibold">{task.effortHours}h</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className={`capitalize font-semibold ${
                          task.importance === 'high' ? 'text-rose-600 dark:text-rose-400/80' : 
                          task.importance === 'medium' ? 'text-amber-600 dark:text-amber-400/80' : 
                          'text-slate-500'
                        }`}>
                          {task.importance} Impact
                        </span>
                      </p>
                      
                      {task.priorityReason && (
                        <p className="text-[11px] text-indigo-800 dark:text-indigo-300/80 mt-2 font-medium bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/10 px-3 py-1.5 rounded-xl italic">
                          💡 Coach Reason: {task.priorityReason}
                        </p>
                      )}
                    </div>

                    {/* Quick Action Controls */}
                    <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-900">
                      {/* Checkbox Quick Complete */}
                      <button
                        onClick={() => handleQuickComplete(task)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          task.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title={task.status === 'completed' ? "Mark as incomplete" : "Mark completed"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Status select dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 p-2 focus:outline-none cursor-pointer"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      {/* Breakdown with AI Trigger */}
                      <button
                        onClick={() => onAutonomousBreakdown(`Decompose: ${task.title}`)}
                        disabled={breakdownLoading}
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-xl cursor-pointer"
                        title="Deconstruct with AI Planner"
                      >
                        <Split className="w-4 h-4" />
                      </button>

                      {/* Show/Hide details toggle */}
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                          isExpanded 
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            <span className="hidden sm:inline">Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Details</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-500/15 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-850 hover:border-rose-200 dark:hover:border-rose-500/25 rounded-xl cursor-pointer transition-all"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Task Checklist & Notes Details (Expandable) */}
                  {isExpanded && (
                    <div className="border-t border-slate-150 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/40 p-4.5 space-y-4">
                      {task.description && (
                        <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Context & Description</p>
                          {task.description}
                        </div>
                      )}

                      {/* Checklist */}
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 font-mono">Checklist Steps</h5>
                        {(!task.subtasks || task.subtasks.length === 0) ? (
                          <p className="text-xs text-slate-500 italic">No milestone steps mapped. Map them below to track exact completion ratios.</p>
                        ) : (
                          <div className="space-y-2 mb-3.5">
                            {task.subtasks.map((st) => (
                              <label 
                                key={st.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all ${
                                  st.completed ? 'opacity-50 line-through text-slate-400 dark:text-slate-500' : 'text-slate-705 dark:text-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => toggleSubtask(task.id, st.id)}
                                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 h-4 w-4"
                                />
                                <span className="font-medium">{st.title}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Progress Bar */}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-550 font-semibold mb-3.5 font-mono">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-850">
                              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${task.progress || 0}%` }} />
                            </div>
                            <span>{task.progress || 0}% Complete</span>
                          </div>
                        )}

                        {/* Add milestone step manually */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSubtaskText[task.id] || ''}
                            onChange={(e) => setNewSubtaskText({ ...newSubtaskText, [task.id]: e.target.value })}
                            placeholder="Map a specific subtask or checkpoint..."
                            className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 focus:outline-none rounded-xl text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => addManualSubtask(task.id)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            + Step
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
