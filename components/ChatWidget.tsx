"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCatalogOpenIntent } from "@/lib/catalog-intent";
import {
  CHAT_ACCESS_PROFILE_COOKIE,
  serializeChatAccessProfileCookieValue,
} from "@/lib/chat-access-profile";
import { sanitizeChatText } from "@/lib/chat-text";
import { SignInCard2 } from "@/components/ui/sign-in-card-2";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "text" | "loading" | "file" | "quote";
  productCard?: {
    title: string;
    description: string;
    priceLabel: string;
    discountLabel: string | null;
    productUrl: string;
    imageUrl: string | null;
  } | null;
};

type ChatWidgetProps = {
  clientId?: string;
  username?: string;
  apiBaseUrl?: string;
  sessionId?: string;
};

type CustomerProfile = {
  name: string;
  email?: string;
  anonymousTest?: boolean;
  authenticated?: boolean;
};

type QuoteDraft = {
  name?: string;
  company?: string;
  city?: string;
  email?: string;
  phone?: string;
  support?: "istanza" | "server" | "macchina locale";
  aiType?: "primum open source";
  training?: "soft" | "medium" | "enterprise";
  customizations?: string;
};

type ChatStreamEvent =
  | { type: "meta"; assistantName?: string }
  | { type: "delta"; text?: string }
  | {
      type: "done";
      payload?: {
        reply?: string;
        assistantName?: string;
        error?: string;
        productCard?: Message["productCard"];
      };
    };

const STARTER_PROMPT_POOL = [
  "Cosa puoi fare per la mia azienda?",
  "Come puo tornarmi utile EasyVox?",
  "Che differenza c'e tra chat AI e operatore umano?",
  "Che cosa e un server locale?",
  "Posso usarlo per raccogliere contatti dal sito?",
  "Puoi aiutarmi con preventivi e richieste clienti?",
  "Quanto costa partire con EasyVox?",
  "Quale soluzione mi consigli per una piccola impresa?",
  "Posso addestrare l'assistente sui miei servizi?",
  "Come funziona l'installazione sul mio sito?",
] as const;

function pickStarterPrompts(pool: readonly string[], count: number): string[] {
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function pickNextPrompt(pool: readonly string[], currentPrompt: string, usedPrompts: string[]): string {
  const excluded = new Set([...usedPrompts, currentPrompt]);
  const candidates = pool.filter((prompt) => !excluded.has(prompt));
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const fallback = pool.filter((prompt) => prompt !== currentPrompt);
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return currentPrompt;
}

function persistChatAccessProfile(profile: CustomerProfile | null) {
  if (typeof document === "undefined") return;

  if (!profile || profile.anonymousTest) {
    document.cookie = `${CHAT_ACCESS_PROFILE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } else {
    document.cookie = `${CHAT_ACCESS_PROFILE_COOKIE}=${serializeChatAccessProfileCookieValue({
      name: profile.name,
      email: profile.email,
    })}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  }

  window.dispatchEvent(new Event("easyvox:chat-profile-updated"));
}

function MarkdownMessage({ text, isUser }: { text: string; isUser: boolean }) {
  const textColor = isUser ? "#ffffff" : "inherit";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: "0 0 0 18px", padding: 0 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "0 0 0 18px", padding: 0 }}>{children}</ol>,
        li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
        strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        code: ({ children }) => (
          <code
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.92em",
              background: isUser ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)",
              padding: "1px 4px",
              borderRadius: 4,
              color: textColor,
            }}
          >
            {children}
          </code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function ProductCardMessage({ productCard }: { productCard: NonNullable<Message["productCard"]> }) {
  return (
    <article
      style={{
        width: "100%",
        maxWidth: 420,
        display: "grid",
        gap: 10,
        justifyItems: "start",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: "#374151",
        }}
      >
        {productCard.description}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            padding: "5px 9px",
            background: "#eceff3",
            color: "#111827",
            fontSize: 11,
            fontWeight: 600,
            border: "1px solid rgba(17, 24, 39, 0.08)",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          {productCard.priceLabel}
        </span>
        {productCard.discountLabel ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              padding: "5px 9px",
              background: "#eceff3",
              color: "#111827",
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid rgba(17, 24, 39, 0.08)",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            Sconto {productCard.discountLabel}
          </span>
        ) : null}
        <Link
          href={productCard.productUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            padding: "5px 9px",
            background: "#eceff3",
            color: "#111827",
            textDecoration: "none",
            fontSize: 11,
            fontWeight: 600,
            border: "1px solid rgba(17, 24, 39, 0.08)",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          Acquista
        </Link>
      </div>
    </article>
  );
}

function isQuoteIntent(text: string) {
  const normalized = text.toLowerCase();
  return [
    "preventivo",
    "stima",
    "proposta economica",
    "offerta economica",
    "quanto verrebbe",
    "quanto mi costerebbe",
  ].some((keyword) => normalized.includes(keyword));
}

