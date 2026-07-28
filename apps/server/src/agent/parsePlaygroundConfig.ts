// Relative path, not the "@stacklearn/shared" package name — see the comment
// in apps/server/src/types/index.ts for why (Vercel Edge Function bundling).
import {
    PlaygroundConfigSchema,
    type PlaygroundConfig,
} from "../../../../packages/shared/src/playgroundConfig.js";

// Control blocks the model emits after the visible explanation. Their contents
// are parsed by the system and must never be streamed to the chat UI.
export const PLAYGROUND_START = "<playground_config>";
export const PLAYGROUND_END = "</playground_config>";
export const FOLLOWUPS_START = "<follow_ups>";
export const FOLLOWUPS_END = "</follow_ups>";
// Files are emitted as raw <file path="...">…</file> blocks (not JSON-escaped
// inside the config), so the model writes code as plain text instead of
// escaping a whole file into a JSON string — the escaping is where it used to
// drop closing quotes/brackets and produce code that wouldn't compile.
const FILE_START = "<file";
const THINK_START = "<think>";

// Line-anchored: these tags are only recognized at the start of a line (the
// system prompt always emits them on their own line at the end of the
// response). A plain substring search would false-positive on ordinary
// explanation text that happens to mention e.g. a `<file-icon>` web component
// or a `<filename>` placeholder, truncating the visible response mid-sentence.
const PLAYGROUND_START_RE = /^<playground_config>/m;
const FOLLOWUPS_START_RE = /^<follow_ups>/m;
const FILE_START_RE = /^<file\s+path=/m;
const FILE_BLOCK_RE = /^<file\s+path=["']([^"']+)["']\s*>\n?([\s\S]*?)^<\/file>\s*$/gm;

const CONTROL_TAG_PATTERNS: RegExp[] = [PLAYGROUND_START_RE, FOLLOWUPS_START_RE, FILE_START_RE];
// Used only for the trailing-partial-tag heuristic in safeVisibleLength (see
// below) — a plain prefix list is fine there since it's checking suffixes of
// the accumulated buffer, not scanning arbitrary text for false positives.
const CONTROL_TAGS = [PLAYGROUND_START, FOLLOWUPS_START, FILE_START, THINK_START];

/**
 * Extract the JSON payload between a start/end tag pair, or null if absent.
 * Both tags must be line-anchored (see CONTROL_TAG_PATTERNS above).
 */
function extractBlock(text: string, startRe: RegExp, endTag: string): string | null {
    const startMatch = startRe.exec(text);
    if (!startMatch) return null;
    const startIdx = startMatch.index;
    const endIdx = text.indexOf(endTag, startIdx);
    if (endIdx === -1) return null;
    const contentStart = startIdx + startMatch[0].length;
    return text.slice(contentStart, endIdx).trim();
}

/**
 * Strip `<think>...</think>` reasoning blocks that some models (e.g. Groq's
 * gpt-oss / qwen reasoning models) prepend to their output. These must never
 * reach the chat UI or the control-block parsers. Handles multiple complete
 * blocks and a trailing unclosed block (stream ended, or still streaming and
 * the closing tag hasn't arrived yet).
 */
export function stripThinkBlocks(text: string): string {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "");
    const openIdx = cleaned.toLowerCase().lastIndexOf("<think>");
    if (openIdx !== -1 && cleaned.toLowerCase().indexOf("</think>", openIdx) === -1) {
        cleaned = cleaned.slice(0, openIdx);
    }
    return cleaned;
}

/**
 * Length of text that is safe to stream to the UI: everything before the first
 * control block, holding back a trailing fragment that might be a partial
 * opening tag (e.g. "<play") so it never leaks into the visible chat.
 */
export function safeVisibleLength(text: string): number {
    let cut = text.length;
    for (const re of CONTROL_TAG_PATTERNS) {
        const match = re.exec(text);
        if (match) cut = Math.min(cut, match.index);
    }
    if (cut === text.length) {
        const lt = text.lastIndexOf("<");
        if (lt !== -1 && (lt === 0 || text[lt - 1] === "\n")) {
            const suffix = text.slice(lt);
            if (CONTROL_TAGS.some((tag) => tag.startsWith(suffix))) {
                cut = lt;
            }
        }
    }
    return cut;
}

