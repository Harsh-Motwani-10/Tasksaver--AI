/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Status indicator
app.get("/api/status", (req, res) => {
  res.json({
    geminiActive: !!process.env.GEMINI_API_KEY
  });
});

// Proactive coach persona system instruction
const SYSTEM_INSTRUCTION = `You are "TaskSaver AI", a proactive, encouraging, direct, and action-oriented "proactive productivity coach". 
Your target users are students, professionals, and entrepreneurs who are prone to procrastinating or missing deadlines.
Unlike traditional passive assistants, you are proactive, urgent when deadlines approach, and supportive.
You use positive reinforcement but are firm when tasks are overdue or when a user is overcommitted.
You always provide highly structured, realistic, and action-oriented plans.
Always return structured responses that align with the specified JSON schemas.`;

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

function cleanAndParseJSON(text: string | undefined): any {
  if (!text) return {};
  let cleaned = text.trim();
  // Remove markdown blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "");
    cleaned = cleaned.replace(/\n?```$/i, "");
  }
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("JSON.parse failed, attempting to extract JSON from raw text. Error:", err);
    // Try to find the first '{' and last '}'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    
    let startIdx = -1;
    let endIdx = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = lastBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = lastBracket;
    }
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } catch (nestedErr) {
        console.error("Deep extraction of JSON failed as well:", nestedErr);
      }
    }
    throw err;
  }
}

// --- LOCAL SMART SIMULATORS (Fallback when GEMINI_API_KEY is not declared) ---

function simulatePrioritization(tasks: any[], preferences: any) {
  const name = preferences?.name || "User";
  const pattern = preferences?.productivityPattern || "steady_pace";
  
  const prioritized = tasks.map(t => {
    let score = 50; // default base
    let reason = "";

    // Importance contribution
    if (t.importance === 'high') {
      score += 25;
    } else if (t.importance === 'low') {
      score -= 20;
    }

    // Effort contribution
    if (t.effortHours > 5) {
      score += 10;
    }

    // Proximity to due date contribution
    const now = new Date();
    const dueDate = new Date(t.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      score += 35; // Overdue task gets maximum priority
      reason = `This critical task is currently past due! Let's start with a micro-milestone to regain momentum.`;
    } else if (diffDays <= 1) {
      score += 25; // Due today or tomorrow
      reason = `Due very soon. High priority focus block needed during your peak window.`;
    } else if (diffDays <= 3) {
      score += 12;
      reason = `Due in a few days. Best to allocate a brief session today to outline your starting steps.`;
    } else {
      score -= 10;
      reason = `Plenty of timeline buffer remaining. Focus on pressing obligations first.`;
    }

    // Clamp score strictly between 10 and 100
    score = Math.max(10, Math.min(100, score));

    if (!reason) {
      if (score > 75) {
        reason = `High priority catalyst. We should conquer this during your peak morning energy burst.`;
      } else if (score > 40) {
        reason = `Moderate impact. Allocate steady afternoon time to make consistent progress.`;
      } else {
        reason = `Low urgency item. Ideal for low-energy blocks or quick wins.`;
      }
    }

    return {
      id: t.id,
      priorityScore: score,
      priorityReason: reason
    };
  });

  return { tasks: prioritized, simulated: true };
}