function extractQuoteDraftFromText(text: string): QuoteDraft {
  const extract = (label: string) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, "i"));
    return match?.[1]?.trim() ?? "";
  };

  const supportValue = extract("Supporto").toLowerCase();
  const trainingValue = extract("Addestramento").toLowerCase();
  const aiTypeValue = extract("Tipologia AI").toLowerCase();

  return {
    name: extract("Nome"),
    company: extract("Ditta"),
    city: extract("Citta") || extract("Città"),
    email: extract("Email"),
    phone: extract("Telefono"),
    support:
      supportValue === "server"
        ? "server"
        : supportValue === "macchina locale"
        ? "macchina locale"
        : supportValue === "istanza"
        ? "istanza"
        : undefined,
    aiType: aiTypeValue === "primum open source" ? "primum open source" : undefined,
    training:
      trainingValue === "medium"
        ? "medium"
        : trainingValue === "enterprise"
        ? "enterprise"
        : trainingValue === "soft"
        ? "soft"
        : undefined,
    customizations: extract("Customizzazione"),
  };
}

export function ChatWidget({ clientId, username, apiBaseUrl = "", sessionId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileEmailInput, setProfileEmailInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profilingRequired, setProfilingRequired] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [tenantSuspended, setTenantSuspended] = useState(false);
  const [chatUserEmail, setChatUserEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [chatAuthMode, setChatAuthMode] = useState<"login" | "register">("login");
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [assistantName, setAssistantName] = useState("Assistant");
  const [appSettingsHref, setAppSettingsHref] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hoveredCopyMessageId, setHoveredCopyMessageId] = useState<string | null>(null);
  const [hoveredSpeakMessageId, setHoveredSpeakMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [starterPrompts, setStarterPrompts] = useState<string[]>([]);
  const [fadingPromptSlots, setFadingPromptSlots] = useState<boolean[]>([]);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const speechTokenRef = useRef(0);
  const submitMessageRef = useRef<(message: string) => Promise<void>>(async () => {});
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tenantHeaderKey = clientId ? "x-client-id" : "x-client-slug";
  const tenantHeaderValue = (clientId ?? username ?? "").trim();
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionId ?? "");
  const tenantLabel = clientId ? clientId : username ? username : "Vox";
  const isDemoMode = !tenantHeaderValue;
  const authGateRequired = !tenantSuspended && authRequired && !chatUserEmail;
  const customerIdentityRequired = !authGateRequired && !customerProfile;
  const showEntryModal = customerIdentityRequired && !customerProfile;
  const demoMessagesStorageKey = useMemo(
    () => `easyvox-chat-messages:${tenantHeaderKey}:${tenantHeaderValue || "demo"}:${resolvedSessionId || "none"}`,
    [tenantHeaderKey, tenantHeaderValue, resolvedSessionId],
  );
  const demoAssistantStorageKey = useMemo(
    () => `easyvox-chat-assistant:${tenantHeaderKey}:${tenantHeaderValue || "demo"}:${resolvedSessionId || "none"}`,
    [tenantHeaderKey, tenantHeaderValue, resolvedSessionId],
  );

  function appendMessage(message: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID() }]);
  }

  function clearLoadingMessage() {
    setMessages((prev) => prev.filter((message) => message.kind !== "loading"));
  }

  async function copyMessageText(message: Message) {
    const content = message.kind === "file" ? `[allegato] ${message.text}` : message.text;
    if (!content.trim()) return;

    const fallbackCopy = () => {
      if (typeof document === "undefined") return;
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    };

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }

    setCopiedMessageId(message.id);
    if (copyFeedbackTimerRef.current) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopiedMessageId((current) => (current === message.id ? null : current));
      copyFeedbackTimerRef.current = null;
    }, 1200);
  }

  function cancelSpeech() {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  }

  function speakMessageText(message: Message) {
    if (message.role !== "assistant") return;
    const content = message.kind === "file" ? `[allegato] ${message.text}` : message.text;
    if (!content.trim()) return;
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;

    if (speakingMessageId === message.id) {
      speechTokenRef.current += 1;
      cancelSpeech();
      setSpeakingMessageId(null);
      return;
    }

    speechTokenRef.current += 1;
    const token = speechTokenRef.current;
    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "it-IT";
    utterance.onend = () => {
      if (speechTokenRef.current === token) {
        setSpeakingMessageId(null);
      }
    };
    utterance.onerror = () => {
      if (speechTokenRef.current === token) {
        setSpeakingMessageId(null);
      }
    };

    window.speechSynthesis.speak(utterance);
    setSpeakingMessageId(message.id);
  }

  function appendToMessageById(messageId: string, chunk: string) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, kind: "text", text: `${message.text}${chunk}` } : message,
      ),
    );
  }

  function setMessageTextById(messageId: string, text: string) {
    setMessages((prev) =>
      prev.map((message) => (message.id === messageId ? { ...message, kind: "text", text } : message)),
    );
  }

  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (tenantHeaderValue) headers[tenantHeaderKey] = tenantHeaderValue;
    return headers;
  }, [tenantHeaderKey, tenantHeaderValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const verificationStatus = url.searchParams.get("chatEmailVerification");
    if (!verificationStatus) return;

    if (verificationStatus === "success") {
      setLoginNotice("Email confermata. Ora sei riconosciuto nella chat.");
      setChatAuthMode("login");
    } else if (verificationStatus === "expired") {
      setLoginError("Il link di conferma e scaduto. Registrati di nuovo per ricevere una nuova email.");
      setChatAuthMode("register");
    } else {
      setLoginError("Link di conferma non valido.");
    }

    url.searchParams.delete("chatEmailVerification");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/auth/me`)
      .then(async (response) => {
        if (!response.ok) {
          return { user: null, isEasyVoxAdmin: false };
        }
        return (await response.json()) as {
          user?: { email?: string; name?: string | null } | null;
          isEasyVoxAdmin?: boolean;
        };
      })
      .then((data) => {
        if (!data.user) {
          setAppSettingsHref(null);
          return;
        }
        const resolvedEmail = data.user.email?.trim().toLowerCase() ?? "";
        const resolvedName =
          data.user.name?.trim() ||
          resolvedEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
          "Cliente";
        if (resolvedEmail) {
          setCustomerProfile((current) => {
            if (current?.authenticated || current?.anonymousTest) {
              return current;
            }

            return {
              name: resolvedName,
              email: resolvedEmail,
              authenticated: true,
            };
          });
        }
        setAppSettingsHref(data.isEasyVoxAdmin ? "/admin/system-settings#easyvox-system-prompt" : null);
      })
      .catch(() => {
        setAppSettingsHref(null);
      });
  }, [apiBaseUrl]);

  useEffect(() => {
    if (sessionId) {
      setResolvedSessionId(sessionId);
      return;
    }
    if (typeof window === "undefined") return;
    const generated = crypto.randomUUID();
    setMessages([]);
    setCustomerProfile(null);
    setProfileNameInput("");
    setProfileEmailInput("");
    setProfileError("");
    setResolvedSessionId(generated);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!resolvedSessionId) return;
    window.sessionStorage.setItem("easyvox:last-session-id", resolvedSessionId);
  }, [resolvedSessionId]);

  useEffect(() => {
    if (!tenantHeaderValue) {
      setProfilingRequired(false);
      return;
    }
    const query = clientId
      ? `clientId=${encodeURIComponent(clientId)}`
      : `clientSlug=${encodeURIComponent(tenantHeaderValue)}`;
    fetch(`${apiBaseUrl}/api/internal/client-exists?${query}`)
      .then((response) => response.json())
      .then((data: { requireProfiling?: boolean; requireUserAuthForChat?: boolean; isSuspended?: boolean }) => {
        setProfilingRequired(Boolean(data.requireProfiling));
        setAuthRequired(Boolean(data.requireUserAuthForChat));
        setTenantSuspended(Boolean(data.isSuspended));
      })
      .catch(() => {
        setProfilingRequired(false);
        setAuthRequired(false);
        setTenantSuspended(false);
      });
  }, [apiBaseUrl, clientId, tenantHeaderValue]);

  useEffect(() => {
    if (!tenantHeaderValue) {
      setChatUserEmail("");
      return;
    }

    const headers: Record<string, string> = {};
    headers[tenantHeaderKey] = tenantHeaderValue;
    fetch(`${apiBaseUrl}/api/chat-auth/me`, { headers })
      .then((response) => response.json())
      .then((data: { user?: { email?: string; name?: string | null } | null }) => {
        const resolvedEmail = data.user?.email?.trim().toLowerCase() ?? "";
        const resolvedName = data.user?.name?.trim() ?? "";
        setChatUserEmail(resolvedEmail);
        if (resolvedEmail) {
          setCustomerProfile((current) => {
            if (current?.anonymousTest) {
              return current;
            }

            const fallbackName =
              resolvedName || resolvedEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Cliente";

            return {
              name: current?.name || fallbackName,
              email: resolvedEmail,
              authenticated: true,
            };
          });
        }
      })
      .catch(() => {
        setChatUserEmail("");
      });
  }, [apiBaseUrl, tenantHeaderKey, tenantHeaderValue]);

  useEffect(() => {
    if (!resolvedSessionId) return;
    if (isDemoMode) return;
    if (tenantSuspended) {
      setMessages([]);
      return;
    }
    if (authRequired && !chatUserEmail) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          sessionId: resolvedSessionId,
          limit: "80",
        });
        const response = await fetch(`${apiBaseUrl}/api/chat/history?${params.toString()}`, {
          headers: tenantHeaders,
        });
        const data = (await response.json()) as {
          messages?: Message[];
          assistantName?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Errore caricamento cronologia");
        }
        if (cancelled) return;
        setMessages(data.messages ?? []);
        setAssistantName(data.assistantName?.trim() || "Assistant");
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    fetchHistory().catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, authRequired, chatUserEmail, isDemoMode, resolvedSessionId, tenantHeaders, tenantSuspended]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!customerProfile || customerProfile.anonymousTest) return;
    window.dispatchEvent(
      new CustomEvent("easyvox:quote-prefill", {
        detail: {
          name: customerProfile.name,
          email: customerProfile.email ?? "",
        } satisfies QuoteDraft,
      }),
    );
  }, [customerProfile]);

  useEffect(() => {
    const initialPrompts = pickStarterPrompts(STARTER_PROMPT_POOL, 4);
    setStarterPrompts(initialPrompts);
    setFadingPromptSlots(initialPrompts.map(() => false));
  }, []);

  useEffect(() => {
    if (starterPrompts.length === 0) return;

    const fadeDurationMs = 420;
    const swapTimers = starterPrompts.map((_, slotIndex) =>
      window.setInterval(() => {
        setFadingPromptSlots((current) => current.map((value, index) => (index === slotIndex ? true : value)));
        window.setTimeout(() => {
          setStarterPrompts((current) => {
            const next = [...current];
            next[slotIndex] = pickNextPrompt(STARTER_PROMPT_POOL, current[slotIndex] ?? "", current);
            return next;
          });
          setFadingPromptSlots((current) => current.map((value, index) => (index === slotIndex ? false : value)));
        }, fadeDurationMs);
      }, 22000 + slotIndex * 1200),
    );

    return () => {
      swapTimers.forEach((timer) => window.clearInterval(timer));
    };
  }, [starterPrompts]);

  useEffect(() => {
    if (!isDemoMode || !resolvedSessionId) return;
    if (typeof window === "undefined") return;

    try {
      const storedMessages = window.localStorage.getItem(demoMessagesStorageKey);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages) as Message[];
        const normalized = parsed.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.text === "string",
        );
        setMessages(
          normalized.map((item) =>
            item.role === "assistant" ? { ...item, text: sanitizeChatText(item.text) } : item,
          ),
        );
      } else {
        setMessages([]);
      }

      const storedAssistant = window.localStorage.getItem(demoAssistantStorageKey);
      setAssistantName(storedAssistant?.trim() || "Assistant");
    } catch {
      setMessages([]);
      setAssistantName("Assistant");
    }
  }, [demoAssistantStorageKey, demoMessagesStorageKey, isDemoMode, resolvedSessionId]);

  useEffect(() => {
    if (!isDemoMode || !resolvedSessionId) return;
    if (typeof window === "undefined") return;

    const persistableMessages = messages.filter((message) => message.kind !== "loading");
    window.localStorage.setItem(demoMessagesStorageKey, JSON.stringify(persistableMessages));
    window.localStorage.setItem(demoAssistantStorageKey, assistantName);
  }, [assistantName, demoAssistantStorageKey, demoMessagesStorageKey, isDemoMode, messages, resolvedSessionId]);

  function submitIdentifiedProfile() {
    const name = profileNameInput.trim();
    const email = profileEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name) {
      setProfileError("Inserisci nome e cognome.");
      return;
    }
    if (!emailRegex.test(email)) {
      setProfileError("Inserisci un'email valida.");
      return;
    }
    const profile = { name, email, anonymousTest: false, authenticated: false };
    setCustomerProfile(profile);
    persistChatAccessProfile(profile);
    void fetch(`${apiBaseUrl}/api/chat-access/notify`, {
      method: "POST",
      headers: tenantHeaders,
      body: JSON.stringify({ name, email }),
    }).catch(() => null);
    setProfileNameInput("");
    setProfileEmailInput("");
    setProfileError("");
  }

  function startAnonymousTest() {
    setCustomerProfile({ name: "Test anonimo", anonymousTest: true, authenticated: false });
    persistChatAccessProfile(null);
    setProfileNameInput("");
    setProfileEmailInput("");
    setProfileError("");
  }

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
      speechTokenRef.current += 1;
      cancelSpeech();
    };
  }, []);

  async function submitMessage(message: string) {
    if (!message || loading || !resolvedSessionId || tenantSuspended) return;
    if (customerIdentityRequired && !customerProfile) return;
    if (authRequired && !chatUserEmail) return;
    const pendingCatalogIntent = getCatalogOpenIntent(message);
    const pendingQuoteIntent = isQuoteIntent(message);
    const quoteDraft = extractQuoteDraftFromText(message);

    if (typeof window !== "undefined" && (pendingQuoteIntent || Object.values(quoteDraft).some(Boolean))) {
      window.dispatchEvent(
        new CustomEvent("easyvox:quote-open", {
          detail: {
            ...quoteDraft,
            ...(customerProfile?.anonymousTest
              ? {}
              : {
                  name: quoteDraft.name || customerProfile?.name || "",
                  email: quoteDraft.email || customerProfile?.email || "",
                }),
          } satisfies QuoteDraft,
        }),
      );
    }

    appendMessage({ role: "user", kind: "text", text: message });
    appendMessage({ role: "assistant", kind: "loading", text: "" });
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: tenantHeaders,
        body: JSON.stringify({
          sessionId: resolvedSessionId,
          message,
          customerName: customerProfile?.anonymousTest ? undefined : customerProfile?.name,
          customerEmail: customerProfile?.anonymousTest ? undefined : customerProfile?.email,
          anonymousTest: customerProfile?.anonymousTest === true,
          useEasyvoxChat: !tenantHeaderValue,
          stream: true,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Errore chat");
      }

      const contentType = response.headers.get("content-type") ?? "";
      const isNdjsonStream = contentType.includes("application/x-ndjson");
      if (!isNdjsonStream || !response.body) {
        const data = (await response.json()) as {
          reply?: string;
          assistantName?: string;
          error?: string;
          productCard?: Message["productCard"];
        };
        setAssistantName(data.assistantName?.trim() || "Assistant");
        clearLoadingMessage();
        appendMessage({
          role: "assistant",
          kind: "text",
          text: sanitizeChatText(data.reply ?? "Nessuna risposta"),
          productCard: data.productCard ?? null,
        });
        if (typeof window !== "undefined" && pendingCatalogIntent.shouldOpen) {
          window.dispatchEvent(
            new CustomEvent("easyvox:catalog-open", {
              detail: {
                category: pendingCatalogIntent.category,
                query: pendingCatalogIntent.query,
              },
            }),
          );
        }
        return;
      }

      const streamMessageId = crypto.randomUUID();
      let streamedText = "";
      let donePayloadReply = "";
      let doneProductCard: Message["productCard"] = null;
      let doneReceived = false;
      let pendingText = "";
      const renderStepChars = 2;
      const renderIntervalMs = 18;

      clearLoadingMessage();
      setMessages((prev) => [...prev, { id: streamMessageId, role: "assistant", kind: "text", text: "" }]);

      const drainTimer = window.setInterval(() => {
        if (!pendingText) return;
        const next = pendingText.slice(0, renderStepChars);
        pendingText = pendingText.slice(renderStepChars);
        streamedText += next;
        appendToMessageById(streamMessageId, next);
      }, renderIntervalMs);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const event = JSON.parse(trimmed) as ChatStreamEvent;
            if (event.type === "meta") {
              if (event.assistantName?.trim()) setAssistantName(event.assistantName.trim());
              continue;
            }
            if (event.type === "delta") {
              const chunk = event.text ?? "";
              if (!chunk) continue;
              pendingText += chunk;
              continue;
            }
            if (event.type === "done") {
              doneReceived = true;
              donePayloadReply = event.payload?.reply ?? "";
              doneProductCard = event.payload?.productCard ?? null;
              if (event.payload?.assistantName?.trim()) setAssistantName(event.payload.assistantName.trim());
            }
          }
        }

        if (buffer.trim()) {
          const event = JSON.parse(buffer.trim()) as ChatStreamEvent;
          if (event.type === "done") {
            doneReceived = true;
            donePayloadReply = event.payload?.reply ?? "";
            doneProductCard = event.payload?.productCard ?? null;
            if (event.payload?.assistantName?.trim()) setAssistantName(event.payload.assistantName.trim());
          }
        }

        const timeoutAt = Date.now() + 6000;
        while (pendingText && Date.now() < timeoutAt) {
          await new Promise((resolve) => setTimeout(resolve, renderIntervalMs));
        }
      } finally {
        window.clearInterval(drainTimer);
        if (pendingText) {
          streamedText += pendingText;
          appendToMessageById(streamMessageId, pendingText);
          pendingText = "";
        }
      }

      if (!doneReceived) {
        throw new Error("Risposta streaming incompleta");
      }

      if (!streamedText && donePayloadReply) {
        setMessageTextById(streamMessageId, sanitizeChatText(donePayloadReply));
      }
      if (doneProductCard) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === streamMessageId ? { ...message, productCard: doneProductCard } : message,
          ),
        );
      }

      if (typeof window !== "undefined" && pendingCatalogIntent.shouldOpen) {
        window.dispatchEvent(
          new CustomEvent("easyvox:catalog-open", {
            detail: {
              category: pendingCatalogIntent.category,
              query: pendingCatalogIntent.query,
            },
          }),
        );
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore sconosciuto";
      clearLoadingMessage();
      appendMessage({ role: "assistant", kind: "text", text: `Errore: ${detail}` });
    } finally {
      setLoading(false);
    }
  }
  submitMessageRef.current = submitMessage;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onCatalogSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const selectedMessage = customEvent.detail?.message?.trim();
      if (!selectedMessage) return;
      void submitMessageRef.current(selectedMessage);
    };

    window.addEventListener("easyvox:catalog-select", onCatalogSelect);
    return () => {
      window.removeEventListener("easyvox:catalog-select", onCatalogSelect);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onQuoteCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string }>;
      const quoteText = customEvent.detail?.text?.trim();
      if (!quoteText) return;
      appendMessage({ role: "assistant", kind: "quote", text: quoteText });
    };

    window.addEventListener("easyvox:quote-created", onQuoteCreated);
    return () => {
      window.removeEventListener("easyvox:quote-created", onQuoteCreated);
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;

    setText("");
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches) {
      textareaRef.current?.blur();
    }
    await submitMessage(message);
  }

  function onTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function onSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || uploading) return;
    if (tenantSuspended) return;
    if (customerIdentityRequired && !customerProfile) return;
    if (authRequired && !chatUserEmail) return;
    if (!resolvedSessionId) {
      return;
    }
    if (!tenantHeaderValue) {
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sessionId", resolvedSessionId);
      const response = await fetch(`${apiBaseUrl}/api/files`, {
        method: "POST",
        headers: {
          [tenantHeaderKey]: tenantHeaderValue,
        },
        body: form,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Errore upload file");
      }
      appendMessage({ role: "user", kind: "file", text: file.name });
    } catch {
    } finally {
      setUploading(false);
    }
  }

  async function submitChatLogin() {
    if (!tenantHeaderValue || tenantSuspended) return;
    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setLoginError("Inserisci l'email.");
      return;
    }

    setLoggingIn(true);
    setLoginError("");
    setLoginNotice("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat-auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [tenantHeaderKey]: tenantHeaderValue,
        },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as {
        error?: string;
        user?: { email?: string; name?: string | null };
      };
      if (!response.ok) {
        setLoginError(data.error ?? "Login fallito");
        return;
      }
      const resolvedEmail = data.user?.email?.trim().toLowerCase() ?? email;
      const resolvedName =
        data.user?.name?.trim() ||
        resolvedEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
        "Cliente";
      setChatUserEmail(resolvedEmail);
      const profile = {
        name: resolvedName,
        email: resolvedEmail,
        authenticated: true,
      };
      setCustomerProfile(profile);
      persistChatAccessProfile(profile);
      setLoginEmail("");
      setLoginError("");
      setLoginNotice("");
    } catch {
      setLoginError("Errore di rete");
    } finally {
      setLoggingIn(false);
    }
  }

  async function submitChatRegister() {
    if (!tenantHeaderValue || tenantSuspended) return;
    const name = registerName.trim();
    const email = loginEmail.trim().toLowerCase();
    if (!name || !email) {
      setLoginError("Inserisci nome ed email.");
      return;
    }

    setLoggingIn(true);
    setLoginError("");
    setLoginNotice("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat-auth/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [tenantHeaderKey]: tenantHeaderValue,
        },
        body: JSON.stringify({ name, email }),
      });
      const data = (await response.json()) as {
        error?: string;
        user?: { email?: string; name?: string | null };
        pendingVerification?: boolean;
      };
      if (!response.ok) {
        setLoginError(data.error ?? "Registrazione fallita");
        return;
      }
      setChatAuthMode("login");
      setRegisterName("");
      setLoginEmail("");
      setLoginError("");
      setLoginNotice("Ti abbiamo inviato una mail di conferma. Clicca il link per attivare il profilo chat.");
    } catch {
      setLoginError("Errore di rete");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logoutChatUser() {
    await fetch(`${apiBaseUrl}/api/chat-auth/logout`, { method: "POST" }).catch(() => null);
    setChatUserEmail("");
    persistChatAccessProfile(null);
    setCustomerProfile((current) => (current?.authenticated ? null : current));
  }

  async function submitStarterPrompt(prompt: string) {
    if (tenantSuspended || (customerIdentityRequired && !customerProfile) || (authRequired && !chatUserEmail) || loading) return;
    setText("");
    await submitMessage(prompt);
  }

  const showStarterPrompts =
    !historyLoading &&
    !loading &&
    !customerIdentityRequired &&
    !authGateRequired;

  return (
    <section
      className="card"
      style={{
        width: "100%",
        padding: 16,
        paddingBottom: 230,
        background: "transparent",
        boxShadow: "none",
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <strong>AI Chat</strong>
        <p className="mono" style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {tenantLabel}
        </p>
        {tenantSuspended ? (
          <p className="mono" style={{ margin: "8px 0 0", color: "#8f2f2f", fontSize: 12 }}>
            Tenant sospeso. Chat temporaneamente non disponibile.
          </p>
        ) : null}
        {authRequired ? (
          chatUserEmail ? (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                Utente chat: {chatUserEmail}
              </p>
              <button
                type="button"
                onClick={logoutChatUser}
                style={{
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "white",
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>Accesso richiesto</strong>
              <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setChatAuthMode("login");
                    setLoginError("");
                  }}
                  style={{
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: chatAuthMode === "login" ? "var(--ink)" : "white",
                    color: chatAuthMode === "login" ? "white" : "var(--ink)",
                    padding: "6px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatAuthMode("register");
                    setLoginError("");
                  }}
                  style={{
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: chatAuthMode === "register" ? "var(--ink)" : "white",
                    color: chatAuthMode === "register" ? "white" : "var(--ink)",
                    padding: "6px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Registrati
                </button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {chatAuthMode === "register" ? (
                  <input
                    type="text"
                    placeholder="nome e cognome"
                    value={registerName}
                    onChange={(event) => setRegisterName(event.target.value)}
                    style={{ borderRadius: 8, border: "1px solid #d4d7dc", padding: "8px 10px", fontSize: 16 }}
                  />
                ) : null}
                <input
                  type="email"
                  placeholder="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  style={{ borderRadius: 8, border: "1px solid #d4d7dc", padding: "8px 10px", fontSize: 16 }}
                />
                {loginError ? (
                  <p style={{ margin: 0, color: "#b42318", fontSize: 12 }}>{loginError}</p>
                ) : loginNotice ? (
                  <p style={{ margin: 0, color: "#0f766e", fontSize: 12 }}>{loginNotice}</p>
                ) : (
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                    {chatAuthMode === "login"
                      ? "Inserisci l'email dell'utente chat abilitato per questo tenant."
                      : "Crea un profilo chat con nome ed email. Ti invieremo un link email da cliccare per confermare l'indirizzo."}
                  </p>
                )}
                <div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={chatAuthMode === "login" ? submitChatLogin : submitChatRegister}
                      disabled={loggingIn}
                      style={{
                        borderRadius: 8,
                        border: "1px solid var(--ink)",
                        background: "var(--ink)",
                        color: "white",
                        padding: "8px 12px",
                        fontSize: 13,
                        cursor: loggingIn ? "not-allowed" : "pointer",
                      }}
                    >
                      {loggingIn ? (chatAuthMode === "login" ? "Accesso..." : "Registrazione...") : chatAuthMode === "login" ? "Accedi" : "Registrati"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : null}
      </header>

      <div
        ref={messagesContainerRef}
        style={{
          minHeight: 220,
          display: "grid",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: message.role === "user" ? "flex-end" : "flex-start",
              gap: 4,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              {message.role === "user" ? "tu" : assistantName}
            </div>
            {message.kind === "loading" ? (
              <div className="chat-loader-dots" aria-live="polite" aria-label={`${assistantName} sta scrivendo`}>
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 4,
                  maxWidth: "85%",
                  justifyItems: message.role === "user" ? "end" : "start",
                }}
              >
                {!(message.role === "assistant" && message.productCard) ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 14,
                      padding:
                        message.role === "user"
                          ? "10px 12px"
                          : message.kind === "quote"
                          ? "12px 14px"
                          : 0,
                      borderRadius: message.role === "user" ? 5 : 0,
                      background:
                        message.role === "user"
                          ? "#797f88"
                          : message.kind === "quote"
                          ? "#f7f3e9"
                          : "transparent",
                      color:
                        message.role === "user"
                          ? "#ffffff"
                          : message.kind === "quote"
                          ? "#332715"
                          : "inherit",
                      border:
                        message.kind === "quote" ? "1px solid rgba(212, 203, 187, 0.9)" : "none",
                    }}
                  >
                    {message.kind === "file" ? (
                      `[allegato] ${message.text}`
                    ) : (
                      <MarkdownMessage text={message.text} isUser={message.role === "user"} />
                    )}
                  </div>
                ) : null}
                {message.role === "assistant" && message.productCard ? (
                  <ProductCardMessage productCard={message.productCard} />
                ) : null}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void copyMessageText(message)}
                    onMouseEnter={() => setHoveredCopyMessageId(message.id)}
                    onMouseLeave={() => setHoveredCopyMessageId((current) => (current === message.id ? null : current))}
                    aria-label="Copia messaggio"
                    title={copiedMessageId === message.id ? "Copiato" : "Copia"}
                    style={{
                      border: "none",
                      background: "transparent",
                      color:
                        copiedMessageId === message.id || hoveredCopyMessageId === message.id
                          ? "#000000"
                          : "#9c9c9c",
                      borderRadius: 0,
                      width: 18,
                      height: 18,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                      transition: "color 140ms ease",
                    }}
                  >
                    {copiedMessageId === message.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          d="M20 7L10 17l-5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <rect x="9" y="9" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path
                          d="M5 15V5a2 2 0 0 1 2-2h10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speakMessageText(message)}
                      onMouseEnter={() => setHoveredSpeakMessageId(message.id)}
                      onMouseLeave={() => setHoveredSpeakMessageId((current) => (current === message.id ? null : current))}
                      aria-label={speakingMessageId === message.id ? "Ferma lettura messaggio" : "Leggi messaggio"}
                      title={speakingMessageId === message.id ? "Ferma" : "Leggi"}
                      style={{
                        border: "none",
                        background: "transparent",
                        color:
                          speakingMessageId === message.id || hoveredSpeakMessageId === message.id
                            ? "#000000"
                            : "#9c9c9c",
                        borderRadius: 0,
                        width: 18,
                        height: 18,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: 0,
                        transition: "color 140ms ease",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          d="M11 5L6 9H3v6h3l5 4V5z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {speakingMessageId === message.id ? (
                          <path
                            d="M16 9v6M20 9v6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <path
                            d="M15 9a4 4 0 010 6m3-9a8 8 0 010 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {historyLoading && messages.length === 0 && (
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            Carico cronologia...
          </div>
        )}
        {!historyLoading && messages.length === 0 && (
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            Inizia una conversazione.
          </div>
        )}
      </div>

      <form
        className="chat-input-form"
        onSubmit={onSubmit}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 72,
          width: "min(760px, calc(100% - 32px))",
          zIndex: 9999,
          display: "grid",
          gap: 10,
        }}
      >
        {showStarterPrompts ? (
          <div
            className="chat-starter-prompts"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gridAutoRows: "56px",
              gap: 8,
              padding: "2px 2px 0",
              minHeight: 120,
              height: 120,
              alignContent: "start",
              marginBottom: -100,
              transform: "translateY(100px)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {starterPrompts.map((prompt, index) => (
              <button
                className="chat-starter-prompt"
                key={`${index}-${prompt}`}
                type="button"
                onClick={() => void submitStarterPrompt(prompt)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(17, 24, 39, 0.08)",
                  background: "rgba(241, 244, 248, 0.9)",
                  color: "var(--ink)",
                  padding: "10px 12px",
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
                  minHeight: "100%",
                  height: "100%",
                  opacity: fadingPromptSlots[index] ? 0 : 1,
                  transform: fadingPromptSlots[index] ? "translateY(6px)" : "translateY(0)",
                  transition: "opacity 420ms ease, transform 420ms ease",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
        <div style={{ position: "relative", width: "100%" }}>
          <textarea
            className="chat-input-textarea"
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder={
              tenantSuspended
                ? "Tenant sospeso"
                : customerIdentityRequired && !customerProfile
                ? "Apri la modale di accesso per iniziare"
                : authRequired && !chatUserEmail
                ? "Accedi con email e password per iniziare"
                : "Hei Ciao chiedimi quello che vuoi!!!"
            }
            rows={3}
            disabled={tenantSuspended || (customerIdentityRequired && !customerProfile) || (authRequired && !chatUserEmail)}
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              resize: "vertical",
              borderRadius: 10,
              border: "none",
              background: "#f1f4f8",
              padding: "12px 132px 22px 12px",
              fontSize: 16,
              outline: "none",
            }}
          />
          {appSettingsHref ? (
            <Link
              href={appSettingsHref}
              className="chat-settings-tab chat-input-tooltip"
              data-tooltip="Impostazioni"
              aria-label="Impostazioni"
              title="Impostazioni"
              style={{
                position: "absolute",
                top: 14,
                right: -18,
                zIndex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 46,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 8.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm8.3 3.2a6.7 6.7 0 00-.1-1l2-1.6-2-3.4-2.4 1a8.3 8.3 0 00-1.8-1L15.6 2h-4l-.4 2.9a8.3 8.3 0 00-1.8 1l-2.4-1-2 3.4 2 1.6a6.7 6.7 0 000 2l-2 1.6 2 3.4 2.4-1a8.3 8.3 0 001.8 1l.4 2.9h4l.4-2.9a8.3 8.3 0 001.8-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : null}
          <input ref={fileInputRef} type="file" onChange={onSelectFile} disabled={uploading || tenantSuspended} style={{ display: "none" }} />
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 8,
              zIndex: 3,
              display: "flex",
              gap: 6,
            }}
          >
            <button
              className="chat-input-icon-button chat-input-tooltip"
              data-tooltip="Allega file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Allega file"
              disabled={uploading || tenantSuspended}
              hidden={tenantSuspended || (customerIdentityRequired && !customerProfile) || (authRequired && !chatUserEmail)}
              style={{
                borderRadius: "50%",
                border: "1px solid var(--ink)",
                background: "var(--ink)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: uploading || tenantSuspended ? "not-allowed" : "pointer",
              }}
            >
              <svg className="chat-input-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M21.44 11.05L12.25 20.25a6 6 0 11-8.49-8.49l9.2-9.19a4 4 0 115.65 5.65l-9.2 9.2a2 2 0 11-2.83-2.83l8.49-8.48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="chat-input-icon-button chat-input-tooltip"
              data-tooltip={loading ? "Invio in corso" : "Invia messaggio"}
              type="submit"
              disabled={loading || tenantSuspended}
              hidden={tenantSuspended || (customerIdentityRequired && !customerProfile) || (authRequired && !chatUserEmail)}
              aria-label={loading ? "Invio in corso" : "Invia messaggio"}
              style={{
                borderRadius: "50%",
                border: "1px solid var(--ink)",
                background: "var(--ink)",
                color: "white",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: loading || tenantSuspended ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                "…"
              ) : (
                <svg className="chat-input-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M4 12L20 4l-4 16-4-6-8-2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
      <SignInCard2
        open={showEntryModal}
        name={profileNameInput}
        email={profileEmailInput}
        error={profileError || undefined}
        profilingRequired={profilingRequired}
        onNameChange={setProfileNameInput}
        onEmailChange={setProfileEmailInput}
        onSubmitIdentity={submitIdentifiedProfile}
        onAnonymous={startAnonymousTest}
      />
    </section>
  );
}
