/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { AIRecommendation } from '../types';
import { AlertCircle, Lightbulb, Play, Split, RefreshCw, Zap, Clock, ShieldAlert } from 'lucide-react';

interface RecommendationsProps {
  recommendations: AIRecommendation[];
  loading: boolean;
  onRefresh: () => void;
  onAction: (rec: AIRecommendation) => void;
}

export default function Recommendations({ recommendations, loading, onRefresh, onAction }: RecommendationsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="ai-recs-panel">
      {/* Decorative backdrop elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />

      <div className="flex justify-between items-center mb-5 border-b border-slate-150 dark:border-slate-850 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Zap className="w-4 h-4 text-indigo-550 dark:text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-display text-slate-900 dark:text-white">AI Coach Insights</h2>
            <p className="text-[10px] text-slate-500 font-medium">Real-time adaptive coaching nudges</p>
          </div>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700/60"
          title="Regenerate Recommendations"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Analyze
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-t-indigo-500 rounded-full animate-spin" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">Running proactive risk analysis...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-xl p-4">
          <p className="text-xs text-slate-700 dark:text-slate-400 font-bold">All clear! No pending risks found.</p>
          <p className="text-[11px] text-slate-500 mt-1">AI Coach advises continuing on your current sequence.</p>
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
          {recommendations.map((rec) => {
            const isNudge = rec.type === 'nudge';
            const isBreakdown = rec.type === 'breakdown';
            const isPrioritization = rec.type === 'prioritization';

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col sm:flex-row gap-3.5 items-start justify-between ${
                  isNudge
                    ? 'bg-rose-50/60 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/10 text-rose-900 dark:text-rose-200'
                    : isBreakdown
                    ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/10 text-amber-900 dark:text-amber-200'
                    : isPrioritization
                    ? 'bg-indigo-50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/10 text-indigo-900 dark:text-indigo-200'
                    : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {/* Visual Accent Bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                  isNudge ? 'bg-rose-500' : isBreakdown ? 'bg-amber-500' : isPrioritization ? 'bg-indigo-500' : 'bg-emerald-500'
                }`} />

                <div className="flex gap-2.5 items-start pl-1.5">
                  <div className="mt-0.5 shrink-0">
                    {isNudge ? (
                      <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
                    ) : isPrioritization ? (
                      <AlertCircle className="w-5 h-5 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                      {rec.title}
                      {isNudge && (
                        <span className="bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[9px] px-2 py-0.5 rounded-lg font-mono font-bold uppercase">
                          URGENT
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">{rec.content}</p>
                  </div>
                </div>

                {rec.suggestedAction && (
                  <button
                    onClick={() => onAction(rec)}
                    className={`mt-2.5 sm:mt-0 px-3.5 py-2 rounded-xl font-semibold text-xs shrink-0 self-end sm:self-center flex items-center gap-1.5 shadow transition-all cursor-pointer border ${
                      isNudge
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/20 hover:scale-[1.02]'
                        : isBreakdown
                        ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-600/20 dark:hover:bg-amber-600/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                        : 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                    }`}
                  >
                    {isNudge ? (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    ) : isBreakdown ? (
                      <Split className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {rec.suggestedAction}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
