export const GEMINI_IMAGE_MODEL_OPTIONS = [
    {
        id: "gemini-3.1-flash-image-preview",
        label: "Nano Banana 2 (3.1 Flash, latest)",
    },
    {
        id: "gemini-2.5-flash-image",
        label: "Nano Banana (2.5 Flash, stable)",
    },
    {
        id: "gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image",
    },
] as const;

export type GeminiImageModelId = (typeof GEMINI_IMAGE_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_GEMINI_IMAGE_MODEL: GeminiImageModelId =
    "gemini-3-pro-image-preview";

const ALLOWED = new Set<string>(
    GEMINI_IMAGE_MODEL_OPTIONS.map((o) => o.id)
);

export function isAllowedGeminiImageModel(
    id: string | null | undefined
): id is GeminiImageModelId {
    return typeof id === "string" && ALLOWED.has(id);
}
