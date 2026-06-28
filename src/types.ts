/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  effortHours: number;
  importance: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  progress: number; // 0 to 100
  priorityScore?: number; // 0 to 100, set by AI
  priorityReason?: string; // AI reasoning
  subtasks?: SubTask[];
  category?: string;
}

export interface ScheduleSlot {
  id: string;
  taskId?: string;
  title: string;
  startTime: string; // ISO String or YYYY-MM-DDTHH:mm
  endTime: string; // ISO String or YYYY-MM-DDTHH:mm
  type: 'task' | 'buffer' | 'personal' | 'break';
}

export interface Goal {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  targetCount: number; // e.g. 1
  currentCount: number; // current progress for the cycle
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  history: Record<string, boolean>; // YYYY-MM-DD -> completed status
}

export interface UserPreferences {
  name: string;
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "17:00"
  availableHoursPerDay: number;
  productivityPattern: 'morning_focus' | 'night_owl' | 'afternoon_spurt' | 'steady_pace';
  onboarded: boolean;
}

export interface AIRecommendation {
  id: string;
  type: 'prioritization' | 'breakdown' | 'nudge' | 'pattern_tip';
  title: string;
  content: string;
  taskId?: string;
  suggestedAction?: string;
}

export interface TaskFilters {
  status: 'all' | 'todo' | 'in_progress' | 'completed';
  due: 'all' | 'today' | 'overdue';
  importance: 'all' | 'high' | 'medium' | 'low';
}

