import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Terminal,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: Array<{ tool: string; result: any }>;
  sources?: Array<{ documentTitle: string; similarityScore: number; content?: string }>;
  tokensUsed?: number;
  model?: string;
}

export const AiAssistantView: React.FC = () => {
  const { user, activeCampus } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'tools'>('chat');
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting based on role
    const greeting: ChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: `Hello ${user?.fullName || 'User'}, I am your OmniEdu AI Educational Copilot. I have role-scoped access to ${activeCampus?.name || 'your institution'}'s student records, attendance analytics, academic marksheets, and institutional regulations.\n\nHow may I assist your academic workflow today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([greeting]);
  }, [user, activeCampus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/ai/chat', {
        message: userMessage.content,
        conversationId,
      });

      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        if (d.conversationId) setConversationId(d.conversationId);

        const aiMessage: ChatMessage = {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: d.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolCalls: d.toolCalls,
          sources: d.sources,
          tokensUsed: d.tokensUsed,
          model: d.model,
        };
        setMessages((prev) => [...prev, aiMessage]);
        if (d.sources?.length > 0 || d.toolCalls?.length > 0) {
          setSelectedMessage(aiMessage);
        }
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `I encountered an issue processing your request: ${err.message || 'Network error'}. Please verify tenant connectivity or retry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  const clearChat = () => {
    setConversationId(undefined);
    setMessages([
      {
        id: 'new_chat',
        role: 'assistant',
        content: 'New session started. How can I assist you with your campus management tasks?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSelectedMessage(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto p-4 md:p-6 gap-4">
      {/* Top Banner with Safety & Guardrail Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20 rounded-2xl px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-100">OmniEdu AI Copilot</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Advisory Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Role Scoped: <span className="text-slate-300 font-medium">{user?.role || 'Campus User'}</span> • Tenant: <span className="text-slate-300 font-medium">{activeCampus?.name || 'Active Campus'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PII Redacted & Prompt-Safe</span>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Layout: Chat Stream + Context Inspector Drawer */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Chat Flow */}
        <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] md:max-w-[75%] space-y-2`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Tool Calls Execution Tag */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5">
                          {m.toolCalls.map((tc, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedMessage(m);
                                setActiveTab('tools');
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono hover:bg-amber-500/20 transition"
                            >
                              <Terminal className="w-3 h-3" />
                              <span>tool:{tc.tool}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* RAG Knowledge Citations Tag */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.sources.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedMessage(m);
                                setActiveTab('sources');
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-mono hover:bg-blue-500/20 transition"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{s.documentTitle}</span>
                              <span className="opacity-75">({Math.round(s.similarityScore * 100)}%)</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center gap-2 text-[10px] text-slate-500 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span>{m.timestamp}</span>
                      {m.tokensUsed && <span>• {m.tokensUsed} tokens</span>}
                      {m.model && <span>• {m.model}</span>}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-slate-700/60 border border-slate-600/40 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                  <span>Executing role-scoped ERP tools & querying RAG sources...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starters */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/30 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-500 font-medium whitespace-nowrap">Suggested:</span>
              <button
                onClick={() => handleQuickPrompt('Who are the attendance defaulters below 75% in the computer science department?')}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition"
              >
                Attendance Defaulters (&lt;75%)
              </button>
              <button
                onClick={() => handleQuickPrompt('What are the university regulations regarding condonation fee for shortage of attendance?')}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition"
              >
                Condonation Bylaws
              </button>
              <button
                onClick={() => handleQuickPrompt('Give me a high-level summary of outstanding fee collections and upcoming exams.')}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition"
              >
                Fee Summary & Exams
              </button>
            </div>
          )}

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-slate-800/80 bg-slate-950/50 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about student attendance, marks, fees, or institutional regulations..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

        {/* Right Drawer: Tool & Citation Inspector */}
        {selectedMessage && (
          <div className="hidden lg:flex flex-col w-80 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('sources')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === 'sources'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Citations ({selectedMessage.sources?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === 'tools'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Tools ({selectedMessage.toolCalls?.length || 0})</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === 'sources' && (
                <>
                  {!selectedMessage.sources || selectedMessage.sources.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">No RAG citations for this turn.</div>
                  ) : (
                    selectedMessage.sources.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                          <span className="truncate">{s.documentTitle}</span>
                          <span className="text-emerald-400 font-mono text-[10px]">
                            {Math.round(s.similarityScore * 100)}% Match
                          </span>
                        </div>
                        {s.content && (
                          <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed font-serif">
                            "{s.content}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === 'tools' && (
                <>
                  {!selectedMessage.toolCalls || selectedMessage.toolCalls.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">No tools executed for this turn.</div>
                  ) : (
                    selectedMessage.toolCalls.map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-amber-300 font-semibold">{tc.tool}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            SUCCESS
                          </span>
                        </div>
                        <pre className="p-2 rounded bg-slate-950/80 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                          {JSON.stringify(tc.result, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AiAssistantView;
