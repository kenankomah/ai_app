import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const prompt = formData.get("prompt");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Missing image file" },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const byteLength = arrayBuffer.byteLength;

        // Log to server console
        const promptText = typeof prompt === "string" ? prompt : String(prompt);
        console.log("Prompt:", promptText);
        console.log("Image size (bytes):", byteLength);

        // Call Gemini (Nano Banana) from the server
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Server misconfigured: GEMINI_API_KEY missing" },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const base64Data = Buffer.from(new Uint8Array(arrayBuffer)).toString(
            "base64"
        );
        const mimeType = file.type || "image/png";

        const contents: Array<any> = [];
        if (promptText && promptText !== "null" && promptText !== "undefined") {
            contents.push({ text: promptText });
        }
        contents.push({
            inlineData: {
                mimeType,
                data: base64Data,
            },
        });

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

        const parts = (response.candidates?.[0]?.content?.parts ??
            []) as Array<{
            text?: string;
            inlineData?: { data?: string; mimeType?: string };
        }>;
        const imagePart = parts.find((p) => p.inlineData?.data);
        if (!imagePart?.inlineData?.data) {
            return NextResponse.json(
                { error: "Model returned no image" },
                { status: 502 }
            );
        }

        return NextResponse.json({
            ok: true,
            size: byteLength,
            imageBase64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || "image/png",
        });
    } catch (error) {
        console.error("Upload error", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
