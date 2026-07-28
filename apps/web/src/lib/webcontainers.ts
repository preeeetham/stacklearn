import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import type { PlaygroundConfig } from "../types";

let instance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Boot a WebContainer instance (singleton).
 */
export async function bootWebContainer(): Promise<WebContainer> {
    if (instance) return instance;
    if (bootPromise) return bootPromise;

    bootPromise = WebContainer.boot();
    instance = await bootPromise;
    return instance;
}

/**
 * Convert flat file paths to WebContainer file tree format.
 */
function buildFileTree(
    files: Record<string, string>
): Record<string, { file: { contents: string } } | { directory: Record<string, unknown> }> {
    const tree: Record<string, unknown> = {};

    for (const [path, contents] of Object.entries(files)) {
        const parts = path.split("/");
        let current = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                // File
                current[part] = { file: { contents } };
            } else {
                // Directory
                if (!current[part]) {
                    current[part] = { directory: {} };
                }
                current = (current[part] as { directory: Record<string, unknown> }).directory;
            }
        }
    }

    return tree as Record<
        string,
        { file: { contents: string } } | { directory: Record<string, unknown> }
    >;
}

/**
 * Mount project files into the WebContainer.
 */
export async function mountProject(
    wc: WebContainer,
    config: PlaygroundConfig
): Promise<void> {
    const tree = buildFileTree(config.files);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wc.mount(tree as any);
}

/**
 * Register a one-time listener for server-ready events. Call this once after
 * boot (not per run) so listeners don't stack up across re-runs.
 */
export function onServerReady(
    wc: WebContainer,
    handler: (port: number, url: string) => void
): void {
    wc.on("server-ready", (port, url) => handler(port, url));
}

/**
 * Register a listener for port open/close events. Unlike `server-ready`, this
 * fires for every port the sandbox forwards (and again when they close), so we
 * can keep an accurate list of live ports for the preview's port switcher.
 * Call once after boot.
 */
export function onPort(
    wc: WebContainer,
    handler: (port: number, type: "open" | "close", url: string) => void
): void {
    wc.on("port", (port, type, url) => handler(port, type, url));
}

/**
 * Result of running a project — includes both the install and start processes
 * so the caller can read/write to stdin and kill the process.
 */
export interface RunProjectResult {
    startProcess: WebContainerProcess;
}

/**
 * Run the project: install dependencies, then execute the start command.
 * Returns the start process so the caller can write to its stdin or kill it.
 * Pass `skipInstall` when the mounted files' dependencies haven't changed
 * since the last run (see `mountFilesIncremental` below) — re-running
 * `npm install` on every follow-up question is the single biggest
 * contributor to perceived latency when nothing dependency-related changed.
 */
export async function runProject(
    wc: WebContainer,
    config: PlaygroundConfig,
    onOutput: (data: string) => void,
    options: { skipInstall?: boolean } = {}
): Promise<RunProjectResult> {
    if (!options.skipInstall) {
        onOutput("$ " + config.installCommand + "\n");
        const installParts = config.installCommand.split(" ");
        const installProcess = await wc.spawn(installParts[0], installParts.slice(1));
        installProcess.output.pipeTo(new WritableStream({ write: onOutput }));
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
            onOutput(`\n❌ Install failed with exit code ${installExitCode}\n`);
            throw new Error(`Install failed with exit code ${installExitCode}`);
        }
        onOutput("\n✅ Dependencies installed\n\n");
    }

    // Run start command
    onOutput("$ " + config.startCommand + "\n");
    const startParts = config.startCommand.split(" ");
    const startProcess = await wc.spawn(startParts[0], startParts.slice(1));
    startProcess.output.pipeTo(new WritableStream({ write: onOutput }));

    return { startProcess };
}

/**
 * Diff two flat file maps: which paths changed content (or are new), and
 * which existing paths were dropped from `next` entirely.
 */
export function diffFiles(
    prev: Record<string, string>,
    next: Record<string, string>
): { changed: Record<string, string>; removed: string[] } {
    const changed: Record<string, string> = {};
    for (const [path, contents] of Object.entries(next)) {
        if (prev[path] !== contents) changed[path] = contents;
    }
    const removed = Object.keys(prev).filter((path) => !(path in next));
    return { changed, removed };
}

/**
 * Apply a file diff directly to disk — writes changed/new files and removes
 * dropped ones — instead of remounting the entire tree. Used for follow-up
 * playground updates where most files are byte-identical to the last run.
 */
export async function applyFileDiff(
    wc: WebContainer,
    changed: Record<string, string>,
    removed: string[]
): Promise<void> {
    for (const [path, contents] of Object.entries(changed)) {
        await writeFile(wc, path, contents);
    }
    for (const path of removed) {
        try {
            await wc.fs.rm(path);
        } catch {
            // Already gone, or was a directory — not worth failing the run over.
        }
    }
}

/**
 * Spawn a persistent interactive shell (`jsh`) so the terminal has something
 * to talk to even when no project process is running. Call once per
 * WebContainer instance — its output is piped into the same terminal stream
 * as install/start commands.
 */
export async function spawnShell(
    wc: WebContainer,
    onOutput: (data: string) => void
): Promise<WebContainerProcess> {
    const shellProcess = await wc.spawn("jsh", {
        terminal: { cols: 80, rows: 24 },
    });
    shellProcess.output.pipeTo(new WritableStream({ write: onOutput }));
    return shellProcess;
}

/**
 * Write data to a running process's stdin (e.g. user keystrokes from the terminal).
 */
export async function writeToProcessInput(
    process: WebContainerProcess,
    data: string
): Promise<void> {
    const writer = process.input.getWriter();
    await writer.write(data);
    writer.releaseLock();
}

/**
 * Write a single file to the WebContainer.
 */
export async function writeFile(
    wc: WebContainer,
    path: string,
    contents: string
): Promise<void> {
    await wc.fs.writeFile(path, contents);
}

/**
 * Tear down the WebContainer instance.
 */
export async function teardownWebContainer(): Promise<void> {
    if (instance) {
        instance.teardown();
        instance = null;
        bootPromise = null;
    }
}
