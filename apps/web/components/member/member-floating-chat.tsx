"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, MessageCircle, Minus, Paperclip, Search, Send, UsersRound, X } from "lucide-react";
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

export function MemberFloatingChat() {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeChats, setActiveChats] = useState<ChatConversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) => [contact.fullName, contact.memberId, contact.membershipType].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [contacts, query]);

  const loadLists = useCallback(async () => {
    const [profile, nextContacts, nextConversations] = await Promise.all([
      apiRequest<{ id: string }>("/member/profile"),
      apiRequest<ChatContact[]>("/member/chat/contacts"),
      apiRequest<ChatConversation[]>("/member/chat/conversations")
    ]);
    setCurrentMemberId(profile.id);
    setContacts(nextContacts);
    setConversations(nextConversations);
    setActiveChats((current) =>
      current.map((chat) => nextConversations.find((conversation) => conversation.id === chat.id) ?? chat)
    );
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const messages = await apiRequest<ChatMessage[]>(`/member/chat/conversations/${conversationId}/messages`);
    setMessagesByConversation((current) => ({ ...current, [conversationId]: messages }));
  }, []);

  useEffect(() => {
    void loadLists().catch(() => undefined);
    const interval = window.setInterval(() => void loadLists().catch(() => undefined), 15000);
    return () => window.clearInterval(interval);
  }, [loadLists]);

  useEffect(() => {
    if (!activeChats.length) return;
    activeChats.forEach((chat) => void loadMessages(chat.id).catch(() => undefined));
    const interval = window.setInterval(() => {
      activeChats.forEach((chat) => void loadMessages(chat.id).catch(() => undefined));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [activeChats, loadMessages]);

  useEffect(() => {
    function openMemberChat(event: Event) {
      const memberId = (event as CustomEvent<{ memberId?: string }>).detail?.memberId;
      if (!memberId) return;
      setOpen(false);
      void startDirect(memberId);
    }

    window.addEventListener("mms:open-member-chat", openMemberChat);
    return () => window.removeEventListener("mms:open-member-chat", openMemberChat);
  }, []);

  async function openConversation(conversation: ChatConversation) {
    setActiveChats((current) => {
      const withoutDuplicate = current.filter((chat) => chat.id !== conversation.id);
      return [conversation, ...withoutDuplicate].slice(0, 3);
    });
    setMinimized((current) => ({ ...current, [conversation.id]: false }));
    await loadMessages(conversation.id).catch(() => undefined);
  }

  async function startDirect(memberId: string) {
    setError(null);
    try {
      const result = await apiRequest<{ id: string }>("/member/chat/conversations/direct", {
        method: "POST",
        body: JSON.stringify({ memberId })
      });
      await loadLists();
      const conversation =
        conversations.find((item) => item.id === result.id) ??
        (await apiRequest<ChatConversation[]>("/member/chat/conversations")).find((item) => item.id === result.id);
      if (conversation) await openConversation(conversation);
    } catch {
      setError("Could not open chat.");
    }
  }

  async function submit(conversationId: string) {
    const body = drafts[conversationId]?.trim();
    const attachment = files[conversationId] ?? null;
    if (!body && !attachment) return;
    setDrafts((current) => ({ ...current, [conversationId]: "" }));
    setFiles((current) => ({ ...current, [conversationId]: null }));
    try {
      await sendChatMessage(conversationId, { body, attachment });
      await Promise.all([loadMessages(conversationId), loadLists()]);
    } catch {
      setError("Message could not be sent.");
      setDrafts((current) => ({ ...current, [conversationId]: body }));
      setFiles((current) => ({ ...current, [conversationId]: attachment }));
    }
  }

  function closeChat(conversationId: string) {
    setActiveChats((current) => current.filter((chat) => chat.id !== conversationId));
  }

  async function selectFile(conversationId: string, file?: File | null) {
    if (!file) {
      setFiles((current) => ({ ...current, [conversationId]: null }));
      return;
    }
    setError(null);
    try {
      const prepared = await prepareChatAttachment(file);
      setFiles((current) => ({ ...current, [conversationId]: prepared }));
    } catch (attachmentError) {
      setFiles((current) => ({ ...current, [conversationId]: null }));
      setError(attachmentError instanceof Error ? attachmentError.message : "Attachment could not be prepared.");
    }
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3">
        <div className="hidden items-end gap-3 lg:flex">
          {activeChats.map((chat) => {
            const isMinimized = minimized[chat.id];
            const messages = messagesByConversation[chat.id] ?? [];
            return (
              <section key={chat.id} className="w-80 overflow-hidden rounded-2xl border border-[#eadfd4] bg-white shadow-[0_22px_70px_rgba(37,32,28,0.20)]">
                <div className="flex items-center justify-between gap-2 bg-[#f05a28] px-3 py-2 text-white">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setMinimized((current) => ({ ...current, [chat.id]: !isMinimized }))}>
                    <span className="block truncate text-sm font-semibold">{chat.name}</span>
                    <span className="block text-[11px] text-white/75">{chat.type === "group" ? "Group chat" : "Direct chat"}</span>
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-white/15" onClick={() => setMinimized((current) => ({ ...current, [chat.id]: !isMinimized }))} aria-label="Minimize chat">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-white/15" onClick={() => closeChat(chat.id)} aria-label="Close chat">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {!isMinimized ? (
                  <>
                    <div className="h-72 space-y-2 overflow-y-auto bg-[#fffaf4] p-3">
                      {messages.map((message) => {
                        const own = message.sender.id === currentMemberId;
                        return (
                          <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[86%] rounded-2xl px-3 py-2 text-sm shadow-sm", own ? "rounded-br-sm bg-[#f05a28] text-white" : "rounded-bl-sm border bg-white text-[#25201c]")}>
                              {!own ? <div className="mb-1 text-[10px] font-semibold text-[#8a7c70]">{message.sender.fullName}</div> : null}
                              {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                              {message.attachment ? <ChatAttachmentViewer attachment={message.attachment} own={own} compact /> : null}
                              <div className={cn("mt-1 text-[10px]", own ? "text-white/70" : "text-[#8a7c70]")}>{time(message.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                      {!messages.length ? <p className="pt-20 text-center text-sm text-[#8a7c70]">No messages yet.</p> : null}
                    </div>
                    <form
                      className="border-t border-[#eadfd4] p-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submit(chat.id);
                      }}
                    >
                      {files[chat.id] ? (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-[#fff7f0] px-3 py-2 text-xs text-[#5f5349]">
                          <span className="min-w-0 truncate">{files[chat.id]?.name}</span>
                          <button type="button" className="font-semibold text-[#f05a28]" onClick={() => setFiles((current) => ({ ...current, [chat.id]: null }))}>
                            Remove
                          </button>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#eadfd4] text-[#8a7c70] transition hover:border-[#f05a28] hover:bg-[#fff7f0] hover:text-[#f05a28]" title="Attach file/photo" aria-label="Attach file or photo">
                          <Paperclip className="h-4 w-4" aria-hidden="true" />
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            onChange={(event) => void selectFile(chat.id, event.target.files?.[0] ?? null)}
                          />
                        </label>
                        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#eadfd4] text-[#8a7c70] transition hover:border-[#f05a28] hover:bg-[#fff7f0] hover:text-[#f05a28]" title="Attach photo" aria-label="Attach photo">
                          <ImagePlus className="h-4 w-4" aria-hidden="true" />
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(event) => void selectFile(chat.id, event.target.files?.[0] ?? null)}
                          />
                        </label>
                        <input
                          value={drafts[chat.id] ?? ""}
                          onChange={(event) => setDrafts((current) => ({ ...current, [chat.id]: event.target.value }))}
                          className="h-10 min-w-0 flex-1 rounded-xl border border-[#eadfd4] px-3 text-sm outline-none focus:border-[#f05a28] focus:ring-2 focus:ring-[#f05a28]/15"
                          placeholder="Message..."
                        />
                        <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f05a28] text-white disabled:opacity-50" disabled={!drafts[chat.id]?.trim() && !files[chat.id]} aria-label="Send">
                          <Send className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </form>
                  </>
                ) : null}
              </section>
            );
          })}
        </div>

        {open ? (
          <section className="mb-16 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#eadfd4] bg-white shadow-[0_24px_80px_rgba(37,32,28,0.22)]">
            <div className="flex items-center justify-between bg-[#25201c] px-4 py-3 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat
              </div>
              <button type="button" className="rounded-md p-1 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close chat list">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="border-b border-[#eadfd4] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#eadfd4] px-3 py-2">
                <Search className="h-4 w-4 text-[#8a7c70]" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
              {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {conversations.slice(0, 5).map((conversation) => (
                <button key={conversation.id} type="button" className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#fff7f0]" onClick={() => void openConversation(conversation)}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1e8] text-xs font-bold text-[#f05a28]">
                    {conversation.type === "group" ? <UsersRound className="h-4 w-4" aria-hidden="true" /> : initials(conversation.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#25201c]">{conversation.name}</span>
                    <span className="block truncate text-xs text-[#8a7c70]">{conversation.lastMessage?.body || conversation.lastMessage?.attachment?.fileName || "No messages yet"}</span>
                  </span>
                </button>
              ))}
              <div className="my-2 border-t border-[#eadfd4]" />
              {filteredContacts.map((contact) => (
                <button key={contact.id} type="button" className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#fff7f0]" onClick={() => void startDirect(contact.id)}>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1e8] text-xs font-bold text-[#f05a28]">
                    {initials(contact.fullName)}
                    <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white", contact.online ? "bg-emerald-500" : "bg-[#b8afa7]")} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#25201c]">{contact.fullName}</span>
                    <span className="block truncate text-xs text-[#8a7c70]">{contact.online ? "Online" : contact.memberId ?? "Offline"}</span>
                  </span>
                </button>
              ))}
              {!filteredContacts.length && !conversations.length ? <p className="p-4 text-center text-sm text-[#8a7c70]">No chat members found.</p> : null}
            </div>
          </section>
        ) : null}

        <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f05a28] text-white shadow-[0_18px_45px_rgba(240,90,40,0.34)] transition hover:bg-[#d84c1f]" onClick={() => setOpen((value) => !value)} aria-label="Open chat">
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
