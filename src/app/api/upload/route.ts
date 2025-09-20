import { NextRequest, NextResponse } from "next/server";

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
        console.log(
            "Prompt:",
            typeof prompt === "string" ? prompt : String(prompt)
        );
        console.log("Image size (bytes):", byteLength);

        return NextResponse.json({ ok: true, size: byteLength });
    } catch (error) {
        console.error("Upload error", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
