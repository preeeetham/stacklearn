import { useEffect, useCallback, useRef } from "react";
import { usePlaygroundStore } from "../store/playgroundStore";
import {
    bootWebContainer,
    mountProject,
    runProject,
    writeFile,
    teardownWebContainer,
} from "../lib/webcontainers";
import type { WebContainer } from "@webcontainer/api";

export function usePlayground() {
    const {
        config,
        files,
        activeFile,
        isRunning,
        isInstalling,
        terminalOutput,
        previewUrl,
        isBooted,
        setRunning,
        setInstalling,
        addTerminalOutput,
        clearTerminalOutput,
        setPreviewUrl,
        setBooted,
        updateFile,
        setActiveFile,
        reset,
    } = usePlaygroundStore();

    const wcRef = useRef<WebContainer | null>(null);

    // Boot WebContainer on mount
    useEffect(() => {
        let cancelled = false;

        async function boot() {
            try {
                const wc = await bootWebContainer();
                if (!cancelled) {
                    wcRef.current = wc;
                    setBooted(true);
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
                clearTerminalOutput();
                setInstalling(true);
                setRunning(false);
                setPreviewUrl(null);

                await mountProject(wc, config!);

                if (cancelled) return;

                setInstalling(false);
                setRunning(true);

                await runProject(
                    wc,
                    config!,
                    (data) => {
                        if (!cancelled) addTerminalOutput(data);
                    },
                    (port, url) => {
                        if (!cancelled) setPreviewUrl(url);
                    }
                );
            } catch (err) {
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

    // Re-run the project
    const handleRun = useCallback(async () => {
        if (!config || !wcRef.current) return;

        clearTerminalOutput();
        setRunning(true);
        setInstalling(true);
        setPreviewUrl(null);

        try {
            // Re-mount current files
            const currentFiles = usePlaygroundStore.getState().files;
            await mountProject(wcRef.current, { ...config, files: currentFiles });

            setInstalling(false);

            await runProject(
                wcRef.current,
                config,
                (data) => addTerminalOutput(data),
                (port, url) => setPreviewUrl(url)
            );
        } catch (err) {
            addTerminalOutput(
                `\n❌ Error: ${err instanceof Error ? err.message : "Unknown error"}\n`
            );
            setInstalling(false);
            setRunning(false);
        }
    }, [config, clearTerminalOutput, setRunning, setInstalling, setPreviewUrl, addTerminalOutput]);

    // Reset to original config
    const handleReset = useCallback(async () => {
        if (!config || !wcRef.current) return;
        reset();
        clearTerminalOutput();
        setRunning(true);
        setInstalling(true);
        setPreviewUrl(null);

        try {
            await mountProject(wcRef.current, config);
            setInstalling(false);

            await runProject(
                wcRef.current,
                config,
                (data) => addTerminalOutput(data),
                (port, url) => setPreviewUrl(url)
            );
        } catch (err) {
            addTerminalOutput(
                `\n❌ Error: ${err instanceof Error ? err.message : "Unknown error"}\n`
            );
            setInstalling(false);
            setRunning(false);
        }
    }, [config, reset, clearTerminalOutput, setRunning, setInstalling, setPreviewUrl, addTerminalOutput]);

    return {
        config,
        files,
        activeFile,
        isRunning,
        isInstalling,
        terminalOutput,
        previewUrl,
        isBooted,
        setActiveFile,
        handleFileChange,
        handleRun,
        handleReset,
    };
}
