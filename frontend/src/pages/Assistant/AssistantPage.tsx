import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  Bot,
  Check,
  ChevronDown,
  Copy,
  History,
  ImagePlus,
  Info,
  MapPin,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Sprout,
  X,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { apiService } from '../../services/apiService';
import type { AIConversation, AIStatus } from '../../services/apiService';
import { FarmerAvatar } from '../../components/common/FarmerAvatar';

interface ChatMessage {
  id: string | number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  references?: string[];
  sourceBadge?: string;
  imageUrl?: string;
  imageSource?: string;
}

interface AttachedImage {
  file: File;
  previewUrl: string;
}

interface QuickPrompt {
  label: string;
  question: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Yellowing maize leaves',
    question: 'What information should I collect about yellowing maize leaves?',
  },
  {
    label: 'Livestock needing a vet',
    question: 'What signs in livestock need urgent veterinary attention?',
  },
  {
    label: 'Preparing for heavy rain',
    question: 'How can I prepare my farm for heavy rain?',
  },
  {
    label: 'Improving soil fertility',
    question: 'What are practical ways to improve soil fertility?',
  },
];

const formatRelativeTime = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return '';
  const minutes = Math.floor((Date.now() - parsed) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(parsed).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g).map((part, index) => {
    if ((part.startsWith('**') && part.endsWith('**')) ||
      (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={`${keyPrefix}-${index}`} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });

const renderAssistantText = (text: string): React.ReactNode => {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={`paragraph-${index}`} className="whitespace-pre-line">
          {renderInlineMarkdown(paragraph.join(' '), `paragraph-${index}`)}
        </p>,
      );
      index += 1;
      paragraph = [];
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const HeadingTag = heading[1].length <= 2 ? 'h3' : 'h4';
      blocks.push(
        <HeadingTag key={`heading-${index}`} className="text-sm font-bold text-slate-900">
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </HeadingTag>,
      );
      index += 1;
      continue;
    }

    if (/^(---+|\*\*\*+|___+)$/.test(line)) {
      flushParagraph();
      blocks.push(<hr key={`rule-${index}`} className="border-slate-200/80" />);
      index += 1;
      continue;
    }

    const unorderedItem = line.match(/^[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const isOrdered = Boolean(orderedItem);
      const items: string[] = [];
      while (lineIndex < lines.length) {
        const itemLine = lines[lineIndex].trim();
        const item = isOrdered
          ? itemLine.match(/^\d+[.)]\s+(.+)$/)
          : itemLine.match(/^[-*+]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        lineIndex += 1;
      }
      lineIndex -= 1;
      const ListTag = isOrdered ? 'ol' : 'ul';
      blocks.push(
        <ListTag
          key={`list-${index}`}
          className={`${isOrdered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5 marker:text-emerald-600`}
        >
          {items.map((item, itemIndex) => (
            <li key={`list-${index}-item-${itemIndex}`} className="pl-0.5">
              {renderInlineMarkdown(item, `list-${index}-item-${itemIndex}`)}
            </li>
          ))}
        </ListTag>,
      );
      index += 1;
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return <div className="space-y-2.5">{blocks}</div>;
};

const MessageImage: React.FC<{
  src: string;
  isProtected?: boolean;
  alt: string;
  onOpen: (url: string) => void;
}> = ({ src, isProtected = false, alt, onOpen }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(isProtected ? null : src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isProtected) {
      setResolvedSrc(src);
      setFailed(false);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;
    setResolvedSrc(null);
    setFailed(false);

    apiService.fetchPrivateImage(src)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setResolvedSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src, isProtected]);

  if (failed) {
    return (
      <div className="flex min-h-24 w-full min-w-48 items-center justify-center rounded-xl bg-slate-100 px-4 py-5 text-center text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
        This image could not be loaded.
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div
        className="h-36 w-full min-w-48 animate-pulse rounded-xl bg-slate-200/70"
        role="status"
        aria-label="Loading attached image"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(resolvedSrc)}
      className="block w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      aria-label={`${alt}. Open larger preview`}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        className="max-h-56 w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
      />
    </button>
  );
};

export const AssistantPage: React.FC = () => {
  const { farmer, activeFarm } = useFarmer();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const skipConversationLoad = useRef(false);

  // Release any locally created image previews when leaving the page.
  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!lightboxUrl) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lightboxUrl]);

  useEffect(() => {
    let active = true;
    apiService.getAIStatus()
      .then((status) => {
        if (active) {
          setAIStatus(status);
          setStatusError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatusError(error instanceof Error ? error.message : 'AI service status is unavailable.');
        }
      });
    apiService.getAIConversations()
      .then((items) => {
        if (!active) return;
        setConversations(items);
        setHistoryError(null);
        if (items.length) setConversationId(items[0].id);
      })
      .catch(() => {
        if (active) setHistoryError('Could not load conversation history.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (conversationId === null) {
      setMessages([]);
      return;
    }
    if (skipConversationLoad.current) {
      skipConversationLoad.current = false;
      return;
    }

    let active = true;
    setHistoryError(null);
    apiService.getAIConversation(conversationId)
      .then((conversation) => {
        if (!active) return;
        setMessages(conversation.messages.map((message) => ({
          id: message.id,
          sender: message.role === 'user' ? 'user' : 'ai',
          text: message.content,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          sourceBadge: message.role === 'assistant'
            ? message.is_demo ? 'Demonstration' : 'Gemini AI'
            : undefined,
          imageSource: message.image ?? undefined,
        })));
      })
      .catch((error: unknown) => {
        if (active) {
          setHistoryError(error instanceof Error ? error.message : 'Could not load this conversation.');
        }
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    if (messages.length === 0 && !isLoading) {
      feed.scrollTo({ top: 0 });
      setShowJumpToLatest(false);
      return;
    }

    feed.scrollTo({
      top: feed.scrollHeight,
      behavior: messages.length > 1 ? 'smooth' : 'auto',
    });
    setShowJumpToLatest(false);
  }, [messages, isLoading]);

  // Grow the composer with the answer, up to a comfortable limit.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${inputVal ? Math.min(textarea.scrollHeight, 128) : 40}px`;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [inputVal]);

  const providerLabel = aiStatus
    ? aiStatus.mock_mode
      ? 'Demonstration engine'
      : aiStatus.provider
        ? aiStatus.provider.charAt(0).toUpperCase() + aiStatus.provider.slice(1)
        : 'AI service'
    : 'Connecting';

  const statusLabel = statusError
    ? 'Status unavailable'
    : !aiStatus
      ? 'Connecting'
      : !aiStatus.available
        ? 'Unavailable'
        : aiStatus.mock_mode
          ? 'Demonstration'
          : 'Available';

  const statusVariant = statusError || (aiStatus && !aiStatus.available)
    ? 'error'
    : aiStatus?.available
      ? aiStatus.mock_mode ? 'warning' : 'success'
      : 'neutral';

  // Only exceptional states need a banner — the normal privacy note lives in the composer footer.
  const notice = (() => {
    if (statusError) {
      return {
        tone: 'error' as const,
        text: `Assistant status unavailable. ${statusError}`,
      };
    }
    if (aiStatus && !aiStatus.available) {
      return {
        tone: 'error' as const,
        text: 'The assistant is disabled or not configured. Questions cannot be sent until it is available.',
      };
    }
    if (aiStatus?.mock_mode) {
      return {
        tone: 'warning' as const,
        text: 'Demonstration mode — replies are examples, not agricultural guidance.',
      };
    }
    if (historyError) {
      return {
        tone: 'warning' as const,
        text: historyError,
      };
    }
    return null;
  })();

  const county = farmer.county || activeFarm.county;

  const handleImageSelect = (file: File | null | undefined) => {
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must not exceed 5 MB.');
      return;
    }

    if (attachedImage) {
      URL.revokeObjectURL(attachedImage.previewUrl);
      objectUrlsRef.current.delete(attachedImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.add(previewUrl);
    setAttachedImage({ file, previewUrl });
    setImageError(null);
  };

  const removeAttachedImage = () => {
    if (attachedImage) {
      URL.revokeObjectURL(attachedImage.previewUrl);
      objectUrlsRef.current.delete(attachedImage.previewUrl);
    }
    setAttachedImage(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (queryText?: string) => {
    const typedText = (queryText || inputVal).trim();
    const pendingImage = attachedImage;
    if ((!typedText && !pendingImage) || isLoading || !aiStatus?.available) return;

    // Keep the conversation readable when the farmer sends a photo without a caption.
    const textToSend = typedText || 'Please review the attached image and share what you can observe.';

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: pendingImage?.previewUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputVal('');
    setAttachedImage(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    try {
      let activeConversationId = conversationId;
      if (activeConversationId === null) {
        const conversation = await apiService.createAIConversation();
        activeConversationId = conversation.id;
        skipConversationLoad.current = true;
        setConversationId(conversation.id);
        setConversations((prev) => [conversation, ...prev]);
      }

      const reply = await apiService.sendAIMessage(
        activeConversationId,
        textToSend,
        pendingImage?.file,
      );
      setMessages((prev) => [...prev, {
        id: reply.id,
        sender: 'ai',
        text: reply.content,
        time: new Date(reply.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sourceBadge: reply.is_demo ? 'Demonstration' : 'Gemini AI',
      }]);
      setConversations((prev) => {
        const updated = prev.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                title: conversation.title === 'New consultation'
                  ? textToSend.slice(0, 97) +
                    (textToSend.length > 97 ? '...' : '')
                  : conversation.title,
                message_count: conversation.message_count + 2,
                updated_at: reply.created_at,
              }
            : conversation,
        );
        return updated.sort((first, second) =>
          Date.parse(second.updated_at) - Date.parse(first.updated_at),
        );
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The AI service is unavailable.';
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: `Your question was not answered. ${detail}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceBadge: 'Unavailable',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewChat = async () => {
    if (!aiStatus?.available || isLoading) return;
    setHistoryOpen(false);
    removeAttachedImage();
    setInputVal('');
    setIsLoading(true);
    try {
      const conversation = await apiService.createAIConversation();
      setConversations((prev) => [conversation, ...prev]);
      skipConversationLoad.current = true;
      setConversationId(conversation.id);
      setMessages([]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Could not create a conversation.';
      setHistoryError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string | number, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(String(id));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedScroll = () => {
    const feed = feedRef.current;
    if (!feed) return;
    const distanceFromBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 180);
  };

  const scrollToLatest = () => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
    setShowJumpToLatest(false);
  };

  const firstName = (farmer.preferredName || farmer.fullName).trim().split(/\s+/)[0];
  const canSend = Boolean(aiStatus?.available) && !isLoading;

  return (
    <div className="mx-auto flex h-[calc(100dvh-11.5rem)] min-h-[520px] w-full max-w-6xl flex-col gap-4 animate-in fade-in duration-150 motion-reduce:animate-none">
      <PageHeader
        eyebrow="Intelligence & Help"
        title="AI Agronomist"
        description="Farm-specific answers for your crops, livestock, soil and weather."
        icon={<Bot />}
        meta={
          <>
            <Badge variant={statusVariant} size="sm" hasDot>{statusLabel}</Badge>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>{providerLabel}</span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<History className="h-4 w-4" />}
                onClick={() => setHistoryOpen((open) => !open)}
                disabled={isLoading}
                aria-label="Conversation history"
                aria-haspopup="true"
                aria-expanded={historyOpen}
              >
                <span className="hidden sm:inline">History</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </Button>

              {historyOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setHistoryOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    aria-label="Conversation history"
                    className="absolute right-0 top-full z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                  >
                    <div className="border-b border-slate-100 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recent consultations
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1.5">
                      {conversations.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-slate-400">
                          Your consultations will appear here.
                        </p>
                      ) : (
                        conversations.map((conversation) => {
                          const isActive = conversation.id === conversationId;
                          return (
                            <button
                              key={conversation.id}
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => {
                                removeAttachedImage();
                                setInputVal('');
                                setConversationId(conversation.id);
                                setHistoryOpen(false);
                              }}
                              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                                isActive ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                              }`}
                            >
                              <span
                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                                  isActive ? 'bg-[#0F5132] text-[#8DE0A7]' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block truncate text-xs font-semibold ${
                                    isActive ? 'text-[#0F5132]' : 'text-slate-800'
                                  }`}
                                >
                                  {conversation.title}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span>
                                    {conversation.message_count}{' '}
                                    {conversation.message_count === 1 ? 'message' : 'messages'}
                                  </span>
                                  {formatRelativeTime(conversation.updated_at) && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{formatRelativeTime(conversation.updated_at)}</span>
                                    </>
                                  )}
                                </span>
                              </span>
                              {isActive && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-[#16804A]" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      disabled={!canSend}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-[#0F5132] transition-colors hover:bg-emerald-50/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Start a new consultation
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="forest"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleStartNewChat}
              disabled={!canSend}
            >
              <span className="hidden sm:inline">New consultation</span>
              <span className="sm:hidden">New chat</span>
            </Button>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className={`flex shrink-0 items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
            notice.tone === 'error'
              ? 'border-red-200 bg-red-50/70 text-red-900'
              : 'border-amber-200 bg-amber-50/70 text-amber-900'
          }`}
        >
          {notice.tone === 'error' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <p className="leading-5">{notice.text}</p>
        </div>
      )}

      <Card
        padding="none"
        className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_12px_36px_-30px_rgba(15,23,42,0.4)]"
      >
        {/* Conversation */}
        <div className="relative min-h-0 flex-1 bg-[#F8FAF9]">
          <div
            ref={feedRef}
            onScroll={handleFeedScroll}
            className="h-full overflow-y-auto px-4 py-6 sm:px-6"
          >
            <div className="mx-auto w-full max-w-3xl">
              {messages.length === 0 && !isLoading ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center py-6 text-center sm:min-h-[420px]">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E8F3EB] text-[#0F5132] ring-1 ring-emerald-100">
                    <Bot className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {firstName ? `Hello, ${firstName} — how can I help?` : 'Hello — how can I help?'}
                  </h2>
                  <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">
                    Ask about something you have seen on your farm, or attach a photo for a closer look.
                  </p>

                  <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                    {QUICK_PROMPTS.map(({ label, question }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleSend(question)}
                        disabled={!canSend}
                        className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-[13px] font-medium text-slate-700 shadow-2xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-[#0F5132] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16804A]/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) => {
                    const isUser = message.sender === 'user';
                    const isCopied = copiedId === String(message.id);

                    if (isUser) {
                      return (
                        <div key={message.id} className="flex justify-end gap-2.5">
                          <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[75%]">
                            <div className="w-full rounded-2xl rounded-br-md bg-[#0F5132] px-4 py-2.5 text-sm leading-6 text-white shadow-sm">
                              {(message.imageUrl || message.imageSource) && (
                                <div className="mb-2.5 overflow-hidden rounded-xl ring-1 ring-white/20">
                                  <MessageImage
                                    src={(message.imageUrl || message.imageSource) as string}
                                    isProtected={!message.imageUrl}
                                    alt="Photo attached to your question"
                                    onOpen={setLightboxUrl}
                                  />
                                </div>
                              )}
                              <p className="whitespace-pre-line break-words">{message.text}</p>
                            </div>
                            <span className="px-1 text-[10px] text-slate-400">{message.time}</span>
                          </div>
                          <FarmerAvatar
                            imageUrl={farmer.profilePictureUrl}
                            initials={farmer.avatarInitials || 'You'}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E8F3EB] text-[10px] font-bold text-[#0F5132] ring-1 ring-emerald-100"
                          />
                        </div>
                      );
                    }

                    // Routine engine labels are noise; only show states the farmer needs to know about.
                    const showSourceBadge =
                      message.sourceBadge === 'Demonstration' || message.sourceBadge === 'Unavailable';
                    const sourceTone = message.sourceBadge === 'Unavailable'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700';

                    return (
                      <div key={message.id} className="group flex items-start gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E8F3EB] text-[#0F5132] ring-1 ring-emerald-100">
                          <Bot className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5">
                            <span className="text-xs font-bold text-slate-800">AgroLink Assistant</span>
                            <span className="text-[10px] text-slate-400">{message.time}</span>
                            {showSourceBadge && (
                              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${sourceTone}`}>
                                {message.sourceBadge}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopy(message.id, message.text)}
                              aria-label={isCopied ? 'Copied to clipboard' : 'Copy response'}
                              className={`ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16804A]/40 sm:opacity-0 sm:group-hover:opacity-100 ${
                                isCopied ? 'text-[#16804A]' : 'text-slate-400'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>

                          <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-2xs">
                            {renderAssistantText(message.text)}

                            {message.references && message.references.length > 0 && (
                              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-xs">
                                <span className="mb-1 block font-bold text-emerald-900">
                                  Agronomic references
                                </span>
                                <ul className="space-y-0.5 text-emerald-800/80">
                                  {message.references.map((reference, referenceIndex) => (
                                    <li key={referenceIndex}>• {reference}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex items-start gap-2.5" aria-live="polite">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E8F3EB] text-[#0F5132] ring-1 ring-emerald-100">
                        <Bot className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-2xs">
                        <span className="flex items-center gap-1" aria-hidden="true">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#16804A] [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#16804A] [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#16804A]" />
                        </span>
                        <span>{aiStatus?.mock_mode ? 'Writing a demonstration reply…' : 'Thinking…'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {showJumpToLatest && (
            <button
              type="button"
              onClick={scrollToLatest}
              className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-md backdrop-blur transition-colors hover:border-emerald-300 hover:text-[#0F5132]"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              Latest
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-slate-200/80 bg-white px-3.5 py-3 sm:px-5">
          {attachedImage && (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <div className="relative shrink-0">
                <img
                  src={attachedImage.previewUrl}
                  alt="Selected farm photo preview"
                  className="h-11 w-11 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <button
                  type="button"
                  onClick={removeAttachedImage}
                  aria-label="Remove attached image"
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">
                  {attachedImage.file.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  Ready to attach · JPEG, PNG or WebP up to 5 MB
                </p>
              </div>
            </div>
          )}

          <div className="flex items-end gap-1.5 rounded-2xl border border-slate-200 bg-[#FBFCFA] p-1.5 transition-all focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                handleImageSelect(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSend}
              aria-label="Attach an image"
              title="Attach an image"
              className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F5132] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16804A]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={(event) => setInputVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              disabled={!canSend}
              maxLength={4000}
              placeholder={aiStatus?.available
                ? 'Ask about crop symptoms, livestock health, soil or weather…'
                : 'Assistant unavailable — questions cannot be sent right now.'}
              aria-label="Ask the AI agricultural assistant a question"
              className="min-h-10 max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!canSend || (!inputVal.trim() && !attachedImage)}
              aria-label="Send message"
              className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0F5132] text-white shadow-sm transition-colors hover:bg-[#0b3d27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {imageError && (
            <p role="alert" className="mt-1.5 px-1 text-[11px] font-semibold text-red-600">
              {imageError}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[11px] text-slate-400">
            <span>AI-generated answers — verify important decisions with an expert.</span>
            {(activeFarm.name || county) && (
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                {activeFarm.name && (
                  <span className="inline-flex max-w-[180px] items-center gap-1">
                    <Sprout className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="truncate">{activeFarm.name}</span>
                  </span>
                )}
                {county && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    {county}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </Card>

      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attached image preview"
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={lightboxUrl}
            alt="Attached farm photo enlarged"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
