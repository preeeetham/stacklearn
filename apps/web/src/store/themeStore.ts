import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "stacklearn-theme";

const getInitialTheme = (): Theme => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "dark" || stored === "light") return stored;
    } catch {
        // ignore
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
        return "light";
    }
    return "dark";
};

const applyTheme = (theme: Theme) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
};

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: initialTheme,

    setTheme: (theme) => {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // ignore
        }
        applyTheme(theme);
        set({ theme });
    },

    toggleTheme: () => {
        get().setTheme(get().theme === "dark" ? "light" : "dark");
    },
}));
