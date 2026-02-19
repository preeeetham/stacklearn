import { create } from "zustand";
import type { PlaygroundConfig } from "../types";

interface PlaygroundState {
    config: PlaygroundConfig | null;
    files: Record<string, string>;
    activeFile: string;
    isRunning: boolean;
    isInstalling: boolean;
    terminalOutput: string[];
    previewUrl: string | null;
    isBooted: boolean;

    setConfig: (config: PlaygroundConfig) => void;
    setFiles: (files: Record<string, string>) => void;
    updateFile: (path: string, content: string) => void;
    setActiveFile: (path: string) => void;
    setRunning: (running: boolean) => void;
    setInstalling: (installing: boolean) => void;
    addTerminalOutput: (output: string) => void;
    clearTerminalOutput: () => void;
    setPreviewUrl: (url: string | null) => void;
    setBooted: (booted: boolean) => void;
    reset: () => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
    config: null,
    files: {},
    activeFile: "",
    isRunning: false,
    isInstalling: false,
    terminalOutput: [],
    previewUrl: null,
    isBooted: false,

    setConfig: (config) =>
        set({
            config,
            files: { ...config.files },
            activeFile: config.entry,
            terminalOutput: [],
            previewUrl: null,
            isRunning: false,
            isInstalling: false,
        }),

    setFiles: (files) => set({ files }),

    updateFile: (path, content) =>
        set((state) => ({
            files: { ...state.files, [path]: content },
        })),

    setActiveFile: (path) => set({ activeFile: path }),

    setRunning: (running) => set({ isRunning: running }),

    setInstalling: (installing) => set({ isInstalling: installing }),

    addTerminalOutput: (output) =>
        set((state) => ({
            terminalOutput: [...state.terminalOutput, output],
        })),

    clearTerminalOutput: () => set({ terminalOutput: [] }),

    setPreviewUrl: (url) => set({ previewUrl: url }),

    setBooted: (booted) => set({ isBooted: booted }),

    reset: () =>
        set((state) => {
            if (state.config) {
                return {
                    files: { ...state.config.files },
                    activeFile: state.config.entry,
                    terminalOutput: [],
                    previewUrl: null,
                    isRunning: false,
                    isInstalling: false,
                };
            }
            return {};
        }),
}));
