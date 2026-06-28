/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, UserPreferences } from '../types';
import { Activity, Zap, Shield, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';

interface AnalyticsChartsProps {
  tasks: Task[];
  preferences: UserPreferences;
}

export default function AnalyticsCharts({ tasks, preferences }: AnalyticsChartsProps) {
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
  const [hoveredTaskCoords, setHoveredTaskCoords] = useState<{ x: number; y: number } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<'matrix' | 'peak' | null>(null);

  const activeTasks = tasks.filter(t => t.status !== 'completed');

  // Coordinates mapping helper for Focus Matrix
  // Width: 100% (represented as viewBox 0 to 400)
  // Height: 100% (represented as viewBox 0 to 240)
  // X: Priority Score (0 - 100) -> mapping to 40 to 380
  // Y: Effort Hours (0 - 8) -> mapping to 200 to 20 (since Y goes down in SVG)
  const getCoordinates = (task: Task) => {
    const score = task.priorityScore !== undefined ? task.priorityScore : 50;
    const effort = Math.min(task.effortHours, 8); // clamp to 8 max for layout safety

    // Padding values
    const minX = 50;
    const maxX = 370;
    const minY = 200; // bottom of chart
    const maxY = 30;  // top of chart

    const x = minX + (score / 100) * (maxX - minX);
    const y = minY - (effort / 8) * (minY - maxY);

    return { x, y, score, effort };
  };

  // Helper for generating peak productivity waves path based on pattern
  const getProductivityPath = (pattern: string) => {
    // Width 400, Height 120
    switch (pattern) {
      case 'morning_focus':
        // Wave high in morning (left half), low in afternoon, slight bump late
        return "M 40 100 C 90 20, 140 20, 190 70 C 240 110, 290 100, 340 70 C 360 55, 380 75, 400 95";
      case 'night_owl':
        // Wave low early, very high towards night (right half)
        return "M 40 100 C 90 105, 140 90, 190 70 C 240 50, 290 20, 345 20 C 375 20, 390 55, 400 95";
      case 'afternoon_spurt':
        // Wave peaking around mid-afternoon
        return "M 40 100 C 90 90, 140 70, 200 20 C 260 20, 310 70, 350 90 C 375 105, 390 95, 400 95";
      case 'steady_pace':
      default:
        // A balanced, flatter sine-like wave
        return "M 40 85 C 90 60, 140 60, 190 70 C 240 80, 290 50, 340 60 C 370 65, 390 75, 400 95";
    }
  };

  const getPatternTitle = (pattern: string) => {
    switch (pattern) {
      case 'morning_focus': return 'Early Bird Peak (08:00 - 12:00)';
      case 'night_owl': return 'Late Night Burst (20:00 - 00:00)';
      case 'afternoon_spurt': return 'Post-Lunch Surge (13:00 - 17:00)';
      case 'steady_pace': return 'Steady Distribution (Continuous)';
      default: return 'Steady Distribution';
    }
  };

  const getPatternDesc = (pattern: string) => {
    switch (pattern) {
      case 'morning_focus': return 'Your cortisol and focus index peaks early. TaskSaver AI automatically schedules your highest impact, deep-work items before noon.';
      case 'night_owl': return 'Your mental clarity spikes as ambient noise subsides. AI moves critical design/coding tasks to your high-energy evening zone.';
      case 'afternoon_spurt': return 'You hit your stride in the mid-afternoon. Lower importance admin items are placed early; heavy tasks are scheduled for post-lunch focus.';
      case 'steady_pace': return 'Balanced baseline focus. Your schedule is evenly distributed with deliberate buffer and recovery gaps.';
      default: return 'Your productivity wave is optimized for sustainable cognitive workload management.';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="analytics-visuals-container">
      
      {/* Chart 1: Focus Matrix Map */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              Focus Matrix Map
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Quadrant-based cognitive prioritizing locator</p>
          </div>
          <button 
            onClick={() => setActiveTooltip(activeTooltip === 'matrix' ? null : 'matrix')}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {activeTooltip === 'matrix' && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-14 left-5 right-5 z-20 bg-indigo-50 dark:bg-slate-950 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed shadow-lg"
            >
              <p className="font-bold text-indigo-900 dark:text-indigo-400 mb-1">How to read the Focus Matrix:</p>
              <li><strong>Top Right (Major Projects)</strong>: High priority score & High effort. Demands deliberate, segmented timeline blocks.</li>
              <li><strong>Bottom Right (Quick Wins)</strong>: High priority score & Low effort. Do these first to secure psychological momentum!</li>
              <li><strong>Left Half (Delegates/Postponed)</strong>: Low priority score. Reschedule or break down further with Autonomous AI.</li>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTasks.length === 0 ? (
          <div className="h-[210px] flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 p-4 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs text-slate-500 font-medium">Capture active tasks to populate the visual scatter matrix</p>
          </div>
        ) : (
          <div className="relative">
            <svg viewBox="0 0 400 240" className="w-full h-auto overflow-visible select-none">
              {/* Definition of glowing shadow filters for high-contrast visuals */}
              <defs>
                <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Grid Lines */}
              <line x1="50" y1="30" x2="370" y2="30" stroke="currentColor" className="text-slate-100 dark:text-slate-850" strokeWidth="1" />
              <line x1="50" y1="115" x2="370" y2="115" stroke="currentColor" className="text-slate-100 dark:text-slate-850" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="50" y1="200" x2="370" y2="200" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1.5" />
              
              <line x1="50" y1="30" x2="50" y2="200" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1.5" />
              <line x1="210" y1="30" x2="210" y2="200" stroke="currentColor" className="text-slate-100 dark:text-slate-850" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="370" y1="30" x2="370" y2="200" stroke="currentColor" className="text-slate-100 dark:text-slate-850" strokeWidth="1" />

              {/* Quadrant Labels in corners */}
              <text x="58" y="44" className="text-[8px] font-mono font-extrabold fill-slate-350 dark:fill-slate-600 uppercase tracking-widest">Major Efforts</text>
              <text x="312" y="44" className="text-[8px] font-mono font-extrabold fill-indigo-400 dark:fill-indigo-500 uppercase tracking-widest">Major Projects</text>
              <text x="58" y="192" className="text-[8px] font-mono font-extrabold fill-slate-350 dark:fill-slate-600 uppercase tracking-widest">Low Priority</text>
              <text x="315" y="192" className="text-[8px] font-mono font-extrabold fill-emerald-400 dark:fill-emerald-500 uppercase tracking-widest">Quick Wins</text>

              {/* Axis Labels */}
              <text x="210" y="222" textAnchor="middle" className="text-[9px] font-mono font-bold fill-slate-500 dark:fill-slate-400 uppercase tracking-wider">Priority Score (0 → 100)</text>
              <text x="18" y="115" textAnchor="middle" transform="rotate(-90 18 115)" className="text-[9px] font-mono font-bold fill-slate-500 dark:fill-slate-400 uppercase tracking-wider">Effort (0 → 8 Hours)</text>

              {/* Chart Nodes */}
              {activeTasks.map((task) => {
                const { x, y, score, effort } = getCoordinates(task);
                const isHovered = hoveredTask?.id === task.id;

                // Color node based on importance or quadrant
                let colorClass = "fill-indigo-500 stroke-indigo-600";
                if (score >= 50 && effort <= 3.5) {
                  colorClass = "fill-emerald-500 stroke-emerald-600 dark:fill-emerald-450";
                } else if (score >= 50 && effort > 3.5) {
                  colorClass = "fill-indigo-500 stroke-indigo-600 dark:fill-indigo-450";
                } else if (task.importance === 'high') {
                  colorClass = "fill-rose-500 stroke-rose-600 dark:fill-rose-450";
                } else {
                  colorClass = "fill-slate-400 stroke-slate-500 dark:fill-slate-500";
                }

                return (
                  <g key={task.id}>
                    {/* Hover Glow */}
                    {isHovered && (
                      <circle 
                        cx={x} 
                        cy={y} 
                        r="12" 
                        className="fill-indigo-500/20 dark:fill-indigo-500/10 stroke-indigo-500/40" 
                        strokeWidth="1.5"
                        filter="url(#glow-indigo)"
                      />
                    )}

                    {/* Node Core Circle */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={isHovered ? 7.5 : 5.5} 
                      className={`${colorClass} cursor-pointer transition-all duration-300`} 
                      strokeWidth="1.5"
                      onMouseEnter={(e) => {
                        setHoveredTask(task);
                        setHoveredTaskCoords({ x, y });
                      }}
                      onMouseLeave={() => {
                        setHoveredTask(null);
                        setHoveredTaskCoords(null);
                      }}
                    />

                    {/* Miniature score tag next to heavy elements */}
                    {!isHovered && score > 75 && (
                      <text x={x + 8} y={y + 3} className="text-[7px] font-mono font-bold fill-indigo-400 dark:fill-indigo-500">{score}</text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Float Tooltip Portal */}
            <AnimatePresence>
              {hoveredTask && hoveredTaskCoords && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ 
                    position: 'absolute',
                    left: `${(hoveredTaskCoords.x / 400) * 100}%`,
                    top: `${(hoveredTaskCoords.y / 240) * 100 - 64}%`,
                    transform: 'translateX(-50%)'
                  }}
                  className="bg-slate-900/95 dark:bg-slate-950 border border-slate-750 dark:border-slate-800 p-2.5 rounded-xl shadow-xl text-[10px] pointer-events-none text-white max-w-[150px] z-30"
                >
                  <p className="font-bold truncate">{hoveredTask.title}</p>
                  <div className="flex justify-between items-center mt-1 text-[8px] font-mono text-slate-400">
                    <span>Priority: {hoveredTask.priorityScore || 50}</span>
                    <span>Effort: {hoveredTask.effortHours}h</span>
                  </div>
                  <div className="h-0.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${hoveredTask.priorityScore || 50}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Chart 2: Peak Productivity Curve */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Peak Productivity waves
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Simulated cognitive peak distribution model</p>
          </div>
          <button 
            onClick={() => setActiveTooltip(activeTooltip === 'peak' ? null : 'peak')}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {activeTooltip === 'peak' && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-14 left-5 right-5 z-20 bg-amber-50 dark:bg-slate-950 p-3.5 rounded-xl border border-amber-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed shadow-lg"
            >
              <p className="font-bold text-amber-900 dark:text-amber-400 mb-1">Productivity Wave Insights:</p>
              <p>{getPatternDesc(preferences.productivityPattern)}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850/60 rounded-xl">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-600 dark:text-slate-300 font-display">{getPatternTitle(preferences.productivityPattern)}</span>
              <span className="text-amber-600 dark:text-amber-450 font-mono text-[9px] uppercase tracking-wider">AI Optimal Band</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed mt-1">
              {getPatternDesc(preferences.productivityPattern).substring(0, 115)}...
            </p>
          </div>

          <div className="relative">
            <svg viewBox="0 0 400 120" className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="gradient-wave" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-amber-500, #f59e0b)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--color-amber-500, #f59e0b)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Curve Area Fill */}
              <path 
                d={`${getProductivityPath(preferences.productivityPattern)} L 400 120 L 40 120 Z`} 
                fill="url(#gradient-wave)"
              />

              {/* Curve Stroke */}
              <path 
                d={getProductivityPath(preferences.productivityPattern)} 
                fill="none" 
                stroke="currentColor" 
                className="text-amber-500 dark:text-amber-450" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />

              {/* Anchor points */}
              {preferences.productivityPattern === 'morning_focus' && (
                <>
                  <circle cx="115" cy="20" r="4.5" className="fill-amber-400 dark:fill-amber-500 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                  <text x="115" y="40" textAnchor="middle" className="text-[7.5px] font-mono font-extrabold fill-slate-700 dark:fill-slate-300 uppercase tracking-wider">Optimal Focus Zone</text>
                </>
              )}
              {preferences.productivityPattern === 'night_owl' && (
                <>
                  <circle cx="317" cy="20" r="4.5" className="fill-amber-400 dark:fill-amber-500 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                  <text x="317" y="40" textAnchor="middle" className="text-[7.5px] font-mono font-extrabold fill-slate-700 dark:fill-slate-300 uppercase tracking-wider">Optimal Focus Zone</text>
                </>
              )}
              {preferences.productivityPattern === 'afternoon_spurt' && (
                <>
                  <circle cx="200" cy="20" r="4.5" className="fill-amber-400 dark:fill-amber-500 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                  <text x="200" y="40" textAnchor="middle" className="text-[7.5px] font-mono font-extrabold fill-slate-700 dark:fill-slate-300 uppercase tracking-wider">Optimal Focus Zone</text>
                </>
              )}
              {preferences.productivityPattern === 'steady_pace' && (
                <>
                  <circle cx="115" cy="73" r="3.5" className="fill-amber-400/80 stroke-white dark:stroke-slate-900" strokeWidth="1" />
                  <circle cx="290" cy="50" r="3.5" className="fill-amber-400/80 stroke-white dark:stroke-slate-900" strokeWidth="1" />
                  <text x="200" y="105" textAnchor="middle" className="text-[7.5px] font-mono font-extrabold fill-slate-500 dark:fill-slate-400 uppercase tracking-wider">Sustained High Energy Band</text>
                </>
              )}

              {/* Time divisions on bottom */}
              <text x="40" y="115" className="text-[8px] font-mono fill-slate-400 dark:fill-slate-500">08:00</text>
              <text x="130" y="115" textAnchor="middle" className="text-[8px] font-mono fill-slate-400 dark:fill-slate-500">12:00</text>
              <text x="220" y="115" textAnchor="middle" className="text-[8px] font-mono fill-slate-400 dark:fill-slate-500">16:00</text>
              <text x="310" y="115" textAnchor="middle" className="text-[8px] font-mono fill-slate-400 dark:fill-slate-500">20:00</text>
              <text x="390" y="115" textAnchor="end" className="text-[8px] font-mono fill-slate-400 dark:fill-slate-500">00:00</text>
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