const NODE_BUILTINS = new Set([
    "assert", "buffer", "child_process", "cluster", "console", "constants",
    "crypto", "dgram", "diagnostics_channel", "dns", "domain", "events", "fs",
    "http", "http2", "https", "inspector", "module", "net", "os", "path",
    "perf_hooks", "process", "punycode", "querystring", "readline", "repl",
    "stream", "string_decoder", "sys", "timers", "tls", "trace_events", "tty",
    "url", "util", "v8", "vm", "worker_threads", "zlib",
]);

// Best-effort pinned versions for packages this app's own prompt already
// recommends. Anything else inferred from imports falls back to "latest" —
// better than a missing dependency that fails at runtime with no version at
// all, even though it isn't a reproducible pin.
const KNOWN_VERSIONS: Record<string, string> = {
    hono: "^4.4.0",
    "@hono/node-server": "^1.13.0",
    express: "^4.19.2",
    tsx: "^4.19.0",
    typescript: "^5.5.0",
};

const IMPORT_SPECIFIER_RE =
    /\bfrom\s+["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;

function packageRootName(specifier: string): string {
    if (specifier.startsWith("@")) {
        return specifier.split("/").slice(0, 2).join("/");
    }
    return specifier.split("/")[0];
}

/**
 * Scan file contents for bare-module imports/requires and return the set of
 * package names actually used by the code, excluding relative imports and
 * Node builtins. Used to repair a package.json that's missing a dependency
 * the model imported but forgot to declare.
 */
export function inferImportedPackages(files: Record<string, string>): Set<string> {
    const packages = new Set<string>();
    for (const [path, contents] of Object.entries(files)) {
        if (path === "package.json") continue;
        IMPORT_SPECIFIER_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = IMPORT_SPECIFIER_RE.exec(contents)) !== null) {
            const specifier = match[1] || match[2] || match[3];
            if (!specifier) continue;
            if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
            if (specifier.startsWith("node:")) continue;
            const root = packageRootName(specifier);
            if (NODE_BUILTINS.has(root)) continue;
            packages.add(root);
        }
    }
    return packages;
}

/**
 * Best-effort port inference from source when the model left previewPort
 * null but the code clearly binds an HTTP server to a port.
 */
