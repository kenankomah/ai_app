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

    function handleClick() {
        inputRef.current?.click();
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;
        setErrorMessage(null);
        setSelectedFile(null);
        setPreviewUrl(null);

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

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);

        if (!selectedFile) {
            setSubmitError("Please choose an image before submitting.");
            return;
        }

        try {
            setIsSubmitting(true);
            const body = new FormData();
            body.append("file", selectedFile);
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
                    ? `Uploaded. Image size: ${data.size} bytes.`
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

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl flex flex-col items-center gap-4"
        >
            <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-background text-foreground hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] px-4 py-2 text-sm font-medium transition-colors"
            >
                Upload image
            </button>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
            />

            {errorMessage ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                    {errorMessage}
                </p>
            ) : null}

            {selectedFile ? (
                <div className="w-full flex flex-col items-center gap-3">
                    <p className="text-sm text-foreground/80">
                        {selectedFile.name}
                    </p>
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt="Selected image preview"
                            width={512}
                            height={512}
                            unoptimized
                            className="h-[32rem] w-[32rem] object-contain rounded-md border border-black/10 dark:border-white/20"
                        />
                    ) : null}
                </div>
            ) : null}

            <div className="w-full">
                <label
                    htmlFor="edit-instructions"
                    className="block text-sm font-medium mb-2"
                >
                    Editing instructions
                </label>
                <textarea
                    id="edit-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Describe how to edit the image (e.g., crop, brighten, remove background)"
                    className="w-full min-h-24 rounded-md border border-black/10 dark:border-white/20 bg-background text-foreground p-3 text-sm placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
                />
            </div>

            <div className="w-full flex flex-col items-center gap-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/20 bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition-colors"
                >
                    {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                {submitError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {submitError}
                    </p>
                ) : null}
                {submitSuccess ? (
                    <p className="text-sm text-green-700 dark:text-green-400">
                        {submitSuccess}
                    </p>
                ) : null}
            </div>

            {resultImage ? (
                <div className="w-full flex flex-col items-center gap-2">
                    <h2 className="text-lg font-semibold mt-2">Result</h2>
                    <Image
                        src={resultImage}
                        alt="Generated result"
                        width={512}
                        height={512}
                        unoptimized
                        className="h-[32rem] w-[32rem] object-contain rounded-md border border-black/10 dark:border-white/20"
                    />
                </div>
            ) : null}
        </form>
    );
}
