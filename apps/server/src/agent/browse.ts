import type { BrowseUrlArgs } from "../types/index.js";

/**
 * Strip HTML to plain text, preserving code blocks and basic structure.
 */
function stripHtml(html: string): string {
    let text = html;

    // Remove script and style tags entirely
    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    text = text.replace(/<header[\s\S]*?<\/header>/gi, "");

    // Convert code blocks
    text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n");
    text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

    // Convert headings
    text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
    text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
    text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
    text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");

    // Convert lists
    text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

    // Convert paragraphs and breaks
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/div>/gi, "\n");

    // Remove all remaining tags
    text = text.replace(/<[^>]+>/g, "");

    // Decode common HTML entities
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

    // Clean up whitespace
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    return text;
}

/**
 * Truncate text to approximately the given token count (rough estimate: 1 token ≈ 4 chars)
 */
function truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "\n\n[Content truncated for context length...]";
}

/**
 * Fetch and read content from a URL using Firecrawl or raw fetch.
 */
export async function browseUrl(args: BrowseUrlArgs): Promise<string> {
    const { url } = args;
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    try {
        if (firecrawlKey) {
            return await fetchWithFirecrawl(url, firecrawlKey);
        }
        return await fetchRaw(url);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Failed to fetch ${url}: ${message}`;
    }
}

async function fetchWithFirecrawl(url: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            url,
            formats: ["markdown"],
        }),
    });

    if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
        success: boolean;
        data?: { markdown?: string };
    };

    if (!data.success || !data.data?.markdown) {
        throw new Error("Firecrawl returned no content");
    }

    return truncateToTokens(data.data.markdown, 8000);
}

async function fetchRaw(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (compatible; StackLearn/1.0; +https://github.com/stacklearn)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const json = await response.json();
        return truncateToTokens(JSON.stringify(json, null, 2), 8000);
    }

    const html = await response.text();
    const text = stripHtml(html);
    return truncateToTokens(text, 8000);
}