export function inferPreviewPort(files: Record<string, string>): number | null {
    const combined = Object.values(files).join("\n");
    const patterns = [/\.listen\(\s*(\d{2,5})/, /port\s*[:=]\s*(\d{2,5})/i];
    for (const re of patterns) {
        const match = combined.match(re);
        if (match) {
            const port = parseInt(match[1], 10);
            if (port > 0 && port < 65536) return port;
        }
    }
    return null;
}

interface RawPlaygroundConfig {
    runtime?: string;
    entry?: string;
    files: Record<string, string>;
    installCommand?: string;
    startCommand?: string;
    previewPort?: number | string | null;
}

/**
 * Guarantee the playground config actually runs in the WebContainer sandbox even
 * if the model forgot a detail: force `tsx` over the fragile `ts-node`, make
 * sure `tsx` + `typescript` are declared when the entry file is TypeScript,
 * infer missing dependencies from imports, and coerce/infer previewPort.
 */
export function normalizePlaygroundConfig(config: RawPlaygroundConfig): PlaygroundConfig {
    const files = { ...config.files };

    const fileKeys = Object.keys(files);
    // Entry-file fallback: the model sometimes declares an `entry` that
    // doesn't match any emitted file (typo, or a path prefix mismatch like
    // "index.ts" vs "src/index.ts"). Falling back only when `entry` is falsy
    // (the old behavior) leaves a config pointing at a file that was never
    // mounted — validate that it actually exists in `files` too.
    const entry = config.entry && files[config.entry] !== undefined ? config.entry : fileKeys[0];

    const usesTypeScript = entry?.endsWith(".ts") || fileKeys.some((f) => f.endsWith(".ts"));

    // ts-node is unreliable in WebContainers; tsx is the drop-in replacement.
    let startCommand = (config.startCommand || `npx tsx ${entry}`).replace(/\bts-node\b/g, "tsx");
    if (usesTypeScript && !/\btsx\b/.test(startCommand) && /\bnode\b/.test(startCommand)) {
        startCommand = startCommand.replace(/\bnode\b/, "tsx");
    }

    if (typeof files["package.json"] === "string") {
        try {
            const pkg = JSON.parse(files["package.json"]) as {
                devDependencies?: Record<string, string>;
                dependencies?: Record<string, string>;
                [k: string]: unknown;
            };
            pkg.devDependencies = pkg.devDependencies || {};
            pkg.dependencies = pkg.dependencies || {};
            const hasDep = (name: string) =>
                pkg.devDependencies?.[name] || pkg.dependencies?.[name];

            if (usesTypeScript) {
                if (!hasDep("tsx")) pkg.devDependencies.tsx = KNOWN_VERSIONS.tsx;
                if (!hasDep("typescript")) pkg.devDependencies.typescript = KNOWN_VERSIONS.typescript;
            }

            // Dependency inference: declare any package actually imported by
            // the code but missing from package.json, so a forgotten
            // dependency doesn't surface as a runtime "Cannot find module".
            for (const pkgName of inferImportedPackages(files)) {
                if (!hasDep(pkgName)) {
                    pkg.dependencies[pkgName] = KNOWN_VERSIONS[pkgName] || "latest";
                }
            }

            files["package.json"] = JSON.stringify(pkg, null, 2);
        } catch {
            // Leave package.json untouched if it isn't valid JSON.
        }
    }

    // previewPort: coerce a stringified port ("3000") into a number, then
    // fall back to inferring it from the code if the model left it null.
    let previewPort: number | null;
    if (typeof config.previewPort === "string") {
        const parsed = parseInt(config.previewPort, 10);
        previewPort = Number.isFinite(parsed) ? parsed : null;
    } else {
        previewPort = config.previewPort ?? null;
    }
    if (previewPort == null) {
        previewPort = inferPreviewPort(files);
    }

    return {
        runtime: "node",
        entry,
        files,
        installCommand: config.installCommand || "npm install",
        startCommand,
        previewPort,
    };
}

export type ParsedPlaygroundConfigResult =
    | { ok: true; config: PlaygroundConfig }
    | { ok: false; reason: string }
    | { ok: false; reason: null }; // no <playground_config> block present at all — not an error

/**
 * Parse playground config from the assistant's response text.
 *
 * Pipeline: parse the raw blocks -> repair via normalization -> validate
 * against the shared zod schema -> report success or a typed failure reason.
 * A `reason: null` result means there was no playground_config block in the
 * response at all, which is a legitimate outcome (not every reply needs one).
 */
export function parsePlaygroundConfig(text: string): ParsedPlaygroundConfigResult {
    const metaStr = extractBlock(text, PLAYGROUND_START_RE, PLAYGROUND_END);
    if (!metaStr) {
        return { ok: false, reason: null };
    }

    let meta: RawPlaygroundConfig;
    try {
        meta = JSON.parse(metaStr) as RawPlaygroundConfig;
    } catch {
        return { ok: false, reason: "The playground metadata block wasn't valid JSON." };
    }

    // Collect the raw file blocks. Trailing whitespace before </file> is
    // trimmed; the first newline right after the opening tag is dropped by the
    // regex so file contents start on their own line cleanly.
    const files: Record<string, string> = {};
    FILE_BLOCK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FILE_BLOCK_RE.exec(text)) !== null) {
        const path = match[1].trim();
        const contents = match[2].replace(/\s+$/, "");
        if (path) files[path] = contents;
    }

    if (Object.keys(files).length === 0) {
        return { ok: false, reason: "No file blocks were found alongside the playground config." };
    }

    const normalized = normalizePlaygroundConfig({ ...meta, files });

    const result = PlaygroundConfigSchema.safeParse(normalized);
    if (!result.success) {
        const reason = result.error.issues
            .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
            .join("; ");
        return { ok: false, reason: `Generated playground config was invalid: ${reason}` };
    }

    return { ok: true, config: result.data };
}

/**
 * Parse the follow-up questions block into a list of up to 3 strings.
 */
export function parseFollowUps(text: string): string[] | null {
    const jsonStr = extractBlock(text, FOLLOWUPS_START_RE, FOLLOWUPS_END);
    if (!jsonStr) return null;
    try {
        const parsed = JSON.parse(jsonStr) as unknown;
        if (!Array.isArray(parsed)) return null;
        const questions = parsed
            .filter((q): q is string => typeof q === "string")
            .map((q) => q.trim())
            .filter((q) => q.length > 0)
            .slice(0, 3);
        return questions.length > 0 ? questions : null;
    } catch {
        return null;
    }
}

// Exported for the orchestrator's incremental-emit loop.
export { FILE_START, THINK_START };
