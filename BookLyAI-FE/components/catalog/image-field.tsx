"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/features/business/api";
import { ApiError } from "@/types";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ImageField({ value, onChange, disabled }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setLocalError(null);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <span className="inline-flex h-11 items-center rounded-xl border border-line bg-background px-4 text-sm transition hover:border-accent/40">
            {uploading ? "Uploading…" : "Upload from computer"}
          </span>
        </label>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3 text-xs"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste picture URL (https://…)"
        disabled={disabled || uploading}
      />
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-28 w-full rounded-xl object-cover" />
      ) : null}
      {localError ? <p className="text-xs text-danger">{localError}</p> : null}
    </div>
  );
}
