"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageOff, Loader2 } from "lucide-react";

import { BikeSilhouette } from "@/components/ui/illustrations/BikeSilhouette";
import { cn } from "@/lib/utils";

type BikePhotoUploaderProps = {
  bikeId: string;
  imageUrl: string | null;
  bikeName: string;
  className?: string;
};

/**
 * Photo pane of the bike profile card. Shows the uploaded photo (or a branded
 * placeholder) with controls to add, replace, or remove it.
 */
export function BikePhotoUploader({
  bikeId,
  imageUrl,
  bikeName,
  className,
}: BikePhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(file: File | undefined) {
    if (!file || isBusy) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/bikes/${bikeId}/image`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not upload the photo.");
      }

      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Could not upload the photo.",
      );
    } finally {
      setIsBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/bikes/${bikeId}/image`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not remove the photo.");
      }

      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "Could not remove the photo.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={cn("relative min-h-[220px] overflow-hidden lg:min-h-[280px]", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          void handleFileChange(event.target.files?.[0]);
        }}
      />

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`${bikeName} photo`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="hero-gradient absolute inset-0">
          <BikeSilhouette className="absolute -bottom-4 -right-6 h-3/4 w-auto max-w-none text-brand-400/50" />
          <div className="absolute inset-x-0 top-0 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              No photo yet
            </p>
          </div>
        </div>
      )}

      {/* Photo controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {imageUrl ? "Replace photo" : "Add photo"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              void handleRemove();
            }}
            aria-label="Remove photo"
            title="Remove photo"
            className="inline-flex items-center rounded-lg bg-slate-900/80 p-1.5 text-white backdrop-blur transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImageOff className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="absolute inset-x-3 bottom-12 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          {error}
        </p>
      ) : null}
    </div>
  );
}
