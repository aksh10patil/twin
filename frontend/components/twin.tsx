'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowUp,
  RotateCcw,
  Square,
  Copy,
  Check,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import Icon from '@/public/Icon';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'What are your core technical skills & stack?',
  "Tell me about the systems and products you've built.",
  'What is your experience in AI and full-stack engineering?',
  'What kind of roles and projects are you focused on?',
];

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Subcomponent for Code Block rendering with language tag and copy button
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-zinc-800/90 bg-zinc-950 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[11px] text-zinc-400 font-mono">
        <span className="uppercase tracking-wider text-[10px] text-zinc-400 font-semibold">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-zinc-200 transition-colors py-0.5 px-1.5 rounded hover:bg-zinc-800"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto text-zinc-200 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Inline Markdown renderer (handles links, bold, code chips, and animated cursor caret)
function renderInlineText(text: string, isStreamingAtEnd?: boolean) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Markdown link: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a
          key={`l-${keyIdx++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 underline underline-offset-2 decoration-emerald-500/50 hover:decoration-emerald-400 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold text: **bold**
    if (remaining.startsWith('**')) {
      const end = remaining.indexOf('**', 2);
      if (end !== -1) {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-semibold text-zinc-100">
            {remaining.slice(2, end)}
          </strong>
        );
        remaining = remaining.slice(end + 2);
        continue;
      }
    }

    // Inline code: `code`
    if (remaining.startsWith('`')) {
      const end = remaining.indexOf('`', 1);
      if (end !== -1) {
        parts.push(
          <code
            key={`c-${keyIdx++}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/80 text-zinc-200 border border-zinc-750 font-mono text-xs"
          >
            {remaining.slice(1, end)}
          </code>
        );
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    // Find next special token
    const nextMarker = remaining.search(/\[|\*\*|`/);
    if (nextMarker === -1) {
      parts.push(remaining);
      break;
    } else if (nextMarker > 0) {
      parts.push(remaining.slice(0, nextMarker));
      remaining = remaining.slice(nextMarker);
    } else {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  if (isStreamingAtEnd) {
    parts.push(
      <span
        key="caret"
        className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-zinc-300 rounded-[1px] animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return parts;
}

// Safe streaming markdown block parser
function FormattedMessage({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const blocks = useMemo(() => {
    const list: Array<
      | { type: 'codeblock'; lang: string; code: string }
      | { type: 'prose'; text: string }
    > = [];

    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        list.push({
          type: 'prose',
          text: content.slice(lastIndex, match.index),
        });
      }
      list.push({
        type: 'codeblock',
        lang: match[1] || 'text',
        code: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      list.push({
        type: 'prose',
        text: content.slice(lastIndex),
      });
    }

    if (list.length === 0 && content.length > 0) {
      list.push({ type: 'prose', text: content });
    }

    return list;
  }, [content]);

  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1;

        if (block.type === 'codeblock') {
          return (
            <CodeBlock key={idx} lang={block.lang} code={block.code} />
          );
        }

        // Parse prose lines into paragraphs and list items
        const lines = block.text.split('\n');
        const elements: Array<
          | { type: 'p'; text: string }
          | { type: 'bullet'; items: string[] }
          | { type: 'numbered'; items: string[] }
          | { type: 'heading'; text: string }
        > = [];

        let currentBulletList: string[] | null = null;
        let currentNumberedList: string[] | null = null;
        let currentParagraph: string[] = [];

        const flushP = () => {
          if (currentParagraph.length > 0) {
            elements.push({ type: 'p', text: currentParagraph.join(' ') });
            currentParagraph = [];
          }
        };

        const flushLists = () => {
          if (currentBulletList) {
            elements.push({ type: 'bullet', items: currentBulletList });
            currentBulletList = null;
          }
          if (currentNumberedList) {
            elements.push({ type: 'numbered', items: currentNumberedList });
            currentNumberedList = null;
          }
        };

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            flushP();
            flushLists();
            continue;
          }

          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            flushP();
            flushLists();
            elements.push({
              type: 'heading',
              text: trimmed.replace(/^#{2,3}\s+/, ''),
            });
            continue;
          }

          const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
          const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);

          if (bulletMatch) {
            flushP();
            if (currentNumberedList) flushLists();
            if (!currentBulletList) currentBulletList = [];
            currentBulletList.push(bulletMatch[2]);
          } else if (numMatch) {
            flushP();
            if (currentBulletList) flushLists();
            if (!currentNumberedList) currentNumberedList = [];
            currentNumberedList.push(numMatch[3]);
          } else {
            flushLists();
            currentParagraph.push(line);
          }
        }
        flushP();
        flushLists();

        return (
          <div key={idx} className="space-y-2.5">
            {elements.map((el, elIdx) => {
              const isLastElement =
                isLastBlock && elIdx === elements.length - 1;

              if (el.type === 'heading') {
                return (
                  <h3
                    key={elIdx}
                    className="font-semibold text-zinc-100 text-sm pt-1"
                  >
                    {renderInlineText(
                      el.text,
                      isStreaming && isLastElement
                    )}
                  </h3>
                );
              }

              if (el.type === 'bullet') {
                return (
                  <ul key={elIdx} className="space-y-1.5 my-1.5 pl-1">
                    {el.items.map((item, itemIdx) => {
                      const isLastItem =
                        isLastElement && itemIdx === el.items.length - 1;
                      return (
                        <li
                          key={itemIdx}
                          className="flex items-start gap-2 text-zinc-200"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
                          <span className="flex-1">
                            {renderInlineText(
                              item,
                              isStreaming && isLastItem
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              if (el.type === 'numbered') {
                return (
                  <ol key={elIdx} className="space-y-1.5 my-1.5 pl-1">
                    {el.items.map((item, itemIdx) => {
                      const isLastItem =
                        isLastElement && itemIdx === el.items.length - 1;
                      return (
                        <li
                          key={itemIdx}
                          className="flex items-start gap-2 text-zinc-200"
                        >
                          <span className="text-xs font-mono font-medium text-zinc-400 mt-0.5 shrink-0">
                            {itemIdx + 1}.
                          </span>
                          <span className="flex-1">
                            {renderInlineText(
                              item,
                              isStreaming && isLastItem
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                );
              }

              return (
                <p key={elIdx} className="text-zinc-200">
                  {renderInlineText(
                    el.text,
                    isStreaming && isLastElement
                  )}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function Twin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fluid typing stream refs
  const targetTextRef = useRef('');
  const displayedLengthRef = useRef(0);
  const activeMessageIdRef = useRef<string | null>(null);
  const streamDoneRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // Smooth scroll logic
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceToBottom < 75;
    setIsNearBottom(atBottom);
    shouldAutoScrollRef.current = atBottom;
  };

  // Fluid token easing loop via requestAnimationFrame
  const startFluidLoop = useCallback(() => {
    if (animFrameRef.current !== null) return;

    const tick = () => {
      const target = targetTextRef.current;
      const currentLen = displayedLengthRef.current;
      const remaining = target.length - currentLen;

      if (remaining > 0) {
        // Organic typing rate: dynamically adapt to buffer depth
        let charsToAdd = 1;
        if (streamDoneRef.current) {
          // When network stream is done, drain remainder smoothly and quickly
          charsToAdd = Math.max(1, Math.min(remaining, Math.ceil(remaining / 3)));
        } else if (remaining > 60) {
          charsToAdd = Math.ceil(remaining / 4);
        } else if (remaining > 25) {
          charsToAdd = Math.ceil(remaining / 6);
        } else if (remaining > 8) {
          charsToAdd = 2;
        } else {
          charsToAdd = 1;
        }

        const nextLen = Math.min(target.length, currentLen + charsToAdd);
        displayedLengthRef.current = nextLen;
        const nextContent = target.slice(0, nextLen);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeMessageIdRef.current
              ? { ...m, content: nextContent }
              : m
          )
        );

        if (shouldAutoScrollRef.current) {
          scrollToBottom(false);
        }
      }

      // Continue animating if tokens remain or network is still streaming
      if (remaining > 0 || !streamDoneRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Stream completed and buffer fully drained
        animFrameRef.current = null;
        setIsGenerating(false);
        setIsThinking(false);
        activeMessageIdRef.current = null;
        if (shouldAutoScrollRef.current) {
          scrollToBottom(true);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [scrollToBottom]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const stopGeneration = () => {
    if (!isGenerating) return;
    abortControllerRef.current?.abort();
    streamDoneRef.current = true;
    targetTextRef.current = targetTextRef.current.slice(
      0,
      displayedLengthRef.current
    );
    setIsGenerating(false);
    setIsThinking(false);
  };

  const copyMessageContent = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // fallback
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isGenerating) return;

    // Reset input
    if (!overrideText) setInput('');

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    // Reset fluid buffer refs
    targetTextRef.current = '';
    displayedLengthRef.current = 0;
    activeMessageIdRef.current = assistantId;
    streamDoneRef.current = false;
    shouldAutoScrollRef.current = true;

    setIsGenerating(true);
    setIsThinking(true);
    startFluidLoop();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      let response: Response | null = null;

      // Try streaming endpoint first
      try {
        response = await fetch(`${apiBase}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream, application/json, */*',
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId || undefined,
            stream: true,
          }),
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        // Proceed to fallback
      }

      // Fallback to /chat with stream: true if /chat/stream was not available
      if (!response || !response.ok) {
        response = await fetch(`${apiBase}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream, application/json, */*',
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId || undefined,
            stream: true,
          }),
          signal: controller.signal,
        });
      }

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // If response is SSE or ReadableStream
      if (
        (contentType.includes('text/event-stream') || response.body) &&
        !contentType.includes('application/json')
      ) {
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let sseBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            sseBuffer += chunk;

            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;

              if (trimmed.startsWith('data:')) {
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') {
                  streamDoneRef.current = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.session_id && !sessionId) {
                    setSessionId(parsed.session_id);
                  }
                  if (parsed.type === 'session' && parsed.session_id) {
                    setSessionId(parsed.session_id);
                  } else if (
                    parsed.type === 'content' ||
                    parsed.type === 'token'
                  ) {
                    const delta = parsed.delta ?? parsed.content ?? '';
                    if (delta) {
                      setIsThinking(false);
                      targetTextRef.current += delta;
                    }
                  } else if (parsed.type === 'done') {
                    if (parsed.session_id && !sessionId) {
                      setSessionId(parsed.session_id);
                    }
                    streamDoneRef.current = true;
                  }
                } catch {
                  // Raw chunk delta
                  setIsThinking(false);
                  targetTextRef.current += dataStr;
                }
              } else {
                // Non-SSE text stream line
                setIsThinking(false);
                targetTextRef.current += trimmed;
              }
            }
          }

          streamDoneRef.current = true;
          return;
        }
      }

      // If standard JSON response (backward compatibility / legacy Lambda URL)
      const data = await response.json();
      if (!sessionId && data.session_id) {
        setSessionId(data.session_id);
      }
      setIsThinking(false);
      targetTextRef.current =
        data.response ||
        'Sorry, I could not generate a response. Please try again.';
      streamDoneRef.current = true;
    } catch (error: unknown) {
      if ((error as Error)?.name === 'AbortError') {
        // User deliberately stopped generation
        streamDoneRef.current = true;
        return;
      }
      console.error('Streaming chat error:', error);
      setIsThinking(false);
      targetTextRef.current =
        'Sorry, I encountered an issue retrieving an answer. Please verify the backend connection and try again.';
      streamDoneRef.current = true;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    if (isGenerating) {
      stopGeneration();
    }
    setMessages([]);
    setSessionId('');
    setInput('');
    targetTextRef.current = '';
    displayedLengthRef.current = 0;
    activeMessageIdRef.current = null;
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 select-text">
      {/* Clean & Professional Header */}
      <header className="shrink-0 z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/80 shrink-0">
            <Icon size={36} />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950 transition-colors ${
                isGenerating ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Rajdeep Patil
              </h1>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                AI Twin
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {isGenerating ? (
                <span className="text-emerald-400 font-medium animate-pulse">
                  Streaming response...
                </span>
              ) : (
                'Online · Ask anything about my work & background'
              )}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
            title="Start new conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        )}
      </header>

      {/* Main Conversation Stream */}
      <main
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col relative"
      >
        <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-start">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-2 max-w-xl mx-auto animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-zinc-300 shadow-inner">
                <Icon size={64} />
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100 mb-2">
                Ask me anything about my work
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8 max-w-md">
                This is my verified AI twin. Feel free to ask about my engineering
                experience, projects, architecture, and technical stack.
              </p>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    disabled={isGenerating}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 text-xs sm:text-sm text-zinc-300 hover:text-zinc-100 transition-all text-left flex items-start justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{question}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((message) => {
                const isStreamingMessage =
                  isGenerating && message.id === activeMessageIdRef.current;
                const isCurrentThinking =
                  isThinking &&
                  message.id === activeMessageIdRef.current &&
                  message.content.length === 0;

                // Don't render empty unthinking assistant bubble
                if (
                  message.role === 'assistant' &&
                  !message.content &&
                  !isCurrentThinking
                ) {
                  return null;
                }

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3.5 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } group`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-sm">
                        <Icon size={20} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
                        message.role === 'user'
                          ? 'bg-zinc-100 text-zinc-950 font-medium rounded-tr-sm shadow-sm'
                          : 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <div>
                          {isCurrentThinking ? (
                            <div className="flex items-center gap-2.5 py-1 text-xs text-zinc-400">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className="animate-pulse font-medium text-zinc-300">
                                Rajdeep is thinking...
                              </span>
                            </div>
                          ) : (
                            <FormattedMessage
                              content={message.content}
                              isStreaming={isStreamingMessage}
                            />
                          )}
                        </div>
                      )}

                      {/* Footer: Timestamp and Message Copy Button */}
                      <div
                        className={`text-[10px] mt-2 font-normal flex items-center justify-between gap-3 ${
                          message.role === 'user'
                            ? 'text-zinc-500 text-right'
                            : 'text-zinc-500'
                        }`}
                      >
                        <span>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {message.role === 'assistant' &&
                          message.content.length > 0 &&
                          !isStreamingMessage && (
                            <button
                              onClick={() =>
                                copyMessageContent(message.id, message.content)
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:text-zinc-300 p-0.5"
                              title="Copy answer"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Jump to Latest Button */}
        {!isNearBottom && messages.length > 0 && (
          <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none">
            <button
              onClick={() => scrollToBottom(true)}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/95 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 shadow-xl backdrop-blur transition-all"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Jump to latest</span>
            </button>
          </div>
        )}
      </main>

      {/* Input Bar */}
      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 rounded-2xl px-4 py-2 transition-colors shadow-sm">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about Rajdeep..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              disabled={isGenerating}
            />

            {isGenerating ? (
              <button
                onClick={stopGeneration}
                aria-label="Stop generating"
                title="Stop generating"
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors shrink-0 border border-zinc-700"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                aria-label="Send message"
                className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-20 disabled:hover:bg-zinc-100 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-center text-zinc-500 mt-2">
            Responses are streamed in real time by AI representing Rajdeep Patil
            based on actual projects and experience.
          </p>
        </div>
      </footer>
    </div>
  );
}
