"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, fetchCurrentUser } from "@/lib/auth-client";

export function MemberChatButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [canChat, setCanChat] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then(({ user }) => {
        if (cancelled) return;
        const isMember = user.permissions.includes("member:access");
        setCanChat(isMember);
        if (!isMember) return;
        void apiRequest<{ id: string }>("/member/profile")
          .then((profile) => {
            if (!cancelled) setCanChat(profile.id !== memberId);
          })
          .catch(() => {
            if (!cancelled) setCanChat(true);
          });
      })
      .catch(() => {
        if (!cancelled) setCanChat(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (!canChat) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      className="h-10 w-full justify-between text-sm"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("mms:open-member-chat", {
            detail: { memberId },
          }),
        );
      }}
      aria-label={`Chat with ${memberName}`}
    >
      Chat
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