function simulateScheduling(tasks: any[], preferences: any, date: string) {
  const name = preferences?.name || "User";
  const startHourStr = preferences?.workingHoursStart || "09:00";
  const endHourStr = preferences?.workingHoursEnd || "17:00";
  const availableHours = preferences?.availableHoursPerDay || 6;
  const pattern = preferences?.productivityPattern || "steady_pace";

  const [startH, startM] = startHourStr.split(":").map(Number);
  
  // Sort incomplete tasks by urgency
  const sortedTasks = [...tasks].sort((a, b) => {
    const scoreA = a.priorityScore || (a.importance === 'high' ? 80 : 50);
    const scoreB = b.priorityScore || (b.importance === 'high' ? 80 : 50);
    return scoreB - scoreA;
  });

  const slots: any[] = [];
  const recs: string[] = [];

  let currentHour = startH;
  let currentMinute = startM;
  const scheduleDate = date ? new Date(date) : new Date();
  const dateStr = scheduleDate.toISOString().split('T')[0];

  const formatISO = (h: number, m: number) => {
    const hh = String(Math.floor(h) % 24).padStart(2, "0");
    const mm = String(Math.floor(m) % 60).padStart(2, "0");
    return `${dateStr}T${hh}:${mm}`;
  };

  let totalScheduledHours = 0;
  let taskIdCounter = 1;

  for (const task of sortedTasks) {
    if (totalScheduledHours >= availableHours) break;

    const duration = Math.min(task.effortHours || 2, availableHours - totalScheduledHours, 3);
    if (duration <= 0) break;

    const slotStart = formatISO(currentHour, currentMinute);
    
    currentMinute += duration * 60;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
    
    const slotEnd = formatISO(currentHour, currentMinute);

    slots.push({
      id: `slot_${taskIdCounter++}`,
      taskId: task.id,
      title: `Focus session: "${task.title}"`,
      startTime: slotStart,
      endTime: slotEnd,
      type: "task"
    });

    totalScheduledHours += duration;

    // Insert restorative focus breaks
    if (totalScheduledHours < availableHours) {
      const bufferStart = formatISO(currentHour, currentMinute);
      currentMinute += 30; // 30 mins break
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
      const bufferEnd = formatISO(currentHour, currentMinute);

      slots.push({
        id: `slot_${taskIdCounter++}`,
        title: "Focus Break & Physical Recharge",
        startTime: bufferStart,
        endTime: bufferEnd,
        type: "break"
      });
    }
  }

  if (tasks.length === 0) {
    recs.push("Your roadmap is empty! Capture your upcoming milestones to structure an optimized schedule.");
  } else {
    recs.push(`Day agenda formulated for your "${pattern.replace('_', ' ')}" productivity pattern.`);
    recs.push("Mandatory wellness breaks have been locked in between key focus periods to maintain cognitive stamina.");
    if (tasks.some(t => t.importance === 'high')) {
      recs.push("High-importance obligations have been frontloaded to maximize execution energy.");
    }
  }

  return { scheduleSlots: slots, recommendations: recs, simulated: true };
}

function simulateRecommendations(tasks: any[], goals: any[], preferences: any) {
  const recs: any[] = [];
  const name = preferences?.name || "User";

  // Scan for overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < now);
  
  if (overdueTasks.length > 0) {
    recs.push({
      id: "rec_overdue_" + Math.random().toString(36).substring(2, 9),
      type: "nudge",
      title: "Overdue Obligation",
      content: `"${overdueTasks[0].title}" has slipped past its target due date. Let's schedule a brief 15-minute start burst right now to break initial inertia.`,
      taskId: overdueTasks[0].id,
      suggestedAction: "Start Task Now"
    });
  }

  // Scan for heavy tasks
  const largeTasks = tasks.filter(t => t.status !== 'completed' && (t.effortHours || 0) >= 5);
  if (largeTasks.length > 0) {
    recs.push({
      id: "rec_large_" + Math.random().toString(36).substring(2, 9),
      type: "breakdown",
      title: "Deconstruct Heavy Objective",
      content: `The task "${largeTasks[0].title}" requires ${largeTasks[0].effortHours} hours of deep work. Splitting it into atomic, single-sitting subtasks makes it substantially easier to start.`,
      taskId: largeTasks[0].id,
      suggestedAction: "Break Down Now"
    });
  }

  // Energy pattern coaching
  const pattern = preferences?.productivityPattern || "morning_focus";
  if (pattern === 'morning_focus') {
    recs.push({
      id: "rec_pattern_" + Math.random().toString(36).substring(2, 9),
      type: "pattern_tip",
      title: "Dawn Focus Calibration",
      content: "Since your energy is highest during mornings, tackle your most analytical or creative project immediately after waking to bypass noon fatigue.",
      suggestedAction: "Schedule Early"
    });
  } else if (pattern === 'night_owl') {
    recs.push({
      id: "rec_pattern_" + Math.random().toString(36).substring(2, 9),
      type: "pattern_tip",
      title: "Midnight Stamina Lock",
      content: "Your cognitive stamina peaks during late evening. Reserve daytime for transactional meetings, and save complex problem solving for your undisturbed night blocks.",
      suggestedAction: "Schedule Late"
    });
  }

  // Dynamic Momentum tip fallback
  if (recs.length < 3) {
    recs.push({
      id: "rec_tip_" + Math.random().toString(36).substring(2, 9),
      type: "prioritization",
      title: "The 5-Minute Momentum Trick",
      content: "Feeling massive resistance to starting? Set a timer for strictly 5 minutes, and commit to working on your top priority. You can stop when it goes off—but 80% of the time, momentum carries you forward.",
      suggestedAction: "Try Routine"
    });
  }

  return { recommendations: recs, simulated: true };
}

