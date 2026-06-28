/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Goal } from '../types';
import { Target, Flame, Check, Plus, RefreshCw, Trophy, Sparkles, TrendingUp, Calendar } from 'lucide-react';

interface GoalsTrackerProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onIncrementGoal: (id: string) => void;
  onResetGoal: (id: string) => void;
}

export default function GoalsTracker({ goals, onAddGoal, onIncrementGoal, onResetGoal }: GoalsTrackerProps) {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalFreq, setNewGoalFreq] = useState<'daily' | 'weekly'>('daily');
  const [newGoalTarget, setNewGoalTarget] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newGoal: Goal = {
      id: 'goal_' + Math.random().toString(36).substring(2, 9),
      title: newGoalTitle.trim(),
      frequency: newGoalFreq,
      targetCount: Number(newGoalTarget) || 1,
      currentCount: 0,
      streak: 0,
      history: {}
    };

    onAddGoal(newGoal);
    setNewGoalTitle('');
    setNewGoalTarget(1);
    setShowForm(false);
  };

  // Quick preset habits for high-energy productivity builders
  const presets = [
    { title: 'Study 1 Hr / Day', freq: 'daily', target: 1 },
    { title: 'Prep Next Day Schedule', freq: 'daily', target: 1 },
    { title: 'Read Documentation', freq: 'weekly', target: 2 },
    { title: 'Review Weak Topics', freq: 'weekly', target: 1 },
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    const newGoal: Goal = {
      id: 'goal_' + Math.random().toString(36).substring(2, 9),
      title: preset.title,
      frequency: preset.freq as 'daily' | 'weekly',
      targetCount: preset.target,
      currentCount: 0,
      streak: 0,
      history: {}
    };
    onAddGoal(newGoal);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="streak-goals-panel">
      {/* Visual background sparkle */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-800 mb-5">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            Habit Builder & Streak Lock
          </h2>
          <p className="text-xs text-slate-500">Build atomic routines to offset procrastination cycles</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Habit'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Habit Objective Name</label>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="e.g. Code for 1 hour"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Frequency</label>
              <select
                value={newGoalFreq}
                onChange={(e) => setNewGoalFreq(e.target.value as 'daily' | 'weekly')}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl text-slate-800 dark:text-white text-xs font-medium"
              >
                <option value="daily">Daily Loop</option>
                <option value="weekly">Weekly Target</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Target Cycles</label>
              <input
                type="number"
                min="1"
                max="20"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl text-slate-800 dark:text-white text-xs font-medium font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            Activate Goal
          </button>
        </form>
      )}

      {/* Core Goals List */}
      {goals.length === 0 ? (
        <div className="py-6 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-xl text-center p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">No habits active yet. Install one of our presets:</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-[10px] font-semibold transition-all cursor-pointer rounded-lg"
              >
                + {preset.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {goals.map((goal) => {
            const isCompleted = goal.currentCount >= goal.targetCount;
            const percentage = Math.min(100, (goal.currentCount / goal.targetCount) * 100);

            return (
              <div key={goal.id} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl transition-all relative overflow-hidden">
                
                {/* Header info */}
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2">
                      {goal.title}
                      {isCompleted && (
                        <span className="p-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium font-mono capitalize block mt-0.5">
                      {goal.frequency} goal loop
                    </span>
                  </div>

                  {/* Flame Streak Indicator */}
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono">
                    <Flame className={`w-3.5 h-3.5 ${goal.streak > 0 ? 'animate-bounce' : ''}`} />
                    {goal.streak} days
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full relative overflow-hidden mb-3.5 border border-slate-200 dark:border-slate-850">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Counter & Action Box */}
                <div className="flex justify-between items-center">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-mono">
                    Progress: <span className="text-slate-800 dark:text-slate-200 font-bold">{goal.currentCount}</span> / {goal.targetCount}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onResetGoal(goal.id)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-250 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all"
                      title="Reset Cycle progress"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => onIncrementGoal(goal.id)}
                      disabled={isCompleted}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10 hover:scale-[1.02]'
                      }`}
                    >
                      {isCompleted ? 'Done' : '+ Log'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* achievements section */}
      <div className="mt-4 pt-3.5 border-t border-slate-150 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          Active Streak Buff active
        </span>
        <span className="font-mono text-emerald-600 dark:text-emerald-500 font-semibold flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Habits loop is active
        </span>
      </div>
    </div>
  );
}
