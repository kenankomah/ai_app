"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";

type UploadImageProps = {
    onFileSelected?: (file: File) => void;
};

export default function UploadImage({ onFileSelected }: UploadImageProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const appendNextSelectionRef = useRef<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [instructions, setInstructions] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const MAX_IMAGES = 10; // configurable
    const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB total, configurable

    // removed size formatter since we don't display per-file sizes in multi-select UI

    function triggerFileDialog() {
        inputRef.current?.click();
    }

    function triggerAddMoreDialog() {
        appendNextSelectionRef.current = true;
        inputRef.current?.click();
    }

    function handleClear() {
        setSelectedFiles([]);
        setPreviewUrls([]);
        setResultImage(null);
        setSubmitError(null);
        setSubmitSuccess(null);
        setErrorMessage(null);
    }

    function selectFiles(
        filesLike: FileList | File[] | null,
        append: boolean = false
    ) {
        setErrorMessage(null);
        setResultImage(null);
        if (!filesLike) return;

        const incoming: File[] = Array.from(filesLike).filter((f) =>
            f.type.startsWith("image/")
        );
        if (incoming.length === 0) {
            setErrorMessage("Please select valid image files.");
            return;
        }

        // Build combined list respecting append
        const base = append && selectedFiles.length > 0 ? selectedFiles : [];
        const combined = [...base, ...incoming];

        // De-dup simple key
        const seen = new Set<string>();
        const deduped: File[] = [];
        for (const f of combined) {
            const key = `${f.name}_${f.size}_${f.lastModified}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(f);
            }
        }

        // Enforce max count
        if (deduped.length > MAX_IMAGES) {
            setErrorMessage(`You can upload up to ${MAX_IMAGES} images.`);
            // Keep the first MAX_IMAGES to avoid surprising the user
            deduped.length = MAX_IMAGES;
        }

        // Enforce total size cap
        const totalBytes = deduped.reduce((acc, f) => acc + f.size, 0);
        if (totalBytes > MAX_TOTAL_BYTES) {
            setErrorMessage(
                `Total size exceeds ${(MAX_TOTAL_BYTES / (1024 * 1024)).toFixed(
                    1
                )} MB. ` + `Please remove some images or use smaller files.`
            );
            return; // do not update selection
        }

        setSelectedFiles(deduped);

        // Rebuild preview URLs to match deduped list
        setPreviewUrls(deduped.map((f) => URL.createObjectURL(f)));

        if (deduped[0]) onFileSelected?.(deduped[0]);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const append =
            appendNextSelectionRef.current || selectedFiles.length > 0;
        selectFiles(event.target.files ?? null, append);
        appendNextSelectionRef.current = false;
        event.currentTarget.value = ""; // allow selecting same files again
    }

    function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files ?? null;
        const append = selectedFiles.length > 0;
        selectFiles(files, append);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);

        if (selectedFiles.length === 0 && !instructions.trim()) {
            setSubmitError("Enter a prompt or upload images.");
            return;
        }

        try {
            setIsSubmitting(true);
            const body = new FormData();
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    body.append("files", file);
                }
                // Keep backward compatibility with existing API that expects a single "file"
                if (selectedFiles[0]) body.append("file", selectedFiles[0]);
            }
            body.append("prompt", instructions);

            const response = await fetch("/api/upload", {
                method: "POST",
                body,
            });

            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                throw new Error(errorData.error || "Upload failed");
            }

            const data = (await response.json()) as {
                ok?: boolean;
                size?: number;
                imageBase64?: string;
                mimeType?: string;
            };
            setSubmitSuccess("Image generated successfully.");
            if (data.imageBase64) {
                const type = data.mimeType || "image/png";
                setResultImage(`data:${type};base64,${data.imageBase64}`);
            }
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Unexpected error"
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleDownload() {
        if (!resultImage) return;
        const link = document.createElement("a");
        link.href = resultImage;
        link.download = "result.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-7xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Left: Input card */}
                <div className="w-full rounded-2xl border border-black/10 dark:border-white/15 bg-background/70 backdrop-blur-sm shadow-sm p-6 md:p-8">
                    {selectedFiles.length === 0 ? (
                        <div
                            onClick={triggerFileDialog}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={
                                "w-full cursor-pointer rounded-xl border-2 border-dashed p-8 transition-colors " +
                                (isDragging
                                    ? "border-[#3b82f6] bg-[#3b82f6]/5"
                                    : "border-black/15 dark:border-white/20 hover:bg-foreground/5")
                            }
                        >
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="h-12 w-12 rounded-full border border-black/10 dark:border-white/20 flex items-center justify-center">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-6 w-6 text-foreground/70"
                                    >
                                        <path d="M12 16a1 1 0 0 1-1-1V8.41l-2.3 2.3a1 1 0 1 1-1.4-1.42l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 1 1-1.4 1.42L13 8.4V15a1 1 0 0 1-1 1Z" />
                                        <path d="M5 15a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2a1 1 0 1 0-2 0v2H6v-2a1 1 0 0 0-1-1Z" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Drag and drop images
                                    </p>
                                    <p className="text-xs text-foreground/60">
                                        or click to choose files
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="mt-2 inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-foreground text-background px-3 py-2 text-xs font-medium hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors"
                                >
                                    Choose images
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleChange}
                    />

                    {errorMessage ? (
                        <div className="mt-4 w-full rounded-md border border-red-200/60 dark:border-red-400/30 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 text-sm">
                            {errorMessage}
                        </div>
                    ) : null}

                    <div className="mt-6 grid gap-6">
                        <div className="flex flex-col items-center gap-3">
                            <p className="text-sm text-foreground/70">
                                {selectedFiles.length > 0
                                    ? `Preview (${selectedFiles.length} image${
                                          selectedFiles.length > 1 ? "s" : ""
                                      })`
                                    : "Optional images"}
                            </p>
                            {selectedFiles.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-full">
                                    {previewUrls.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="w-40 h-40 rounded-lg border border-black/10 dark:border-white/20 bg-black/5 overflow-hidden flex items-center justify-center"
                                        >
                                            <Image
                                                src={url}
                                                alt={`Selected image ${
                                                    idx + 1
                                                }`}
                                                width={160}
                                                height={160}
                                                unoptimized
                                                className="object-contain w-full h-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            {selectedFiles.length > 0 ? (
                                <p className="text-xs text-foreground/60 truncate max-w-full">
                                    {selectedFiles[0].name}
                                    {selectedFiles.length > 1
                                        ? ` + ${selectedFiles.length - 1} more`
                                        : ""}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-col gap-3">
                            <label
                                htmlFor="edit-instructions"
                                className="text-sm font-medium"
                            >
                                Prompt (describe what to generate or edit)
                            </label>
                            <textarea
                                id="edit-instructions"
                                value={instructions}
                                onChange={(e) =>
                                    setInstructions(e.target.value)
                                }
                                placeholder="E.g., generate a watercolor landscape at sunset; or place this image as a repeating t‑shirt pattern"
                                className="w-full min-h-40 rounded-md border border-black/10 dark:border-white/20 bg-background text-foreground p-3 text-sm placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
                            />
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition-colors"
                                >
                                    {isSubmitting ? (
                                        <span className="inline-flex items-center gap-2">
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                ></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        "Submit"
                                    )}
                                </button>
                                {selectedFiles.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={triggerAddMoreDialog}
                                        disabled={
                                            selectedFiles.length >= MAX_IMAGES
                                        }
                                        className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-background text-foreground hover:bg-foreground/10 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Add images
                                    </button>
                                ) : null}
                                {selectedFiles.length > 0 || resultImage ? (
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-background text-foreground hover:bg-foreground/10 px-4 py-2 text-sm font-medium transition-colors"
                                    >
                                        Clear images
                                    </button>
                                ) : null}
                            </div>
                            {submitError ? (
                                <div className="w-full rounded-md border border-red-200/60 dark:border-red-400/30 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 text-sm">
                                    {submitError}
                                </div>
                            ) : null}
                            {submitSuccess ? (
                                <div className="w-full rounded-md border border-emerald-200/60 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-3 text-sm">
                                    {submitSuccess}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Right: Result card */}
                <div className="w-full rounded-2xl border border-black/10 dark:border-white/15 bg-background/70 backdrop-blur-sm shadow-sm p-6 md:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Output</h2>
                        {resultImage ? (
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] px-3 py-2 text-xs font-medium transition-colors"
                            >
                                Download
                            </button>
                        ) : null}
                    </div>
                    <div className="w-full flex items-center justify-center">
                        {resultImage ? (
                            <Image
                                src={resultImage}
                                alt="Generated result"
                                width={1024}
                                height={1024}
                                unoptimized
                                className="max-h-[36rem] w-auto object-contain rounded-lg border border-black/10 dark:border-white/20"
                            />
                        ) : (
                            <div className="h-[24rem] w-full rounded-lg border-2 border-dashed border-black/10 dark:border-white/20 flex items-center justify-center text-foreground/50 text-lg">
                                Generated output will appear here
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
