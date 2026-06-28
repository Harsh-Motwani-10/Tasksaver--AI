/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Onboarding from './components/Onboarding';
import TaskDashboard from './components/TaskDashboard';
import Recommendations from './components/Recommendations';
import CalendarView from './components/CalendarView';
import GoalsTracker from './components/GoalsTracker';
import AIChatVoice from './components/AIChatVoice';
import DashboardView from './components/DashboardView';
import ConfettiCanvas from './components/ConfettiCanvas';
import { UserPreferences, Task, Goal, ScheduleSlot, AIRecommendation, SubTask, TaskFilters } from './types';
import { 
  Sparkles, RefreshCw, LogOut, Clock, Target, Volume2, 
  User, CheckSquare, Calendar, Zap, AlertTriangle, LayoutDashboard, 
  ListTodo, Settings, Menu, X, Shield, Activity, Sun, Moon
} from 'lucide-react';

export default function App() {
  // 1. Core State
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('tasksaver_prefs');
    return saved ? JSON.parse(saved) : {
      name: '',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      availableHoursPerDay: 6,
      productivityPattern: 'morning_focus',
      onboarded: false
    };
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasksaver_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('tasksaver_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>(() => {
    const saved = localStorage.getItem('tasksaver_slots');
    return saved ? JSON.parse(saved) : [];
  });

  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(() => {
    const saved = localStorage.getItem('tasksaver_recs');
    return saved ? JSON.parse(saved) : [];
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('tasksaver_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('tasksaver_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [geminiActive, setGeminiActive] = useState<boolean | null>(null);
  const [apiQuotaExceeded, setApiQuotaExceeded] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  // Check Gemini API Availability on load
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          setGeminiActive(data.geminiActive);
        }
      } catch (err) {
        console.error("Failed to query API status:", err);
      }
    };
    checkStatus();
  }, []);

  // UI / Navigation state
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'tasks' | 'calendar' | 'goals' | 'ai_assistant' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Shared task filtering state
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    status: 'all',
    due: 'all',
    importance: 'all',
  });

  // Settings form states
  const [settingsName, setSettingsName] = useState(preferences.name);
  const [settingsStart, setSettingsStart] = useState(preferences.workingHoursStart);
  const [settingsEnd, setSettingsEnd] = useState(preferences.workingHoursEnd);
  const [settingsHours, setSettingsHours] = useState(preferences.availableHoursPerDay);
  const [settingsPattern, setSettingsPattern] = useState(preferences.productivityPattern);

  // Loading / system states
  const [prioritizing, setPrioritizing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('tasksaver_prefs', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem('tasksaver_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tasksaver_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('tasksaver_slots', JSON.stringify(scheduleSlots));
  }, [scheduleSlots]);

  useEffect(() => {
    localStorage.setItem('tasksaver_recs', JSON.stringify(recommendations));
  }, [recommendations]);

  // Sync settings fields on preference change
  useEffect(() => {
    setSettingsName(preferences.name);
    setSettingsStart(preferences.workingHoursStart);
    setSettingsEnd(preferences.workingHoursEnd);
    setSettingsHours(preferences.availableHoursPerDay);
    setSettingsPattern(preferences.productivityPattern);
  }, [preferences]);

  // Handle initial auto-triggers once user is onboarded
  useEffect(() => {
    if (preferences.onboarded && tasks.length > 0 && recommendations.length === 0) {
      triggerRecommendationsAndPriorities();
    }
  }, [preferences.onboarded]);

  const triggerRecommendationsAndPriorities = async (tasksToUse?: Task[]) => {
    if (!preferences.onboarded) return;
    setErrorText(null);
    setRecsLoading(true);
    setPrioritizing(true);

    const activeTasks = tasksToUse || tasksRef.current;

    try {
      // 1. Prioritize Tasks
      const prioritizeResponse = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: activeTasks, preferences })
      });

      if (prioritizeResponse.ok) {
        const prioritizeData = await prioritizeResponse.json();
        if (prioritizeData.quotaExceeded || prioritizeData.apiError) {
          setApiQuotaExceeded(true);
          if (prioritizeData.errorMessage) {
            setApiErrorMessage(prioritizeData.errorMessage);
          }
        }
        if (prioritizeData.tasks) {
          setTasks(prev => prev.map(t => {
            const prioritized = prioritizeData.tasks.find((pt: any) => pt.id === t.id);
            if (prioritized) {
              return {
                ...t,
                priorityScore: prioritized.priorityScore,
                priorityReason: prioritized.priorityReason
              };
            }
            return t;
          }));
        }
      }

      // 2. Recommendations & Context-Aware Reminders
      const recsResponse = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: activeTasks, goals, preferences })
      });

      if (recsResponse.ok) {
        const recsData = await recsResponse.json();
        if (recsData.quotaExceeded || recsData.apiError) {
          setApiQuotaExceeded(true);
          if (recsData.errorMessage) {
            setApiErrorMessage(recsData.errorMessage);
          }
        }
        if (recsData.recommendations) {
          setRecommendations(recsData.recommendations);
        }
      }

    } catch (err: any) {
      console.error(err);
      setErrorText("API request failed. Ensure your GEMINI_API_KEY environment variable is declared inside Settings > Secrets!");
    } finally {
      setRecsLoading(false);
      setPrioritizing(false);
    }
  };

  const handleOnboardingComplete = (prefs: UserPreferences, initialTasks: Task[], initialGoals: Goal[]) => {
    setPreferences(prefs);
    setTasks(initialTasks);
    setGoals(initialGoals);
  };

  // Task Handlers
  const handleAddTask = (task: Task) => {
    const updated = [task, ...tasksRef.current];
    setTasks(updated);
    triggerRecommendationsAndPriorities(updated);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const prevTask = tasksRef.current.find(t => t.id === updatedTask.id);
    if (prevTask && prevTask.status !== 'completed' && updatedTask.status === 'completed') {
      setConfettiTrigger(prev => prev + 1);
    }
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleQuickComplete = (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updatedTask: Task = {
      ...task,
      status: nextStatus,
      progress: nextStatus === 'completed' ? 100 : 0,
      subtasks: task.subtasks?.map(st => ({ ...st, completed: nextStatus === 'completed' }))
    };
    handleUpdateTask(updatedTask);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setScheduleSlots(prev => prev.filter(slot => slot.taskId !== id));
  };

  const handlePrioritizeAll = async () => {
    const activeTasks = tasksRef.current;
    if (activeTasks.length === 0) return;
    setPrioritizing(true);
    setErrorText(null);
    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: activeTasks, preferences })
      });

      if (!response.ok) {
        throw new Error('Prioritization service unavailable');
      }

      const data = await response.json();
      if (data.quotaExceeded || data.apiError) {
        setApiQuotaExceeded(true);
        if (data.errorMessage) {
          setApiErrorMessage(data.errorMessage);
        }
      }
      if (data.tasks) {
        setTasks(prev => prev.map(t => {
          const prioritized = data.tasks.find((pt: any) => pt.id === t.id);
          if (prioritized) {
            return {
              ...t,
              priorityScore: prioritized.priorityScore,
              priorityReason: prioritized.priorityReason
            };
          }
          return t;
        }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Prioritize request failed. Configure your GEMINI_API_KEY inside Settings > Secrets!");
    } finally {
      setPrioritizing(false);
    }
  };

  // Autonomous Task Planning and Breakdown Handler
  const handleAutonomousBreakdown = async (goalText: string) => {
    setBreakdownLoading(true);
    setErrorText(null);
    try {
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalText })
      });

      if (!response.ok) {
        throw new Error('Breakdown planner unavailable');
      }

      const data = await response.json();
      if (data.quotaExceeded || data.apiError) {
        setApiQuotaExceeded(true);
        if (data.errorMessage) {
          setApiErrorMessage(data.errorMessage);
        }
      }
      if (data.tasks && Array.isArray(data.tasks)) {
        const today = new Date();
        const createdTasks: Task[] = data.tasks.map((dt: any, index: number) => {
          const dueOffset = new Date();
          dueOffset.setDate(today.getDate() + (index + 1));
          
          const taskSubtasks: SubTask[] = (dt.subtasks || []).map((title: string) => ({
            id: 'sub_' + Math.random().toString(36).substring(2, 9),
            title,
            completed: false
          }));

          return {
            id: 'task_' + Math.random().toString(36).substring(2, 9),
            title: dt.title,
            description: dt.description,
            dueDate: dueOffset.toISOString().split('T')[0] + 'T18:00',
            effortHours: dt.effortHours || 2,
            importance: dt.importance || 'medium',
            status: 'todo',
            progress: 0,
            subtasks: taskSubtasks,
            category: 'Autonomous Plan'
          };
        });

        const updatedTasksList = [...createdTasks, ...tasksRef.current];
        setTasks(updatedTasksList);
        triggerRecommendationsAndPriorities(updatedTasksList);
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Goal autonomous breakdown failed. Set GEMINI_API_KEY to proceed!");
    } finally {
      setBreakdownLoading(false);
    }
  };

  // AI-Powered Daily/Weekly Scheduling Handler
  const handleRegenerateSchedule = async () => {
    setScheduling(true);
    setErrorText(null);
    try {
      const response = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasksRef.current.filter(t => t.status !== 'completed'),
          preferences,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Scheduling builder offline');
      }

      const data = await response.json();
      if (data.quotaExceeded) {
        setApiQuotaExceeded(true);
      }
      if (data.scheduleSlots) {
        setScheduleSlots(data.scheduleSlots);
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Schedule creation failed. Set GEMINI_API_KEY in Secrets!");
    } finally {
      setScheduling(false);
    }
  };

  // Goal and Habit Handlers
  const handleAddGoal = (goal: Goal) => {
    setGoals(prev => [goal, ...prev]);
  };

  const handleIncrementGoal = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const nextCount = g.currentCount + 1;
        const targetReached = nextCount >= g.targetCount;
        let nextStreak = g.streak;

        if (targetReached) {
          nextStreak += 1;
        }

        return {
          ...g,
          currentCount: nextCount,
          streak: nextStreak,
          lastCompletedDate: targetReached ? new Date().toISOString().split('T')[0] : g.lastCompletedDate
        };
      }
      return g;
    }));
  };

  const handleResetGoal = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        return {
          ...g,
          currentCount: 0
        };
      }
      return g;
    }));
  };

  // Recommendation specific action triggered from Recommendation item
  const handleRecommendationAction = async (rec: AIRecommendation) => {
    if (rec.type === 'breakdown' && rec.taskId) {
      const task = tasksRef.current.find(t => t.id === rec.taskId);
      if (task) {
        await handleAutonomousBreakdown(`Break down and schedule milestones for this task: ${task.title}`);
      }
    } else if (rec.type === 'prioritization') {
      await handlePrioritizeAll();
    } else {
      await handleRegenerateSchedule();
    }
  };

  const handleResetPreferences = () => {
    if (confirm("Reset application sandbox data? This clears your stored tasks, habits, and schedules.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Save changes to settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPrefs: UserPreferences = {
      ...preferences,
      name: settingsName.trim() || 'Achiever',
      workingHoursStart: settingsStart,
      workingHoursEnd: settingsEnd,
      availableHoursPerDay: Number(settingsHours),
      productivityPattern: settingsPattern
    };
    setPreferences(updatedPrefs);
    alert('Settings saved successfully!');
  };

  // Navigation Click Handler
  const handleNavClick = (section: typeof currentSection, filters?: Partial<TaskFilters>) => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
    if (filters) {
      setTaskFilters(prev => ({
        ...prev,
        ...filters
      }));
    } else if (section === 'tasks') {
      // If user clicked Tasks tab directly without explicit filters, let's reset filters so they see everything
      setTaskFilters({
        status: 'all',
        due: 'all',
        importance: 'all'
      });
    }
  };

  // Render Section Routing
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <DashboardView
            tasks={tasks}
            goals={goals}
            recommendations={recommendations}
            preferences={preferences}
            scheduleSlots={scheduleSlots}
            scheduling={scheduling}
            onNavigate={handleNavClick}
            onPrioritize={handlePrioritizeAll}
            onAutonomousBreakdown={handleAutonomousBreakdown}
            onAddTask={handleAddTask}
            onIncrementGoal={handleIncrementGoal}
            onQuickComplete={handleQuickComplete}
            onRegenerateSchedule={handleRegenerateSchedule}
            prioritizing={prioritizing}
          />
        );
      case 'tasks':
        return (
          <TaskDashboard
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onPrioritizeAll={handlePrioritizeAll}
            prioritizing={prioritizing}
            onAutonomousBreakdown={handleAutonomousBreakdown}
            breakdownLoading={breakdownLoading}
            filterState={taskFilters}
            onFilterStateChange={setTaskFilters}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            slots={scheduleSlots}
            tasks={tasks}
            loading={scheduling}
            onRegenerateSchedule={handleRegenerateSchedule}
          />
        );
      case 'goals':
        return (
          <GoalsTracker
            goals={goals}
            onAddGoal={handleAddGoal}
            onIncrementGoal={handleIncrementGoal}
            onResetGoal={handleResetGoal}
          />
        );
      case 'ai_assistant':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <AIChatVoice
                tasks={tasks}
                goals={goals}
                preferences={preferences}
                onAddTask={handleAddTask}
                onViewSchedule={handleRegenerateSchedule}
              />
            </div>
            <div>
              <Recommendations
                recommendations={recommendations}
                loading={recsLoading}
                onRefresh={triggerRecommendationsAndPriorities}
                onAction={handleRecommendationAction}
              />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-bold font-display text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Productivity Engine Preferences
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">My Display Name</label>
                <input 
                  type="text" 
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Working Windows</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      value={settingsStart}
                      onChange={(e) => setSettingsStart(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                    />
                    <span className="text-slate-600 text-xs font-mono">to</span>
                    <input 
                      type="time" 
                      value={settingsEnd}
                      onChange={(e) => setSettingsEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Focus Limit Per Day</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1" 
                      max="24"
                      value={settingsHours}
                      onChange={(e) => setSettingsHours(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-xs font-bold font-mono"
                    />
                    <span className="absolute right-4 top-3 text-slate-600 text-xs font-mono">hours</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Cognitive Pattern</label>
                <select
                  value={settingsPattern}
                  onChange={(e) => setSettingsPattern(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold"
                >
                  <option value="morning_focus">Morning Focus (Highest early dawn energy)</option>
                  <option value="night_owl">Night Owl (Consistent late night stamina)</option>
                  <option value="afternoon_spurt">Afternoon Spurt (Rapid afternoon focus bursts)</option>
                  <option value="steady_pace">Steady Pace (Equally distributed stamina across the day)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={handleResetPreferences}
                  className="px-4.5 py-2.5 bg-transparent border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/5 text-rose-400 rounded-xl text-xs font-semibold cursor-pointer transition-all w-full sm:w-auto"
                >
                  Reset Sandbox Data
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all w-full sm:w-auto cursor-pointer"
                >
                  Save Engine Settings
                </button>
              </div>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  // Onboarding gate
  if (!preferences.onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Navigation Items definitions
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks' as const, label: 'Roadmap Tasks', icon: ListTodo },
    { id: 'calendar' as const, label: 'AI Day-Planner', icon: Calendar },
    { id: 'goals' as const, label: 'Atomic Habits', icon: Target },
    { id: 'ai_assistant' as const, label: 'AI Coach Hub', icon: Sparkles },
    { id: 'settings' as const, label: 'Engine Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-300">
      <ConfettiCanvas trigger={confettiTrigger} />
      
      {/* Decorative Blur Background Highlights */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* 1. Sidebar Left (Hidden on Mobile, persistent on Tab and Desktop) */}
      <aside className="hidden md:flex flex-col md:w-48 lg:w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 shrink-0 relative z-30 transition-all duration-300">
        {/* Title Logo */}
        <div className="p-4 lg:p-6 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between gap-1">
          <div className="flex items-center gap-2 lg:gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm lg:text-base font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                TaskSaver AI
              </h1>
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider mt-0.5 block w-fit">
                Proactive
              </span>
            </div>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50/50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-indigo-900/50 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm shrink-0"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500 animate-[spin_20s_linear_infinite]" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 lg:px-4 py-4 lg:py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-950/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile indicator */}
        <div className="p-3 lg:p-4 border-t border-slate-200 dark:border-slate-850">
          <div className="flex items-center gap-2 lg:gap-3 p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
              {preferences.name ? preferences.name[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{preferences.name}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                geminiActive 
                  ? 'text-emerald-500 dark:text-emerald-400' 
                  : 'text-amber-500 dark:text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  geminiActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                }`} />
                {geminiActive ? 'Gemini AI Mode' : 'Sandbox Mode'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Header Navbar with Navigation Tabs at top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-850 transition-colors duration-300 flex flex-col">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white font-display">TaskSaver AI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-sm"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation options displayed directly on the top bar */}
        <div className="border-t border-slate-100 dark:border-slate-850/60 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth flex">
          <div className="flex items-center gap-1.5 px-4 py-2 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 4. Main Body Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Global System Warnings */}
          {errorText && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-bold text-rose-250">System Notice</p>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">{errorText}</p>
              </div>
            </div>
          )}

          {/* Gemini API Status Info Bar */}
          {apiQuotaExceeded ? (
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3 text-xs text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-450 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-bold text-amber-250">
                  {apiErrorMessage?.toLowerCase().includes("503") || apiErrorMessage?.toLowerCase().includes("unavailable") || apiErrorMessage?.toLowerCase().includes("demand")
                    ? "Gemini AI Service Busy (Simulation Fallback Active)"
                    : "Gemini AI Rate Limit Reached (Simulation Fallback Active)"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                  {apiErrorMessage?.toLowerCase().includes("503") || apiErrorMessage?.toLowerCase().includes("unavailable") || apiErrorMessage?.toLowerCase().includes("demand")
                    ? "The Gemini model is currently experiencing high demand. To ensure your workflow remains completely uninterrupted, TaskSaver AI has seamlessly fallen back to our local optimized Sandbox Mode simulation rules."
                    : "Your Gemini API key has exceeded its free-tier quota limits. To ensure your workflow remains completely uninterrupted, TaskSaver AI has seamlessly fallen back to our local optimized Sandbox Mode simulation rules."}
                  {' '}All task breakdowns, scheduling models, priorities, and recommendations will continue to generate and work perfectly!
                </p>
              </div>
            </div>
          ) : geminiActive === false && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3 text-xs text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-450 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-bold text-amber-250">Interactive Sandbox Active</p>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                  Proactive task coach is currently running on our local optimized simulation ruleset. 
                  Configure your <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[10px]">GEMINI_API_KEY</code> inside <strong className="text-slate-200">Settings &gt; Secrets</strong> to transition smoothly to live cognitive reasoning.
                </p>
              </div>
            </div>
          )}

          {/* Render Route Section */}
          {renderCurrentSection()}

        </main>

        {/* Footer info */}
        <footer className="border-t border-slate-850 bg-slate-900/10 py-5 text-center text-[10px] text-slate-500">
          <p>© 2026 TaskSaver AI. Underpinned by Gemini context analysis modules. All rights reserved.</p>
        </footer>
      </div>

    </div>
  );
}
