"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, X } from "lucide-react";
import { downloadChatAttachment } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type ChatAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatAttachmentViewer({ attachment, own = false, compact = false }: { attachment: ChatAttachment; own?: boolean; compact?: boolean }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";

  const label = useMemo(() => `${attachment.fileName} (${fileSize(attachment.fileSize)})`, [attachment.fileName, attachment.fileSize]);

  async function ensureObjectUrl() {
    if (objectUrl) return objectUrl;
    setLoading(true);
    setError(null);
    try {
      const downloaded = await downloadChatAttachment(attachment.id);
      const url = URL.createObjectURL(downloaded.blob);
      setObjectUrl(url);
      return url;
    } catch {
      setError("Attachment could not be loaded.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    setError(null);
    try {
      const downloaded = await downloadChatAttachment(attachment.id);
      const url = URL.createObjectURL(downloaded.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloaded.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Attachment could not be downloaded.");
    }
  }

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    void ensureObjectUrl().then((url) => {
      if (cancelled && url) URL.revokeObjectURL(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id, isImage]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <>
      <div className={cn("mt-2 overflow-hidden rounded-xl border", own ? "border-white/25 bg-white/10" : "border-[#eadfd4] bg-white")}>
        {isImage && objectUrl ? (
          <button type="button" className="block w-full" onClick={() => setViewerOpen(true)} aria-label={`View ${attachment.fileName}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={objectUrl} alt={attachment.fileName} className={cn("w-full object-cover", compact ? "max-h-40" : "max-h-72")} />
          </button>
        ) : null}
        <div className="flex items-center gap-2 px-2 py-2 text-xs">
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {isImage || isPdf ? (
            <button
              type="button"
              className={cn("rounded-md p-1 transition", own ? "hover:bg-white/15" : "hover:bg-[#fff7f0]")}
              onClick={async () => {
                const url = await ensureObjectUrl();
                if (url) setViewerOpen(true);
              }}
              aria-label={`View ${attachment.fileName}`}
              disabled={loading}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" className={cn("rounded-md p-1 transition", own ? "hover:bg-white/15" : "hover:bg-[#fff7f0]")} onClick={() => void download()} aria-label={`Download ${attachment.fileName}`}>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {error ? <p className={cn("px-2 pb-2 text-[11px]", own ? "text-white/75" : "text-red-600")}>{error}</p> : null}
      </div>

      {viewerOpen && objectUrl ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#25201c]">{attachment.fileName}</p>
                <p className="text-xs text-[#8a7c70]">{fileSize(attachment.fileSize)}</p>
              </div>
              <button type="button" className="rounded-md p-2 text-[#5f5349] hover:bg-[#fff7f0]" onClick={() => setViewerOpen(false)} aria-label="Close viewer">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-[#f8f4ef] p-3">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={objectUrl} alt={attachment.fileName} className="mx-auto max-h-[78vh] max-w-full rounded-lg object-contain" />
              ) : isPdf ? (
                <iframe src={objectUrl} title={attachment.fileName} className="h-[78vh] w-full rounded-lg border bg-white" />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
