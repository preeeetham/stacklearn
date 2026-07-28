import { useEffect, useCallback, useRef } from "react";
import { usePlaygroundStore } from "../store/playgroundStore";
import { useToastStore } from "../store/toastStore";
import {
    bootWebContainer,
    mountProject,
    runProject,
    writeFile,
    teardownWebContainer,
    onServerReady,
    onPort,
    writeToProcessInput,
    spawnShell,
    diffFiles,
    applyFileDiff,
} from "../lib/webcontainers";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";

export function usePlayground() {
    const {
        config,
        files,
        activeFile,
        openTabs,
        isRunning,
        isInstalling,
        terminalOutput,
        previewUrl,
        ports,
        activePreviewPort,
        isBooted,
        setRunning,
        setInstalling,
        addTerminalOutput,
        clearTerminalOutput,
        addPort,
        removePort,
        clearPorts,
        setActivePreviewPort,
        setBooted,
        updateFile,
        setActiveFile,
        addTab,
        removeTab,
    } = usePlaygroundStore();

    const addToast = useToastStore((s) => s.addToast);

    const wcRef = useRef<WebContainer | null>(null);
    const processRef = useRef<WebContainerProcess | null>(null);
    // A persistent shell, independent of the project's install/start
    // process, so the terminal accepts input even when nothing is running.
    const shellProcessRef = useRef<WebContainerProcess | null>(null);
    // Snapshot of exactly what's currently on disk in the WebContainer (as of
    // the last successful mount/write), so a follow-up config can be diffed
    // against it instead of blindly remounting every file from scratch.
    const mountedFilesRef = useRef<Record<string, string> | null>(null);

    // Whichever process should currently receive terminal keystrokes: the
    // project's process while it's running, otherwise the persistent shell.
    const activeTerminalProcess = useCallback(
        () => processRef.current ?? shellProcessRef.current,
        []
    );

    // Watches a process for exit so the UI (Run/Stop button, isRunning state)
    // stays correct even when the process dies on its own — e.g. the learner
    // presses Ctrl+C in the terminal instead of clicking Stop.
    const watchProcessExit = useCallback(
        (proc: WebContainerProcess) => {
            proc.exit.then((code) => {
                // Only react if this is still the tracked process — if Stop
                // or a new Run already replaced/cleared it, do nothing.
                if (processRef.current !== proc) return;
                processRef.current = null;
                setRunning(false);
                addTerminalOutput(`\n⏹ Process exited (code ${code})\n`);
            });
        },
        [setRunning, addTerminalOutput]
    );

    // Boot WebContainer on mount
    useEffect(() => {
        let cancelled = false;

        async function boot() {
            try {
                const wc = await bootWebContainer();
                if (!cancelled) {
                    wcRef.current = wc;
                    // Register listeners once for the lifetime of the container so
                    // ports and preview URLs stay in sync across every run.
                    //
                    // `port` fires for each forwarded port opening/closing — this
                    // is what powers the preview's port switcher. `server-ready`
                    // fires when an HTTP server is actually listening, which is
                    // the moment we surface the preview to the learner (their code
                    // logs "localhost:3000", but only this sandbox URL is reachable).
                    onPort(wc, (port, type, url) => {
                        if (type === "open") addPort(port, url);
                        else removePort(port);
                    });
                    onServerReady(wc, (port, url) => {
                        addPort(port, url);
                        addToast(`Server ready on port ${port} — open the Preview tab`, "success");
                    });
                    setBooted(true);

                    // Spawn a persistent shell so the terminal is usable
                    // right away, before any project has been run.
                    try {
                        const shell = await spawnShell(wc, (data) => {
                            if (!cancelled) addTerminalOutput(data);
                        });
                        if (cancelled) {
                            shell.kill();
                        } else {
                            shellProcessRef.current = shell;
                        }
                    } catch (err) {
                        console.error("Failed to start shell:", err);
                    }
                }
            } catch (err) {
                console.error("Failed to boot WebContainer:", err);
            }
        }

        boot();

        return () => {
            cancelled = true;
        };
    }, [setBooted]);

    // When config changes, mount and run the project
    useEffect(() => {
        if (!config || !isBooted || !wcRef.current) return;

        let cancelled = false;

        async function init() {
            const wc = wcRef.current!;
            try {
                // Kill any process still running from a previous config —
                // otherwise its server keeps holding the port and the new run
                // fails with EADDRINUSE (e.g. asking a follow-up question that
                // spins up another server on the same port).
                if (processRef.current) {
                    processRef.current.kill();
                    processRef.current = null;
                }

                clearTerminalOutput();
                setRunning(false);
                clearPorts();

                const prevFiles = mountedFilesRef.current;
                const nextFiles = config!.files;
                // First mount ever: bulk-mount the whole tree. On every
                // follow-up, only write what actually changed — most of a
                // follow-up's files are byte-identical to the previous turn,
                // and a full remount + reinstall on every question is the
                // biggest contributor to perceived latency here.
                const isFirstMount = prevFiles === null;
                const depsChanged =
                    isFirstMount || prevFiles["package.json"] !== nextFiles["package.json"];

                if (depsChanged) setInstalling(true);

                if (isFirstMount) {
                    await mountProject(wc, config!);
                } else {
                    const { changed, removed } = diffFiles(prevFiles, nextFiles);
                    await applyFileDiff(wc, changed, removed);
                }
                mountedFilesRef.current = { ...nextFiles };

                if (cancelled) return;

                setInstalling(false);
                setRunning(true);

                const result = await runProject(
                    wc,
                    config!,
                    (data) => {
                        if (!cancelled) addTerminalOutput(data);
                    },
                    { skipInstall: !depsChanged }
                );

                // Always track the process so it can be killed later. If this
                // run was superseded while starting, kill it now rather than
                // orphaning it (an orphan would keep holding its port).
                processRef.current = result.startProcess;
                if (cancelled) {
                    result.startProcess.kill();
                    processRef.current = null;
                } else {
                    watchProcessExit(result.startProcess);
                }
            } catch (err) {
                // Disk state after a failed mount/install is uncertain — force
                // a full remount on the next attempt rather than trusting a
                // diff against what we assumed was written.
                mountedFilesRef.current = null;
                if (!cancelled) {
                    addTerminalOutput(
                        `\n❌ Error: ${err instanceof Error ? err.message : "Unknown error"}\n`
                    );
                    setInstalling(false);
                    setRunning(false);
                }
            }
        }

        init();

        return () => {
            cancelled = true;
        };
    }, [config, isBooted]);

    // Handle file edits
    const handleFileChange = useCallback(
        async (path: string, content: string) => {
            updateFile(path, content);
            if (wcRef.current) {
                await writeFile(wcRef.current, path, content);
            }
        },
        [updateFile]
    );

    // Write to the active process's stdin (terminal input) — the running
    // project process if there is one, otherwise the persistent shell, so
    // the terminal always accepts input.
    const handleTerminalInput = useCallback(
        (data: string) => {
            const target = activeTerminalProcess();
            if (target) {
                writeToProcessInput(target, data).catch(() => {
                    // Process may have exited — ignore
                });
            }
        },
        [activeTerminalProcess]
    );

    // Stop the running process
    const handleStop = useCallback(() => {
        if (processRef.current) {
            processRef.current.kill();
            processRef.current = null;
        }
        setRunning(false);
        addTerminalOutput("\n⏹ Process stopped\n");
    }, [setRunning, addTerminalOutput]);

    // Re-run the project
    const handleRun = useCallback(async () => {
        if (!config || !wcRef.current) return;

        // Kill existing process first
        if (processRef.current) {
            processRef.current.kill();
            processRef.current = null;
        }

        clearTerminalOutput();
        setRunning(true);
        setInstalling(true);
        clearPorts();

        try {
            // No remount needed: handleFileChange already writes every edit
            // straight to the WebContainer's disk as the user types, so
            // what's mounted is already exactly the current file state.
            const currentFiles = usePlaygroundStore.getState().files;
            mountedFilesRef.current = { ...currentFiles };

            setInstalling(false);

            const result = await runProject(wcRef.current, config, (data) => addTerminalOutput(data));
            processRef.current = result.startProcess;
            watchProcessExit(result.startProcess);
        } catch (err) {
            addTerminalOutput(
                `\n❌ Error: ${err instanceof Error ? err.message : "Unknown error"}\n`
            );
            setInstalling(false);
            setRunning(false);
        }
    }, [config, clearTerminalOutput, setRunning, setInstalling, clearPorts, addTerminalOutput, watchProcessExit]);

    // Save the active file to WebContainer (for Cmd+S shortcut)
    const handleSave = useCallback(async () => {
        if (!wcRef.current || !activeFile) return;
        const currentFiles = usePlaygroundStore.getState().files;
        const content = currentFiles[activeFile];
        if (content !== undefined) {
            await writeFile(wcRef.current, activeFile, content);
        }
    }, [activeFile]);

    return {
        config,
        files,
        activeFile,
        openTabs,
        isRunning,
        isInstalling,
        terminalOutput,
        previewUrl,
        ports,
        activePreviewPort,
        isBooted,
        setActiveFile,
        setActivePreviewPort,
        addTab,
        removeTab,
        handleFileChange,
        handleRun,
        handleStop,
        handleSave,
        handleTerminalInput,
    };
}
