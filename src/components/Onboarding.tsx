/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPreferences, Task, Goal } from '../types';
import { Sparkles, Clock, Calendar, CheckSquare, Target, Moon, Sun, Flame, Sparkle, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: (prefs: UserPreferences, initialTasks: Task[], initialGoals: Goal[]) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [availableHours, setAvailableHours] = useState(6);
  const [pattern, setPattern] = useState<UserPreferences['productivityPattern']>('morning_focus');
  
  // Tasks list
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskEffort, setTaskEffort] = useState(2);
  const [taskImportance, setTaskImportance] = useState<Task['importance']>('medium');
  const [initialTasks, setInitialTasks] = useState<Task[]>([]);

  // Goal list
  const [goalTitle, setGoalTitle] = useState('');
  const [goalFreq, setGoalFreq] = useState<Goal['frequency']>('daily');
  const [initialGoals, setInitialGoals] = useState<Goal[]>([]);

  const addOnboardingTask = () => {
    if (!taskTitle || !taskDue) return;
    const newTask: Task = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      title: taskTitle.trim(),
      dueDate: taskDue,
      effortHours: Number(taskEffort),
      importance: taskImportance,
      status: 'todo',
      progress: 0,
      subtasks: []
    };
    setInitialTasks([...initialTasks, newTask]);
    setTaskTitle('');
    setTaskDue('');
    setTaskEffort(2);
  };

  const addOnboardingGoal = () => {
    if (!goalTitle) return;
    const newGoal: Goal = {
      id: 'goal_' + Math.random().toString(36).substring(2, 9),
      title: goalTitle.trim(),
      frequency: goalFreq,
      targetCount: 1,
      currentCount: 0,
      streak: 0,
      history: {}
    };
    setInitialGoals([...initialGoals, newGoal]);
    setGoalTitle('');
  };

  const handleFinish = () => {
    const finalPrefs: UserPreferences = {
      name: name.trim() || 'Productive Buddy',
      workingHoursStart,
      workingHoursEnd,
      availableHoursPerDay: Number(availableHours),
      productivityPattern: pattern,
      onboarded: true
    };
    onComplete(finalPrefs, initialTasks, initialGoals);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-650/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md"
        id="onboarding-card"
      >
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <span 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-indigo-550 dark:bg-indigo-500' : s < step ? 'w-2 bg-indigo-550/40 dark:bg-indigo-500/40' : 'w-2 bg-slate-200 dark:bg-slate-850'
                }`} 
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase tracking-wider">Step {step} of 3</span>
        </div>

        {step === 1 && (
          <div id="onboarding-step-1" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-600/10 rounded-2xl text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">TaskSaver AI</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">The Proactive Anti-Procrastination Assistant</p>
              </div>
            </div>
            
            <p className="text-slate-650 dark:text-slate-300 text-sm leading-relaxed">
              Welcome to your personal productivity space. TaskSaver AI actively designs action sequences, auto-schedules restorative breaks, and decomposes vague targets so you never miss a deadline.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">What is your name?</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-405 dark:placeholder:text-slate-700 text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">Primary Working Hours</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      value={workingHoursStart}
                      onChange={(e) => setWorkingHoursStart(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-xs font-medium font-mono"
                    />
                    <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">to</span>
                    <input 
                      type="time" 
                      value={workingHoursEnd}
                      onChange={(e) => setWorkingHoursEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 text-xs font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">Available Focus Hours / Day</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1" 
                      max="24"
                      value={availableHours}
                      onChange={(e) => setAvailableHours(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-white font-bold text-xs font-mono"
                    />
                    <span className="absolute right-4 top-3 text-slate-400 dark:text-slate-650 text-xs font-mono">hours</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 font-mono">When is your cognitive energy highest?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPattern('morning_focus')}
                    className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      pattern === 'morning_focus' 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-slate-900 dark:text-white ring-1 ring-indigo-500' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Morning Focus</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Highly structured morning spurts</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPattern('night_owl')}
                    className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      pattern === 'night_owl' 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-slate-900 dark:text-white ring-1 ring-indigo-500' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-indigo-650 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Night Owl</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">High-energy evening blocks</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPattern('afternoon_spurt')}
                    className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      pattern === 'afternoon_spurt' 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-slate-900 dark:text-white ring-1 ring-indigo-500' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Afternoon Spurt</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Afternoon focus intensity</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPattern('steady_pace')}
                    className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      pattern === 'steady_pace' 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-slate-900 dark:text-white ring-1 ring-indigo-500' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Steady Pace</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Consistent focus energy targets</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xl shadow-indigo-650/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                Let's map deadlines <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div id="onboarding-step-2" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Deadlines & Looming Obligations</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">AI scheduling works best when it understands what blocks you face</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                <Sparkle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Input your first deadline
              </p>
              <div>
                <input 
                  type="text" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Physics Lab Assignment 3, Study Math"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">Due Date</label>
                  <input 
                    type="datetime-local" 
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="w-full px-2.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">Effort (Hours)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={taskEffort}
                    onChange={(e) => setTaskEffort(Number(e.target.value))}
                    className="w-full px-2.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">Impact</label>
                  <select
                    value={taskImportance}
                    onChange={(e) => setTaskImportance(e.target.value as Task['importance'])}
                    className="w-full px-2.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="low">Low Impact</option>
                    <option value="medium">Medium Impact</option>
                    <option value="high">High Impact</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={addOnboardingTask}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-semibold text-xs border border-indigo-150 dark:border-indigo-500/20 rounded-xl transition-all cursor-pointer"
                >
                  + Add To Queue
                </button>
              </div>
            </div>

            {initialTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Deadlines Saved ({initialTasks.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {initialTasks.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 text-xs">
                      <div className="truncate pr-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Due: {t.dueDate.replace('T', ' ')} | Effort: {t.effortHours}h
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase font-mono ${
                        t.importance === 'high' ? 'bg-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' :
                        t.importance === 'medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {t.importance}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-semibold hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xl shadow-indigo-650/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div id="onboarding-step-3" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">Daily Habits & Micro Streaks</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">Atomic habits build discipline blocks over time</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                <Sparkle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Set up routine builder
              </p>
              <div>
                <input 
                  type="text" 
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Plan Next-Day, Code 30 minutes, Drink Water"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-650"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-500 uppercase tracking-wider mb-1 font-mono">Frequency</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGoalFreq('daily')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        goalFreq === 'daily' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-450 ring-1 ring-emerald-500' 
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450'
                      }`}
                    >
                      Daily Loop
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalFreq('weekly')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        goalFreq === 'weekly' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-450 ring-1 ring-emerald-500' 
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450'
                      }`}
                    >
                      Weekly Challenge
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addOnboardingGoal}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 font-semibold text-xs border border-emerald-150 dark:border-emerald-500/20 rounded-xl transition-all cursor-pointer"
                >
                  + Track Habit
                </button>
              </div>
            </div>

            {initialGoals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 font-mono">Routines Configured ({initialGoals.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {initialGoals.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{g.title}</p>
                      <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase font-mono">
                        {g.frequency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-semibold hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-550 hover:to-indigo-400 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xl shadow-indigo-650/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                Go to Dashboard <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
