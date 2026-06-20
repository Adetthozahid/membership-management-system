"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileUp, MessageCircle, Paperclip, Plus, Search, Send, UsersRound } from "lucide-react";
import { ChatAttachmentViewer } from "@/components/member/chat-attachment-viewer";
import { prepareChatAttachment } from "@/lib/chat-attachments";
import { apiRequest, sendChatMessage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type ChatContact = {
  id: string;
  fullName: string;
  memberId: string | null;
  photo: string | null;
  membershipType: string | null;
  online: boolean;
  lastSeenAt: string | null;
};

type ChatConversation = {
  id: string;
  type: "direct" | "group";
  name: string;
  participants: Array<{ id: string; fullName: string; memberId: string | null; photo: string | null; online: boolean }>;
  lastMessage: ChatMessage | null;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  body: string;
  sender: { id: string; fullName: string; photo?: string | null };
  createdAt: string;
  attachment: null | {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function mediaUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${apiBaseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function time(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MemberChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [appearOffline, setAppearOffline] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const handledMemberParamRef = useRef<string | null>(null);

  const memberIdParam = searchParams.get("memberId");
  const conversationIdParam = searchParams.get("conversationId");
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) => [contact.fullName, contact.memberId, contact.membershipType].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [contacts, query]);

  const loadChat = useCallback(async () => {
    const [profile, nextContacts, nextConversations] = await Promise.all([
      apiRequest<{ id: string }>("/member/profile"),
      apiRequest<ChatContact[]>("/member/chat/contacts"),
      apiRequest<ChatConversation[]>("/member/chat/conversations")
    ]);
    setCurrentMemberId(profile.id);
    setContacts(nextContacts);
    setConversations(nextConversations);
    setActiveConversationId((current) => {
      if (conversationIdParam && nextConversations.some((conversation) => conversation.id === conversationIdParam)) {
        return conversationIdParam;
      }
      return current ?? nextConversations[0]?.id ?? null;
    });
    setLoading(false);
  }, [conversationIdParam]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const nextMessages = await apiRequest<ChatMessage[]>(`/member/chat/conversations/${conversationId}/messages`);
    setMessages(nextMessages);
  }, []);

  const startDirect = useCallback(async (memberId: string) => {
    setError(null);
    const conversation = await apiRequest<{ id: string }>("/member/chat/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ memberId })
    });
    await loadChat();
    setActiveConversationId(conversation.id);
    router.replace(`/member/chat?conversationId=${encodeURIComponent(conversation.id)}`);
  }, [loadChat, router]);

  useEffect(() => {
    void loadChat().catch(() => {
      setError("Could not load chat.");
      setLoading(false);
    });
    const interval = window.setInterval(() => void loadChat().catch(() => undefined), 15000);
    return () => window.clearInterval(interval);
  }, [loadChat]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeConversationId).catch(() => setError("Could not load messages."));
    const interval = window.setInterval(() => void loadMessages(activeConversationId).catch(() => undefined), 5000);
    return () => window.clearInterval(interval);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!conversationIdParam) return;
    if (conversations.some((conversation) => conversation.id === conversationIdParam)) {
      setActiveConversationId(conversationIdParam);
    }
  }, [conversationIdParam, conversations]);

  useEffect(() => {
    if (!memberIdParam || handledMemberParamRef.current === memberIdParam) return;
    if (!contacts.some((contact) => contact.id === memberIdParam)) return;
    handledMemberParamRef.current = memberIdParam;
    void startDirect(memberIdParam);
  }, [contacts, memberIdParam, startDirect]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeConversationId]);

  async function createGroup() {
    if (!groupName.trim() || selectedMembers.length < 2) {
      setError("Give the group a name and select at least two members.");
      return;
    }
    setError(null);
    const conversation = await apiRequest<{ id: string }>("/member/chat/conversations/groups", {
      method: "POST",
      body: JSON.stringify({ name: groupName.trim(), memberIds: selectedMembers })
    });
    setGroupName("");
    setSelectedMembers([]);
    setGroupOpen(false);
    await loadChat();
    setActiveConversationId(conversation.id);
    router.replace(`/member/chat?conversationId=${encodeURIComponent(conversation.id)}`);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversationId || (!body.trim() && !attachment)) return;
    setSending(true);
    setError(null);
    try {
      await sendChatMessage(activeConversationId, { body: body.trim(), attachment });
      setBody("");
      setAttachment(null);
      await Promise.all([loadMessages(activeConversationId), loadChat()]);
    } catch {
      setError("Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function selectAttachment(file?: File | null) {
    if (!file) {
      setAttachment(null);
      return;
    }
    setError(null);
    try {
      setAttachment(await prepareChatAttachment(file));
    } catch (attachmentError) {
      setAttachment(null);
      setError(attachmentError instanceof Error ? attachmentError.message : "Attachment could not be prepared.");
    }
  }

  async function togglePresence(nextValue: boolean) {
    setAppearOffline(nextValue);
    await apiRequest("/member/chat/presence", {
      method: "PATCH",
      body: JSON.stringify({ appearOffline: nextValue })
    }).catch(() => setError("Could not update presence."));
    await loadChat().catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Member chat</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Chats</h1>
        </div>
        <label className="flex w-fit items-center gap-3 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={appearOffline} onChange={(event) => void togglePresence(event.target.checked)} />
          Appear offline
        </label>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-md border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
              Conversations
            </div>
            <button type="button" className="rounded-md border p-2 text-muted-foreground hover:bg-muted" onClick={() => setGroupOpen((value) => !value)} aria-label="Create group">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-[608px] overflow-y-auto p-2">
            {loading ? <p className="p-3 text-sm text-muted-foreground">Loading chats...</p> : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setActiveConversationId(conversation.id);
                  router.replace(`/member/chat?conversationId=${encodeURIComponent(conversation.id)}`);
                }}
                className={cn("w-full rounded-md p-3 text-left transition hover:bg-muted", activeConversationId === conversation.id && "bg-primary/10 text-primary")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{conversation.name}</span>
                  <span className="text-[11px] text-muted-foreground">{conversation.lastMessage ? time(conversation.lastMessage.createdAt) : ""}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {conversation.lastMessage?.body || (conversation.lastMessage?.attachment ? conversation.lastMessage.attachment.fileName : "No messages yet")}
                </p>
              </button>
            ))}
            {!loading && conversations.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Start a chat from the member list.</p> : null}
          </div>
        </section>

        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-md border bg-card">
          <div className="flex items-center gap-3 border-b p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
              {activeConversation ? initials(activeConversation.name) : "CH"}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{activeConversation?.name ?? "Select a chat"}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {activeConversation ? `${activeConversation.participants.length} member${activeConversation.participants.length === 1 ? "" : "s"}` : "Messages and attachments are encrypted at rest."}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/35 p-4">
            {messages.map((message) => {
              const own = message.sender.id === currentMemberId;
              return (
                <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[82%] rounded-md border px-3 py-2 text-sm shadow-sm", own ? "border-primary/20 bg-primary text-primary-foreground" : "bg-card")}>
                    <div className={cn("mb-1 text-[11px] font-semibold", own ? "text-white/75" : "text-muted-foreground")}>{message.sender.fullName} · {time(message.createdAt)}</div>
                    {message.body ? <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p> : null}
                    {message.attachment ? (
                      <ChatAttachmentViewer attachment={message.attachment} own={own} />
                    ) : null}
                  </div>
                </div>
              );
            })}
            {!activeConversation ? <p className="p-6 text-center text-sm text-muted-foreground">Choose a conversation or member to begin.</p> : null}
            {activeConversation && messages.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No messages yet.</p> : null}
            <div ref={messageEndRef} />
          </div>

          <form onSubmit={submitMessage} className="border-t bg-card p-3">
            {attachment ? (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-md border bg-muted px-3 py-2 text-xs">
                <span className="min-w-0 truncate">{attachment.name}</span>
                <button type="button" className="font-semibold text-primary" onClick={() => setAttachment(null)}>Remove</button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border text-muted-foreground hover:bg-muted" aria-label="Attach file">
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                <input type="file" className="sr-only" onChange={(event) => void selectAttachment(event.target.files?.[0] ?? null)} />
              </label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write a message..."
                className="min-h-10 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                rows={1}
                disabled={!activeConversation}
              />
              <button type="submit" disabled={!activeConversation || sending || (!body.trim() && !attachment)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send message">
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-md border bg-card">
          <div className="border-b p-4">
            <div className="flex items-center gap-2 font-semibold">
              <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
              Members
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
          </div>

          {groupOpen ? (
            <div className="border-b bg-muted/40 p-4">
              <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <p className="mt-2 text-xs text-muted-foreground">Select at least two members below.</p>
              <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" onClick={() => void createGroup()}>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Create group
              </button>
            </div>
          ) : null}

          <div className="max-h-[608px] overflow-y-auto p-2">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted">
                {groupOpen ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selectedMembers.includes(contact.id)}
                    onChange={(event) => setSelectedMembers((current) => (event.target.checked ? [...current, contact.id] : current.filter((id) => id !== contact.id)))}
                    aria-label={`Select ${contact.fullName}`}
                  />
                ) : null}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    if (groupOpen) return;
                    router.push(`/member/chat?memberId=${encodeURIComponent(contact.id)}`);
                  }}
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {contact.photo ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${mediaUrl(contact.photo)}")` }} aria-hidden="true" /> : initials(contact.fullName)}
                    <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-card", contact.online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{contact.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{contact.online ? "Online" : contact.memberId ?? "Offline"}</span>
                  </span>
                </button>
              </div>
            ))}
            {filteredContacts.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No members found.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