function simulateGoalBreakdown(goalText: string) {
  const text = goalText.toLowerCase();
  let tasks: any[] = [];

  if (text.includes("study") || text.includes("exam") || text.includes("learn") || text.includes("math") || text.includes("physics") || text.includes("test")) {
    tasks = [
      {
        title: "Review Syllabus & Compile Key Reference Sheets",
        description: "Identify all testable content, collect text formulas, and print core cheat sheets.",
        effortHours: 1.5,
        importance: "high",
        subtasks: ["Locate textbook syllabus", "Write down core 10 formulas", "Create reference folder"]
      },
      {
        title: "Do 5 High-Impact Practice Problems",
        description: "Focus on previously failed topics or standard sample questions under test conditions.",
        effortHours: 2.5,
        importance: "high",
        subtasks: ["Select past exam questions", "Solve without checking solutions first", "Self-grade and highlight weak steps"]
      },
      {
        title: "Synthesize Weak Areas into Flashcards",
        description: "Extract the exact conceptual blocks or steps that triggered mistakes into active recall triggers.",
        effortHours: 1,
        importance: "medium",
        subtasks: ["Draft 15 custom flashcards", "Perform one rapid practice recall pass"]
      }
    ];
  } else if (text.includes("code") || text.includes("project") || text.includes("build") || text.includes("app") || text.includes("software")) {
    tasks = [
      {
        title: "Draft Interface Wireframes & Data Types",
        description: "Sketch the visual layout components and define the core object models or DB schemas.",
        effortHours: 1,
        importance: "medium",
        subtasks: ["Sketch 3 primary views", "Declare TypeScript interfaces file", "Review API data contracts"]
      },
      {
        title: "Configure Dev Workspace & Launch Scaffolding",
        description: "Initialize the repository, setup basic dependencies, and confirm hello world is rendering.",
        effortHours: 2,
        importance: "high",
        subtasks: ["Run workspace initializer", "Clean up template boilerplate", "Deploy mock landing screen"]
      },
      {
        title: "Build Core Database Schemas & Initial API Routes",
        description: "Implement the crucial database tables and proxy server routes to handle basic CRUD requests.",
        effortHours: 3,
        importance: "high",
        subtasks: ["Create backend db files", "Write post/get sample routes", "Validate with client-side fetch"]
      }
    ];
  } else {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const topic = goalText.trim();
    tasks = [
      {
        title: `Research & Outline: ${capitalize(topic)}`,
        description: `Gather requirements, assemble reference materials, and draft the initial structure for "${topic}".`,
        effortHours: 1.5,
        importance: "medium",
        subtasks: [
          `Search for 3 high-quality resources or references on "${topic}"`,
          "Define the core goals and checklist requirements",
          "Identify major challenges or missing dependencies"
        ]
      },
      {
        title: `Execute Foundation & Prototype: ${capitalize(topic)}`,
        description: `Build the core skeletal draft or primary working version of "${topic}".`,
        effortHours: 3,
        importance: "high",
        subtasks: [
          `Draft the main components or sections for "${topic}"`,
          "Validate the initial prototype flow under simple conditions",
          "Fix immediate blocker issues or structural bugs"
        ]
      },
      {
        title: `Polishing & Quality Review: ${capitalize(topic)}`,
        description: `Audit, edit, and refine the finished elements of "${topic}" for visual polish and consistency.`,
        effortHours: 1.5,
        importance: "high",
        subtasks: [
          "Check formatting, style, and visual appeal",
          "Perform a comprehensive user path walkthrough",
          "Perform final checklist validation and sign-off"
        ]
      }
    ];
  }

  return { tasks, simulated: true };
}

