import type { PlaygroundConfig } from "../types";

/**
 * Parse playground config from raw response text.
 * Extracts the JSON between <playground_config> tags.
 */
export function parsePlaygroundConfig(text: string): PlaygroundConfig | null {
    const startTag = "<playground_config>";
    const endTag = "</playground_config>";
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) return null;

    const jsonStr = text.slice(startIdx + startTag.length, endIdx).trim();
    try {
        return JSON.parse(jsonStr) as PlaygroundConfig;
    } catch {
        return null;
    }
}

/**
 * Remove playground config block from text for display purposes.
 */
export function stripPlaygroundConfig(text: string): string {
    const startTag = "<playground_config>";
    const endTag = "</playground_config>";
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) return text;

    return (text.slice(0, startIdx) + text.slice(endIdx + endTag.length)).trim();
}
