/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Task, Goal, UserPreferences } from '../types';
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, MessageSquare, Terminal } from 'lucide-react';

interface AIChatVoiceProps {
  tasks: Task[];
  goals: Goal[];
  preferences: UserPreferences;
  onAddTask: (task: Task) => void;
  onViewSchedule: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  speechText?: string;
}

export default function AIChatVoice({ tasks, goals, preferences, onAddTask, onViewSchedule }: AIChatVoiceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hey ${preferences.name || 'there'}! I'm your TaskSaver AI Coach. Don't let deadlines creep up on you. What are we tackling right now? Ask me **"What should I work on now?"** or tell me to schedule something!`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API references
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Setup Web Speech Recognition if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSendMessage(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported or permitted in this browser configuration. Try typing your message instead!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop anything playing
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) {
      setInputText('');
    }

    // Add user message
    const userMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          tasks,
          goals,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error('AI Coach service unavailable');
      }

      const data = await response.json();
      
      const aiMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
      const aiMessage: Message = {
        id: aiMsgId,
        sender: 'ai',
        text: data.reply,
        speechText: data.speechText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Speak text aloud if not muted
      if (data.speechText) {
        speakText(data.speechText);
      }

      // Handle suggested action
      if (data.suggestedAction && data.suggestedAction.type !== 'none') {
        const actionType = data.suggestedAction.type;
        const actionData = data.suggestedAction.data ? JSON.parse(data.suggestedAction.data) : null;

        if (actionType === 'add_task' && actionData) {
          // Compute real offset day
          let parsedDueDate = new Date().toISOString().split('T')[0] + 'T18:00';
          if (actionData.dueDate === 'tomorrow') {
            const tom = new Date();
            tom.setDate(tom.getDate() + 1);
            parsedDueDate = tom.toISOString().split('T')[0] + 'T18:00';
          } else if (actionData.dueDate && actionData.dueDate.includes('-')) {
            parsedDueDate = actionData.dueDate;
          }

          const newTask: Task = {
            id: 'task_' + Math.random().toString(36).substring(2, 9),
            title: actionData.title || 'AI Suggested Task',
            dueDate: parsedDueDate,
            effortHours: actionData.effortHours || 2,
            importance: actionData.importance || 'medium',
            status: 'todo',
            progress: 0,
            subtasks: []
          };
          onAddTask(newTask);
        } else if (actionType === 'view_schedule') {
          onViewSchedule();
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: 'error_msg',
          sender: 'ai',
          text: "I experienced an error connecting to my core reasoning bank. Ensure the GEMINI_API_KEY is configured in Settings > Secrets!",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPromptClick = (prompt: string) => {
    setInputText('');
    handleSendMessage(prompt);
  };

  // Render text containing lists/structured lines elegantly inside AI bubbles
  const renderMessageText = (text: string) => {
    if (!text) return null;

    // Check if there are bullet points or numeric lists
    const lines = text.split('\n');
    const isList = lines.some(line => line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim()));

    if (!isList) {
      return <p className="leading-relaxed whitespace-pre-wrap">{text}</p>;
    }

    return (
      <div className="space-y-2 mt-1">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const content = trimmed.substring(1).trim();
            return (
              <div key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60 dark:hover:border-slate-850 transition-colors">
                <span className="text-indigo-500 dark:text-indigo-400 font-bold mt-0.5">•</span>
                <span className="text-slate-850 dark:text-slate-200 leading-relaxed">{content}</span>
              </div>
            );
          } else if (/^\d+\./.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.(.*)/);
            const num = match ? match[1] : '';
            const content = match ? match[2].trim() : trimmed;
            return (
              <div key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60 dark:hover:border-slate-850 transition-colors">
                <span className="text-indigo-500 dark:text-indigo-400 font-bold font-mono text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">{num}</span>
                <span className="text-slate-850 dark:text-slate-200 leading-relaxed">{content}</span>
              </div>
            );
          } else if (trimmed) {
            return <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed">{trimmed}</p>;
          }
          return <div key={idx} className="h-1" />;
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[520px]" id="voice-chat-panel">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-150 dark:border-slate-800 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative p-2.5 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-500 dark:text-indigo-400">
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-display text-slate-900 dark:text-white">TaskSaver AI Coach</h2>
            <p className="text-[10px] text-slate-500 font-medium">Context-Aware Cognitive Assistant</p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted) window.speechSynthesis.cancel();
          }}
          className={`p-2 rounded-xl transition-all border cursor-pointer ${
            isMuted 
              ? 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500' 
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
          }`}
          title={isMuted ? "Enable Voice Feedback" : "Mute Voice Feedback"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 min-h-0 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border shadow-sm ${
              msg.sender === 'user'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-105 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'
            }`}>
              {msg.sender === 'user' ? 'ME' : 'AI'}
            </div>

            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
              <div className={`p-3.5 rounded-2xl leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-850 rounded-tl-none'
              }`}>
                {renderMessageText(msg.text)}
                {msg.sender === 'ai' && msg.id !== 'welcome' && msg.id !== 'error_msg' && (
                  <div className="mt-2 pt-1.5 border-t border-slate-150 dark:border-slate-850 flex items-center gap-1 text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider font-mono">
                    <Terminal className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Coach Insight
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 italic text-xs py-1 pl-9">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-spin" />
            <span>AI Coach is processing context...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Suggestion Chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <button
          onClick={() => handleSuggestedPromptClick("What should I work on now?")}
          className="text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:hover:border-indigo-500/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer"
        >
          What should I focus on? 🤔
        </button>
        <button
          onClick={() => handleSuggestedPromptClick("I have an assignment due tomorrow, break it down")}
          className="text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:hover:border-indigo-500/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer"
        >
          Break down assignment 📚
        </button>
        <button
          onClick={() => handleSuggestedPromptClick("Recommend a productivity schedule")}
          className="text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:hover:border-indigo-500/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer"
        >
          Plan my day with AI 🗓️
        </button>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-xl transition-all border shrink-0 cursor-pointer ${
            isListening 
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
              : 'bg-white hover:bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-white'
          }`}
          title={isListening ? "Listening..." : "Speak task or query"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isListening ? "Listening..." : "Tell AI: 'Remind me to study history'..."}
          className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-slate-800 dark:text-white text-xs font-medium placeholder:text-slate-400"
        />

        <button
          type="submit"
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 shrink-0 cursor-pointer transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
