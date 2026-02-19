import { WebContainer } from "@webcontainer/api";
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
 * Run the project: install dependencies, then execute the start command.
 */
export async function runProject(
    wc: WebContainer,
    config: PlaygroundConfig,
    onOutput: (data: string) => void,
    onServerReady?: (port: number, url: string) => void
): Promise<void> {
    // Listen for server-ready events
    if (onServerReady) {
        wc.on("server-ready", (port, url) => {
            onServerReady(port, url);
        });
    }

    // Install dependencies
    onOutput("$ " + config.installCommand + "\\n");
    const installParts = config.installCommand.split(" ");
    const installProcess = await wc.spawn(installParts[0], installParts.slice(1));
    installProcess.output.pipeTo(
        new WritableStream({ write: onOutput })
    );
    const installExitCode = await installProcess.exit;
    if (installExitCode !== 0) {
        onOutput(`\\n❌ Install failed with exit code ${installExitCode}\\n`);
        return;
    }
    onOutput("\\n✅ Dependencies installed\\n\\n");

    // Run start command
    onOutput("$ " + config.startCommand + "\\n");
    const startParts = config.startCommand.split(" ");
    const startProcess = await wc.spawn(startParts[0], startParts.slice(1));
    startProcess.output.pipeTo(
        new WritableStream({ write: onOutput })
    );
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