function simulateChatVoice(message: string, tasks: any[], goals: any[], preferences: any) {
  const text = message.toLowerCase();
  const name = preferences?.name || "Achiever";
  
  let reply = "";
  let speechText = "";
  let suggestedAction = { type: "none", data: "" };

  if (text.includes("add task") || text.includes("remind me to") || text.includes("schedule study") || text.includes("need to")) {
    let taskName = "New Focused Task";
    if (text.includes("remind me to")) {
      taskName = message.replace(/.*remind me to\s+/i, "");
    } else if (text.includes("need to")) {
      taskName = message.replace(/.*need to\s+/i, "");
    }
    
    taskName = taskName.replace(/[?.!]/g, "").trim();
    taskName = taskName.charAt(0).toUpperCase() + taskName.slice(1);

    const draftTask = {
      title: taskName,
      dueDate: new Date(Date.now() + 86400000).toISOString().substring(0, 16), // Tomorrow
      effortHours: 2,
      importance: "medium"
    };

    reply = `I've formulated a task draft for you: **"${taskName}"**! Click the **"Approve Draft"** action button in our chat box to immediately schedule it onto your daily roadmap and lock it in.`;
    speechText = `I've drafted the task: "${taskName}". Click Approve to save it.`;
    suggestedAction = {
      type: "add_task",
      data: JSON.stringify(draftTask)
    };
  } else if (text.includes("schedule") || text.includes("agenda") || text.includes("calendar")) {
    reply = `I would love to help optimize your day-plan! I can evaluate your outstanding obligations and group them with restorative focus breaks. Click **"View & Sync Schedule"** to review your time-sequenced agenda.`;
    speechText = "Let's align your scheduled agenda blocks. Check out your Day Planner view.";
    suggestedAction = {
      type: "view_schedule",
      data: "{}"
    };
  } else {
    const tips = [
      `To protect your focus right now, try closing all unrelated browser tabs. Focus is about elimination. Let's tackle your top priority!`,
      `Remember that procrastination is just an emotional regulation challenge, not a lazy streak. Just start with the first 5 minutes.`,
      `Your active habits are the silent foundation of your growth. Have you completed your routines yet today?`,
      `Excellent effort. Let's make sure we preserve your physical stamina by scheduling a 5-minute movement stretch soon.`
    ];
    const chosenTip = tips[Math.floor(Math.random() * tips.length)];

    reply = `Hi ${name}! As your proactive productivity coach, I am here to shield you from procrastination cycles. ${chosenTip} Is there a specific task you want me to deconstruct or schedule next?`;
    speechText = `Hello ${name}. I am here to help. Just start with the first five minutes on your top priority today!`;
  }

  return { reply, speechText, suggestedAction, simulated: true };
}

// --- API ENDPOINT ROUTING WITH AUTO FALLBACKS ---

// 1. Prioritize Tasks
app.post("/api/ai/prioritize", async (req, res) => {
  const { tasks, preferences } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks must be a valid array." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is missing. Running local prioritized task simulation.");
      const result = simulatePrioritization(tasks, preferences);
      return res.json(result);
    }

    const ai = getAI();
    const prompt = `Given the following list of tasks and user preferences, analyze each task and assign an urgency and impact score to assign a "priorityScore" from 0 to 100.
Also, write a short, proactive, direct coach-style explanation (priorityReason) on why it has this priority and when they should start.
Consider factors like proximity of due date, estimated effort, task importance (low/medium/high), and their working hours/productivity patterns if relevant.
User Name: ${preferences?.name || "User"}
Productivity Pattern: ${preferences?.productivityPattern || "steady_pace"}

Tasks to prioritize:
${JSON.stringify(tasks, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "The list of prioritized tasks, maintaining their IDs but adding/updating priorityScore and priorityReason.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  priorityScore: { type: Type.INTEGER, description: "A score from 0 (lowest) to 100 (highest/overdue)" },
                  priorityReason: { type: Type.STRING, description: "Proactive, supportive yet urgent coach commentary (max 2 sentences)" }
                },
                required: ["id", "priorityScore", "priorityReason"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const result = cleanAndParseJSON(response.text);
    res.json(result);
  } catch (error: any) {
    console.warn("Prioritize API error, falling back to local simulation:", error);
    const result = simulatePrioritization(tasks, preferences);
    res.json({
      ...result,
      apiError: true,
      quotaExceeded: error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED"),
      errorMessage: error.message
    });
  }
});

// 2. Schedule Tasks
app.post("/api/ai/schedule", async (req, res) => {
  const { tasks, preferences, date } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks list is required." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is missing. Running local daily scheduler simulation.");
      const result = simulateScheduling(tasks, preferences, date);
      return res.json(result);
    }

    const ai = getAI();
    const prompt = `You are scheduling the day for ${preferences?.name || "User"} on ${date || "today"}.
