"use client";

import { useState } from "react";
import { Image as ImageIcon, Images, Library } from "lucide-react";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { MediaLibrary } from "@/components/admin/media-library";
import { cn } from "@/lib/utils";

type GalleryAdminTab = "photos" | "albums" | "library";

const tabs: Array<{ id: GalleryAdminTab; label: string; description: string; icon: typeof Library }> = [
  {
    id: "photos",
    label: "Photos",
    description: "Direct gallery uploads",
    icon: ImageIcon
  },
  {
    id: "albums",
    label: "Album",
    description: "Create and manage albums",
    icon: Images
  },
  {
    id: "library",
    label: "Media",
    description: "Upload and manage reusable files",
    icon: Library
  }
];

export function GalleryAdminTabs() {
  const [activeTab, setActiveTab] = useState<GalleryAdminTab>("photos");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white/95 p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                  active ? "bg-primary text-primary-foreground shadow-md shadow-primary/15" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", active ? "bg-white/18" : "bg-primary/10 text-primary")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{tab.label}</span>
                  <span className={cn("mt-0.5 block text-xs", active ? "text-white/72" : "text-muted-foreground")}>{tab.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "photos" ? <GalleryManager mode="gallery" compact /> : null}
      {activeTab === "albums" ? <GalleryManager mode="albums" compact /> : null}
      {activeTab === "library" ? <MediaLibrary /> : null}
    </div>
  );
}
