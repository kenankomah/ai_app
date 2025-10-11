import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const promptPart = formData.get("prompt");
        const multiFileParts = formData.getAll("files");
        const singleFilePart = formData.get("file");

        const files: File[] = [];
        for (const part of multiFileParts) {
            if (part instanceof File) files.push(part);
        }
        if (files.length === 0 && singleFilePart instanceof File) {
            files.push(singleFilePart);
        }

        const promptTextRaw =
            typeof promptPart === "string" ? promptPart.trim() : "";
        const hasUserPrompt =
            promptTextRaw.length > 0 &&
            promptTextRaw !== "null" &&
            promptTextRaw !== "undefined";
        const defaultMergePrompt =
            "Merge the provided images into a single cohesive image. Blend them naturally, align perspectives, and harmonize colors. Return only the merged image.";
        const effectivePrompt = hasUserPrompt
            ? promptTextRaw
            : files.length > 1
            ? defaultMergePrompt
            : "";

        // Load all files (if any) into base64
        let totalBytes = 0;
        const fileDatas: { data: string; mimeType: string }[] = [];
        for (const f of files) {
            const buf = await f.arrayBuffer();
            totalBytes += buf.byteLength;
            fileDatas.push({
                data: Buffer.from(new Uint8Array(buf)).toString("base64"),
                mimeType: f.type || "image/png",
            });
        }

        // Log to server console
        console.log("Prompt:", effectivePrompt || "<none>");
        console.log("Num images:", files.length);
        console.log("Total image bytes:", totalBytes);

        // Call Gemini (Nano Banana) from the server
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Server misconfigured: GEMINI_API_KEY missing" },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const contents: Array<{
            text?: string;
            inlineData?: { mimeType: string; data: string };
        }> = [];
        if (effectivePrompt) {
            contents.push({ text: effectivePrompt });
        }
        for (const fd of fileDatas) {
            contents.push({
                inlineData: { mimeType: fd.mimeType, data: fd.data },
            });
        }

        if (contents.length === 0) {
            return NextResponse.json(
                { error: "Provide a prompt or at least one image." },
                { status: 400 }
            );
        }

        let response;
        try {
            response = await ai.models.generateContent({
                model: "gemini-2.5-flash-image-preview",
                contents,
            });
        } catch (err: unknown) {
            console.error("Gemini API error", err);
            const status = (err as { status?: number })?.status;
            const message =
                (err as { message?: string })?.message ||
                "Failed to generate image";
            return NextResponse.json(
                { error: message },
                {
                    status:
                        typeof status === "number" &&
                        status >= 400 &&
                        status < 600
                            ? status
                            : 502,
                }
            );
        }

        // Handle safety blocks and rejections
        const promptFeedback = (
            response as unknown as {
                promptFeedback?: {
                    blockReason?: string;
                    blockReasonMessage?: string;
                };
            }
        )?.promptFeedback;
        if (promptFeedback?.blockReason) {
            const msg = promptFeedback.blockReasonMessage
                ? `Request blocked: ${promptFeedback.blockReason} - ${promptFeedback.blockReasonMessage}`
                : `Request blocked: ${promptFeedback.blockReason}`;
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const firstCandidate = response.candidates?.[0] as
            | {
                  finishReason?: string;
                  content?: {
                      parts?: Array<{
                          text?: string;
                          inlineData?: { data?: string; mimeType?: string };
                      }>;
                  };
                  safetyRatings?: unknown;
              }
            | undefined;

        if (
            firstCandidate?.finishReason &&
            [
                "SAFETY",
                "BLOCKLIST",
                "PROHIBITED",
                "RECITATION",
                "OTHER",
                "ERROR",
            ].includes(String(firstCandidate.finishReason).toUpperCase())
        ) {
            const safetyDetails = firstCandidate?.safetyRatings
                ? ` Details: ${JSON.stringify(firstCandidate.safetyRatings)}`
                : "";
            return NextResponse.json(
                {
                    error: `Generation blocked by policy (${firstCandidate.finishReason}).${safetyDetails}`,
                },
                { status: 400 }
            );
        }

        const parts = (firstCandidate?.content?.parts ?? []) as Array<{
            text?: string;
            inlineData?: { data?: string; mimeType?: string };
        }>;
        const imagePart = parts.find((p) => p.inlineData?.data);
        if (!imagePart?.inlineData?.data) {
            // Build a more descriptive reason when no image is returned
            const textMsg = parts.find((p) => p.text)?.text;
            const finishReason = firstCandidate?.finishReason;
            const finishMessage = (
                firstCandidate as unknown as { finishMessage?: string }
            )?.finishMessage;
            const safetyDetails = firstCandidate?.safetyRatings
                ? ` Details: ${JSON.stringify(firstCandidate.safetyRatings)}`
                : "";

            const reasons: string[] = [];
            if (promptFeedback?.blockReason) {
                reasons.push(
                    promptFeedback.blockReasonMessage
                        ? `Blocked: ${promptFeedback.blockReason} - ${promptFeedback.blockReasonMessage}`
                        : `Blocked: ${promptFeedback.blockReason}`
                );
            }
            if (finishReason) reasons.push(`Finish reason: ${finishReason}`);
            if (finishMessage) reasons.push(`Message: ${finishMessage}`);
            if (textMsg) reasons.push(`Model message: ${textMsg}`);
            if (safetyDetails) reasons.push(safetyDetails);

            const msg =
                reasons.length > 0
                    ? reasons.join(" | ")
                    : "Model returned no image";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        return NextResponse.json({
            ok: true,
            size: totalBytes || undefined,
            imageBase64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || "image/png",
        });
    } catch (error) {
        console.error("Upload error", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