Their preferred available hours per day is ${preferences?.availableHoursPerDay || 6} hours, working between ${preferences?.workingHoursStart || "09:00"} and ${preferences?.workingHoursEnd || "17:00"}.
Their productivity pattern is "${preferences?.productivityPattern || "steady_pace"}" (e.g. morning_focus, night_owl).

Given their active tasks, create a realistic daily schedule. 
Rule 1: Leave a "Focus Break" (type: 'break') or "Buffer Time" (type: 'buffer') between intense or long tasks to avoid burnout.
Rule 2: Fit tasks that fit within their limits.
Rule 3: Schedule overdue tasks or urgent tasks first (based on priorityScore or dueDate).
Rule 4: Write 1-3 specific scheduling recommendations/coaching observations.

Tasks:
${JSON.stringify(tasks, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scheduleSlots: {
              type: Type.ARRAY,
              description: "Array of timeline blocks for the schedule",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique slot ID (e.g., 'slot_1', or reuse taskId)" },
                  taskId: { type: Type.STRING, description: "The ID of the task being scheduled (if applicable, otherwise leave blank/omit)" },
                  title: { type: Type.STRING, description: "Title of the slot (e.g., 'Work on task title', 'Review notes', 'Buffer & Recharge')" },
                  startTime: { type: Type.STRING, description: "ISO 8601 string or format YYYY-MM-DDTHH:mm representing slot start" },
                  endTime: { type: Type.STRING, description: "ISO 8601 string or format YYYY-MM-DDTHH:mm representing slot end" },
                  type: { type: Type.STRING, description: "Must be one of: 'task', 'buffer', 'personal', 'break'" }
                },
                required: ["id", "title", "startTime", "endTime", "type"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              description: "Coaching tips specifically about today's structure and time management constraints",
              items: { type: Type.STRING }
            }
          },
          required: ["scheduleSlots", "recommendations"]
        }
      }
    });

    const result = cleanAndParseJSON(response.text);
    res.json(result);
  } catch (error: any) {
    console.warn("Schedule API error, falling back to local simulation:", error);
    const result = simulateScheduling(tasks, preferences, date);
    res.json({
      ...result,
      apiError: true,
      quotaExceeded: error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED"),
      errorMessage: error.message
    });
  }
});

// 3. Personalized Productivity Recommendations & Context-Aware Reminders
app.post("/api/ai/recommendations", async (req, res) => {
  const { tasks, goals, preferences } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is missing. Running local coach recommendations simulation.");
      const result = simulateRecommendations(tasks || [], goals || [], preferences);
      return res.json(result);
    }

    const ai = getAI();
    const prompt = `Analyze the current state of tasks, recurring goals, and preferences for ${preferences?.name || "User"}.
Generate high-impact coaching tips (type: 'pattern_tip'), urgent context-aware reminders (type: 'nudge'), task suggestions (type: 'prioritization'), or recommendations to split a heavy task (type: 'breakdown').
Example: If a task has 6+ hours effort and hasn't been started, recommend breaking it down.
Example: If they prefer morning focus, suggest scheduling important high-impact tasks early.
Example: If they have overdue or near-due high importance tasks that aren't started, create a strong, urgent, context-aware "nudge" warning.

Tasks:
${JSON.stringify(tasks, null, 2)}

Goals:
${JSON.stringify(goals, null, 2)}

Preferences:
${JSON.stringify(preferences, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Random or unique ID" },
                  type: { type: Type.STRING, description: "Must be 'prioritization', 'breakdown', 'nudge', or 'pattern_tip'" },
                  title: { type: Type.STRING, description: "Brief title of recommendation" },
                  content: { type: Type.STRING, description: "Urgent, coaching, direct tip message" },
                  taskId: { type: Type.STRING, description: "Optional associated taskId" },
                  suggestedAction: { type: Type.STRING, description: "Short label for client action (e.g., 'Break Down Now', 'Schedule Early', 'Start Session')" }
                },
                required: ["id", "type", "title", "content"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const result = cleanAndParseJSON(response.text);
    res.json(result);
  } catch (error: any) {
    console.warn("Recommendations API error, falling back to local simulation:", error);
    const result = simulateRecommendations(tasks || [], goals || [], preferences);
    res.json({
      ...result,
      apiError: true,
      quotaExceeded: error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED"),
      errorMessage: error.message
    });
  }
});

// 4. Autonomous Task Planning & Breakdown
app.post("/api/ai/breakdown", async (req, res) => {
  const { goalText } = req.body;
  if (!goalText) {
    return res.status(400).json({ error: "Goal text is required." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is missing. Running local goal breakdown simulation.");
      const result = simulateGoalBreakdown(goalText);
      return res.json(result);
    }

    const ai = getAI();
    const prompt = `The user wants to accomplish this vague goal: "${goalText}".
As an autonomous productivity planner, break this goal down into a series of 3 to 5 actionable, standalone tasks with reasonable effort estimates, importance levels, and micro-subtasks.
Provide clean, realistic subtasks that lead to complete readiness for the goal.

Goal: "${goalText}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "Actionable tasks list derived from the vague goal",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Actionable, clear name" },
                  description: { type: Type.STRING, description: "Brief target explanation of what needs to be done" },
                  effortHours: { type: Type.NUMBER, description: "Estimated realistic hours of focused effort" },
                  importance: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'" },
                  subtasks: {
                    type: Type.ARRAY,
                    description: "List of micro checkpoint titles",
                    items: { type: Type.STRING }
                  }
                },
                required: ["title", "description", "effortHours", "importance", "subtasks"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const result = cleanAndParseJSON(response.text);
    res.json(result);
  } catch (error: any) {
    console.warn("Goal breakdown API error, falling back to local simulation:", error);
    const result = simulateGoalBreakdown(goalText);
    res.json({
      ...result,
      apiError: true,
      quotaExceeded: error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED"),
      errorMessage: error.message
    });
  }
});

