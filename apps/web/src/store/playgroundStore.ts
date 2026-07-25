import { create } from "zustand";
import type { PlaygroundConfig } from "../types";

/** A live port opened by the running process inside the WebContainer. */
export interface ForwardedPort {
    port: number;
    url: string;
}

interface PlaygroundState {
    config: PlaygroundConfig | null;
    files: Record<string, string>;
    activeFile: string;
    openTabs: string[];
    isRunning: boolean;
    isInstalling: boolean;
    terminalOutput: string[];
    previewUrl: string | null;
    /** All ports currently forwarded from the sandbox, e.g. 3000, 8080. */
    ports: ForwardedPort[];
    /** Which port's URL the preview pane is currently showing. */
    activePreviewPort: number | null;
    isBooted: boolean;

    setConfig: (config: PlaygroundConfig) => void;
    setFiles: (files: Record<string, string>) => void;
    updateFile: (path: string, content: string) => void;
    setActiveFile: (path: string) => void;
    addTab: (path: string) => void;
    removeTab: (path: string) => void;
    setOpenTabs: (tabs: string[]) => void;
    setRunning: (running: boolean) => void;
    setInstalling: (installing: boolean) => void;
    addTerminalOutput: (output: string) => void;
    clearTerminalOutput: () => void;
    setPreviewUrl: (url: string | null) => void;
    addPort: (port: number, url: string) => void;
    removePort: (port: number) => void;
    clearPorts: () => void;
    setActivePreviewPort: (port: number) => void;
    setBooted: (booted: boolean) => void;
    reset: () => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
    config: null,
    files: {},
    activeFile: "",
    openTabs: [],
    isRunning: false,
    isInstalling: false,
    terminalOutput: [],
    previewUrl: null,
    ports: [],
    activePreviewPort: null,
    isBooted: false,

    setConfig: (config) =>
        set({
            config,
            files: { ...config.files },
            activeFile: config.entry,
            openTabs: [config.entry],
            terminalOutput: [],
            previewUrl: null,
            ports: [],
            activePreviewPort: null,
            isRunning: false,
            isInstalling: false,
        }),

    setFiles: (files) => set({ files }),

    updateFile: (path, content) =>
        set((state) => ({
            files: { ...state.files, [path]: content },
        })),

    setActiveFile: (path) =>
        set((state) => {
            // Auto-add to openTabs if not already present
            const openTabs = state.openTabs.includes(path)
                ? state.openTabs
                : [...state.openTabs, path];
            return { activeFile: path, openTabs };
        }),

    addTab: (path) =>
        set((state) => {
            if (state.openTabs.includes(path)) return {};
            return { openTabs: [...state.openTabs, path] };
        }),

    removeTab: (path) =>
        set((state) => {
            const newTabs = state.openTabs.filter((t) => t !== path);
            if (newTabs.length === 0) return {}; // Don't close the last tab
            const updates: Partial<PlaygroundState> = { openTabs: newTabs };
            // If closing the active tab, activate the adjacent one
            if (state.activeFile === path) {
                const closedIdx = state.openTabs.indexOf(path);
                const newIdx = Math.min(closedIdx, newTabs.length - 1);
                updates.activeFile = newTabs[newIdx];
            }
            return updates;
        }),

    setOpenTabs: (tabs) => set({ openTabs: tabs }),

    setRunning: (running) => set({ isRunning: running }),

    setInstalling: (installing) => set({ isInstalling: installing }),

    addTerminalOutput: (output) =>
        set((state) => ({
            terminalOutput: [...state.terminalOutput, output],
        })),

    clearTerminalOutput: () => set({ terminalOutput: [] }),

    setPreviewUrl: (url) => set({ previewUrl: url }),

    addPort: (port, url) =>
        set((state) => {
            const existing = state.ports.filter((p) => p.port !== port);
            const ports = [...existing, { port, url }].sort((a, b) => a.port - b.port);
            return {
                ports,
                // First port to appear becomes the active preview + default URL.
                activePreviewPort: state.activePreviewPort ?? port,
                previewUrl: state.previewUrl ?? url,
            };
        }),

    removePort: (port) =>
        set((state) => {
            const ports = state.ports.filter((p) => p.port !== port);
            if (state.activePreviewPort !== port) return { ports };
            // The active port closed — fall back to another open port, or clear.
            const next = ports[0] ?? null;
            return {
                ports,
                activePreviewPort: next ? next.port : null,
                previewUrl: next ? next.url : null,
            };
        }),

    clearPorts: () => set({ ports: [], activePreviewPort: null, previewUrl: null }),

    setActivePreviewPort: (port) =>
        set((state) => {
            const match = state.ports.find((p) => p.port === port);
            if (!match) return {};
            return { activePreviewPort: port, previewUrl: match.url };
        }),

    setBooted: (booted) => set({ isBooted: booted }),

    reset: () =>
        set((state) => {
            if (state.config) {
                return {
                    files: { ...state.config.files },
                    activeFile: state.config.entry,
                    openTabs: [state.config.entry],
                    terminalOutput: [],
                    previewUrl: null,
                    ports: [],
                    activePreviewPort: null,
                    isRunning: false,
                    isInstalling: false,
                };
            }
            return {};
        }),
}));
