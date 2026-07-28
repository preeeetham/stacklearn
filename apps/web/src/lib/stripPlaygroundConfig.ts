/**
 * Remove playground config block from text for display purposes. Defensive:
 * the server already filters control blocks out of streamed "text" events, so
 * this is a backstop against a block leaking through, not the primary parser
 * (that lives server-side in apps/server/src/agent/parsePlaygroundConfig.ts).
 */
export function stripPlaygroundConfig(text: string): string {
    const startTag = "<playground_config>";
    const endTag = "</playground_config>";
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) return text;

    return (text.slice(0, startIdx) + text.slice(endIdx + endTag.length)).trim();
}
