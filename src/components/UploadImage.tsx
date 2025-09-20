"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";

type UploadImageProps = {
    onFileSelected?: (file: File) => void;
};

export default function UploadImage({ onFileSelected }: UploadImageProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [instructions, setInstructions] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    function formatMB(bytes: number): string {
        return (bytes / (1024 * 1024)).toFixed(2);
    }

    function triggerFileDialog() {
        inputRef.current?.click();
    }

    function selectFile(file: File | null) {
        setErrorMessage(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setResultImage(null);
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setErrorMessage("Please select a valid image file.");
            return;
        }
        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        onFileSelected?.(file);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        selectFile(event.target.files?.[0] ?? null);
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
        const file = event.dataTransfer.files?.[0] ?? null;
        selectFile(file);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);

        if (!selectedFile && !instructions.trim()) {
            setSubmitError("Enter a prompt or upload an image.");
            return;
        }

        try {
            setIsSubmitting(true);
            const body = new FormData();
            if (selectedFile) {
                body.append("file", selectedFile);
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
            setSubmitSuccess(
                typeof data.size === "number"
                    ? `Uploaded. Image size: ${formatMB(data.size)} MB.`
                    : "Uploaded successfully."
            );
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
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
            <div className="w-full rounded-2xl border border-black/10 dark:border-white/15 bg-background/70 backdrop-blur-sm shadow-sm p-6 md:p-8">
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
                                Drag and drop an image
                            </p>
                            <p className="text-xs text-foreground/60">
                                or click to choose a file
                            </p>
                        </div>
                        <button
                            type="button"
                            className="mt-2 inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-foreground text-background px-3 py-2 text-xs font-medium hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors"
                        >
                            Choose image
                        </button>
                    </div>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChange}
                />

                {errorMessage ? (
                    <div className="mt-4 w-full rounded-md border border-red-200/60 dark:border-red-400/30 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 text-sm">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-8">
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-sm text-foreground/70">
                            {selectedFile ? "Preview" : "Optional image"}
                        </p>
                        {selectedFile && previewUrl ? (
                            <Image
                                src={previewUrl}
                                alt="Selected image preview"
                                width={512}
                                height={512}
                                unoptimized
                                className="h-[28rem] w-[28rem] md:h-[32rem] md:w-[32rem] object-contain rounded-lg border border-black/10 dark:border-white/20 bg-black/5"
                            />
                        ) : (
                            <div className="h-[16rem] w-full max-w-[28rem] md:max-w-[32rem] rounded-lg border border-dashed border-black/10 dark:border-white/20 flex items-center justify-center text-foreground/50 text-sm">
                                No image selected
                            </div>
                        )}
                        {selectedFile ? (
                            <p className="text-xs text-foreground/60 truncate max-w-full">
                                {selectedFile.name}{" "}
                                <span className="text-foreground/50">
                                    ({formatMB(selectedFile.size)} MB)
                                </span>
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
                            onChange={(e) => setInstructions(e.target.value)}
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
                            {selectedFile ? (
                                <button
                                    type="button"
                                    onClick={() => selectFile(null)}
                                    className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-background text-foreground hover:bg-foreground/10 px-4 py-2 text-sm font-medium transition-colors"
                                >
                                    Clear image
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

            {resultImage ? (
                <div className="mt-8 w-full rounded-2xl border border-black/10 dark:border-white/15 bg-background/70 backdrop-blur-sm shadow-sm p-6 md:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Result</h2>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] px-3 py-2 text-xs font-medium transition-colors"
                        >
                            Download
                        </button>
                    </div>
                    <div className="w-full flex items-center justify-center">
                        <Image
                            src={resultImage}
                            alt="Generated result"
                            width={1024}
                            height={1024}
                            unoptimized
                            className="max-h-[36rem] w-auto object-contain rounded-lg border border-black/10 dark:border-white/20"
                        />
                    </div>
                </div>
            ) : null}
        </form>
    );
}
