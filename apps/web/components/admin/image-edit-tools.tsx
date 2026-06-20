"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImageEditInput = {
  rotate?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  resizeWidth?: number;
  crop?: { left: number; top: number; width: number; height: number };
  saveAsCopy?: boolean;
  restoreOriginal?: boolean;
};

type ImageEditAsset = {
  id: string;
  title: string;
  width: number | null;
  height: number | null;
  originalUrl: string | null;
};

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function ImageEditTools({
  item,
  onEdit,
  disabled = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: {
  item: ImageEditAsset;
  onEdit: (input: ImageEditInput) => void | Promise<void>;
  disabled?: boolean;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const naturalWidth = item.width ?? 1200;
  const naturalHeight = item.height ?? 800;
  const defaultCrop = useMemo(() => {
    const width = Math.max(1, Math.round(naturalWidth * 0.8));
    const height = Math.max(1, Math.round(naturalHeight * 0.8));
    return {
      left: Math.max(0, Math.round((naturalWidth - width) / 2)),
      top: Math.max(0, Math.round((naturalHeight - height) / 2)),
      width,
      height
    };
  }, [naturalHeight, naturalWidth]);

  const [resizeWidth, setResizeWidth] = useState(String(Math.min(1600, naturalWidth)));
  const [crop, setCrop] = useState(defaultCrop);
  const [saveAsCopy, setSaveAsCopy] = useState(false);

  useEffect(() => {
    setResizeWidth(String(Math.min(1600, naturalWidth)));
    setCrop(defaultCrop);
    setSaveAsCopy(false);
  }, [defaultCrop, item.id, naturalWidth]);

  function updateCrop(key: keyof typeof crop, value: string) {
    const numeric = Math.round(Number(value));
    setCrop((current) => {
      const next = { ...current, [key]: numeric };
      next.left = clamp(next.left, 0, Math.max(0, naturalWidth - 1));
      next.top = clamp(next.top, 0, Math.max(0, naturalHeight - 1));
      next.width = clamp(next.width, 1, Math.max(1, naturalWidth - next.left));
      next.height = clamp(next.height, 1, Math.max(1, naturalHeight - next.top));
      return next;
    });
  }

  async function applyResize() {
    const width = clamp(Math.round(Number(resizeWidth)), 1, 1600);
    setResizeWidth(String(width));
    await onEdit({ resizeWidth: width, saveAsCopy });
  }

  async function applyCrop() {
    const safeCrop = {
      left: clamp(Math.round(crop.left), 0, Math.max(0, naturalWidth - 1)),
      top: clamp(Math.round(crop.top), 0, Math.max(0, naturalHeight - 1)),
      width: clamp(Math.round(crop.width), 1, Math.max(1, naturalWidth - crop.left)),
      height: clamp(Math.round(crop.height), 1, Math.max(1, naturalHeight - crop.top))
    };
    setCrop(safeCrop);
    await onEdit({ crop: safeCrop, saveAsCopy });
  }

  return (
    <div className="grid gap-3 rounded-2xl border bg-white p-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Edit image</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Crop and resize are applied directly to the image file. Current size: {naturalWidth} x {naturalHeight}px.
        </p>
      </div>

      <div className="grid gap-2">
          {(onUndo || onRedo) ? (
            <div className="flex flex-wrap gap-2 rounded-xl border bg-slate-50 p-2">
              <Button type="button" variant="outline" size="sm" disabled={disabled || !canUndo} onClick={() => void onUndo?.()}>
                Undo
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={disabled || !canRedo} onClick={() => void onRedo?.()}>
                Redo
              </Button>
            </div>
          ) : null}

          <label className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm font-medium">
            <input type="checkbox" checked={saveAsCopy} disabled={disabled} onChange={(event) => setSaveAsCopy(event.target.checked)} />
            Save as new copy
          </label>

          <div className="grid gap-2 rounded-xl border p-2">
            <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
              <span>Resize width</span>
              <input disabled={disabled} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground disabled:opacity-60" type="number" min={1} max={1600} value={resizeWidth} onChange={(event) => setResizeWidth(event.target.value)} />
            </label>
            <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" disabled={disabled} onClick={() => void applyResize()}>
              Apply
            </Button>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border p-2">
            <p className="text-sm font-semibold leading-none">Crop</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["left", "Left"],
                ["top", "Top"],
                ["width", "Width"],
                ["height", "Height"]
              ] as const).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-xs font-medium text-muted-foreground">
                  {label}
                  <input disabled={disabled} className="h-9 rounded-md border bg-background px-2 text-sm text-foreground disabled:opacity-60" type="number" min={key === "width" || key === "height" ? 1 : 0} value={crop[key]} onChange={(event) => updateCrop(key, event.target.value)} />
                </label>
              ))}
            </div>
            <Button type="button" size="sm" disabled={disabled} onClick={() => void applyCrop()}>
              Apply crop
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEdit({ rotate: -90, saveAsCopy })}>Rotate left</Button>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEdit({ rotate: 90, saveAsCopy })}>Rotate right</Button>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEdit({ flipHorizontal: true, saveAsCopy })}>Flip H</Button>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEdit({ flipVertical: true, saveAsCopy })}>Flip V</Button>
            {item.originalUrl ? (
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEdit({ restoreOriginal: true })}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Restore
              </Button>
            ) : null}
          </div>
      </div>
    </div>
  );
}