// 5. Context-Aware AI Chat & Voice Assistant
app.post("/api/ai/chat-voice", async (req, res) => {
  const { message, tasks, goals, preferences } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is missing. Running local chat companion simulation.");
      const result = simulateChatVoice(message, tasks || [], goals || [], preferences);
      return res.json(result);
    }

    const ai = getAI();
    const prompt = `You are interacting directly via chat or voice with the user.
Message from user: "${message}"

Current Application Context:
Preferences: ${JSON.stringify(preferences || {}, null, 2)}
Tasks count: ${tasks?.length || 0}
Active tasks: ${JSON.stringify((tasks || []).filter((t: any) => t.status !== 'completed'), null, 2)}
Goals list: ${JSON.stringify(goals || [], null, 2)}

Your response must include:
1. "reply": A proactive, encouraging, action-oriented direct chat coach response.
2. "speechText": A highly natural, conversational, brief voice-synthesizer-friendly reply (max 25-30 words) that can be spoken clearly.
3. "suggestedAction": If the user says something that sounds like an intent to create a task (e.g., "remind me to buy milk tonight", "schedule study session for calculus"), or check schedule, map it into a suggestedAction with type ('add_task', 'view_schedule', 'start_focus', or 'none') and serialize the draft parameters in "data" (e.g. details of task to add as a JSON string).

Example for "I need to study math tomorrow for 2 hours":
suggestedAction: { type: "add_task", data: '{"title": "Study Math", "dueDate": "tomorrow", "effortHours": 2, "importance": "high"}' }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Detailed text reply (markdown supported)" },
            speechText: { type: Type.STRING, description: "Short, verbal-friendly sentence(s) for browser SpeechSynthesis" },
            suggestedAction: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Must be 'add_task', 'view_schedule', 'start_focus', or 'none'" },
                data: { type: Type.STRING, description: "Stringified JSON parameters matching the action (e.g., Task parameters)" }
              },
              required: ["type"]
            }
          },
          required: ["reply", "speechText"]
        }
      }
    });

    const result = cleanAndParseJSON(response.text);
    res.json(result);
  } catch (error: any) {
    console.warn("Chat-voice API error, falling back to local simulation:", error);
    const result = simulateChatVoice(message, tasks || [], goals || [], preferences);
    res.json({
      ...result,
      apiError: true,
      quotaExceeded: error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED"),
      errorMessage: error.message
    });
  }
});


// SPA static asset serving / Vite routing integration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware active.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production build from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TaskSaver AI server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Error setting up server / Vite middleware:", err);
});
