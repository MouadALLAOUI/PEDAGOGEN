'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Bot, User, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

const DEFAULT_SYSTEM = `You are PEDAGOGEN, an AI assistant specialized in generating pedagogical documents for Moroccan collège teachers (1AC, 2AC, 3AC). You follow the official Moroccan Ministry of Education curriculum guidelines. Reply in the same language as the user.`;

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [tokens, setTokens] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [useLocalModel, setUseLocalModel] = useState(false);
  const [localModelName, setLocalModelName] = useState('google/gemma-4-e2b');
  const [localModelUrl, setLocalModelUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [localApiType, setLocalApiType] = useState<'openai' | 'custom'>('openai');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setUseLocalModel(localStorage.getItem('pedagogen_use_local_model') === 'true');
    setLocalModelName(localStorage.getItem('pedagogen_local_model_name') || 'google/gemma-4-e2b');
    const type = (localStorage.getItem('pedagogen_local_api_type') as 'openai' | 'custom') || 'openai';
    setLocalApiType(type);
    const defaultUrl = type === 'openai' ? 'http://localhost:1234/v1/chat/completions' : 'http://localhost:1234/api/v1/chat';
    setLocalModelUrl(localStorage.getItem('pedagogen_local_model_url') || defaultUrl);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || generating) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setGenerating(true);

    const apiMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt,
          useLocalModel,
          localModelName,
          localModelUrl,
          localApiType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      if (reader) {
        setMessages((prev) => [...prev, { role: 'assistant', content: '', reasoning: '' }]);
        let assistantReasoning = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let streamError: string | null = null;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'reasoning') {
                assistantReasoning += event.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    reasoning: assistantReasoning,
                  };
                  return updated;
                });
              } else if (event.type === 'chunk') {
                assistantContent += event.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    reasoning: assistantReasoning,
                  };
                  return updated;
                });
              } else if (event.type === 'done') {
                setTokens(event.usage?.total_tokens || 0);
              } else if (event.type === 'error') {
                streamError = event.message;
              }
            } catch {
              // ignore JSON parse errors
            }
            
            if (streamError) {
              throw new Error(streamError);
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Erreur: ${err instanceof Error ? err.message : 'Échec de la génération'}`,
        };
        return updated;
      });
    } finally {
      setGenerating(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setTokens(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white mb-4">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Chatbot API</h1>
              <p className="text-white/60 text-sm mt-0.5">Testez votre modèle HuggingFace en direct</p>
            </div>
            <div className="flex items-center gap-2">
              {tokens > 0 && (
                <Badge variant="green">
                  <Zap size={12} className="mr-1" />
                  {tokens.toLocaleString()} tokens
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                {showSettings ? 'Masquer' : 'Paramètres'}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearChat} className="text-white/70 hover:text-white hover:bg-white/10">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <Card className="mb-4">
            <CardContent className="py-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-navy mb-1 block">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-2 p-3 rounded-lg bg-parchment-dark border border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useLocalModel}
                      onChange={(e) => {
                        setUseLocalModel(e.target.checked);
                        localStorage.setItem('pedagogen_use_local_model', String(e.target.checked));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 rounded-full bg-border peer-checked:bg-teal transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-navy">Utiliser le modèle local (LM Studio)</span>
                    <p className="text-xs text-muted">Exécuter la conversation sur http://localhost:1234/api/v1/chat</p>
                  </div>
                </label>
                
                {useLocalModel && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-navy mb-1 block">Nom du modèle local</label>
                    <input
                      type="text"
                      value={localModelName}
                      onChange={(e) => {
                        setLocalModelName(e.target.value);
                        localStorage.setItem('pedagogen_local_model_name', e.target.value);
                      }}
                      placeholder="google/gemma-4-e2b"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.length === 0 && (
            <div className="text-center py-20 text-muted">
              <Bot size={48} className="mx-auto mb-4 text-muted/30" />
              <p className="text-sm">Envoyez un message pour tester l&apos;API</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} className="text-teal" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-navy text-parchment rounded-br-md'
                    : 'bg-parchment-dark text-navy border border-border rounded-bl-md'
                }`}
              >
                {msg.content || msg.reasoning ? (
                  <>
                    {msg.role === 'assistant' && msg.reasoning && (
                      <details open className="mb-3 border-l-2 border-teal/40 pl-3 text-xs text-muted/80 bg-teal/5 p-2 rounded-md">
                        <summary className="cursor-pointer font-medium select-none text-teal hover:underline mb-1">
                          Pensée de l&apos;IA (Raisonnement)
                        </summary>
                        <div className="italic font-mono leading-relaxed whitespace-pre-wrap">
                          {msg.reasoning}
                        </div>
                      </details>
                    )}
                    {msg.content || (
                      <div className="flex items-center gap-2 text-muted text-xs italic">
                        <Loader2 size={12} className="animate-spin text-teal" />
                        <span>Réponse en cours de rédaction...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted text-xs italic">
                    <Loader2 size={12} className="animate-spin text-teal" />
                    <span>Le modèle local réfléchit... (génération en cours)</span>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={16} className="text-gold" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none min-h-[48px] max-h-[160px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 160) + 'px';
            }}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || generating}
            className="h-12 w-12 flex-shrink-0"
          >
            {generating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
