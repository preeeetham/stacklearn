const RUNNABLE_EXTENSIONS = new Set(["js", "mjs", "cjs", "ts", "mts", "cts", "tsx", "jsx"]);

/**
 * Whether a playground's entry file is something the Node sandbox can
 * actually execute. Some playgrounds are reference-only — e.g. the system
 * prompt falls back to a README.md (or plain source in a non-Node language)
 * when the technology can't run in Node at all — and spawning
 * `npm install && npx tsx README.md` on those just opens a terminal that
 * immediately errors out with nothing useful to show for it.
 */
export function isRunnableEntry(entry: string): boolean {
    const ext = entry.split(".").pop()?.toLowerCase();
    return !!ext && RUNNABLE_EXTENSIONS.has(ext);
}
