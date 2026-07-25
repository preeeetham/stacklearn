/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
                mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
            },
            colors: {
                // Every color resolves through a CSS variable (defined per-theme in index.css)
                // so toggling .dark/.light on <html> re-themes the whole app instantly.
                surface: {
                    50: "rgb(var(--color-surface-50) / <alpha-value>)",
                    100: "rgb(var(--color-surface-100) / <alpha-value>)",
                    200: "rgb(var(--color-surface-200) / <alpha-value>)",
                    300: "rgb(var(--color-surface-300) / <alpha-value>)",
                    400: "rgb(var(--color-surface-400) / <alpha-value>)",
                    500: "rgb(var(--color-surface-500) / <alpha-value>)",
                    600: "rgb(var(--color-surface-600) / <alpha-value>)",
                    700: "rgb(var(--color-surface-700) / <alpha-value>)",
                    800: "rgb(var(--color-surface-800) / <alpha-value>)",
                    850: "rgb(var(--color-surface-850) / <alpha-value>)",
                    900: "rgb(var(--color-surface-900) / <alpha-value>)",
                    950: "rgb(var(--color-surface-950) / <alpha-value>)",
                },
                // Primary interactive color — the violet end of the logo gradient
                brand: {
                    50: "rgb(var(--color-brand-50) / <alpha-value>)",
                    100: "rgb(var(--color-brand-100) / <alpha-value>)",
                    200: "rgb(var(--color-brand-200) / <alpha-value>)",
                    300: "rgb(var(--color-brand-300) / <alpha-value>)",
                    400: "rgb(var(--color-brand-400) / <alpha-value>)",
                    500: "rgb(var(--color-brand-500) / <alpha-value>)",
                    600: "rgb(var(--color-brand-600) / <alpha-value>)",
                    700: "rgb(var(--color-brand-700) / <alpha-value>)",
                },
                accent: {
                    50: "rgb(var(--color-accent-50) / <alpha-value>)",
                    100: "rgb(var(--color-accent-100) / <alpha-value>)",
                    200: "rgb(var(--color-accent-200) / <alpha-value>)",
                    300: "rgb(var(--color-accent-300) / <alpha-value>)",
                    400: "rgb(var(--color-accent-400) / <alpha-value>)",
                    500: "rgb(var(--color-accent-500) / <alpha-value>)",
                    600: "rgb(var(--color-accent-600) / <alpha-value>)",
                    700: "rgb(var(--color-accent-700) / <alpha-value>)",
                },
                // The full logo gradient, sampled directly from stacklearn.png — constant across themes
                flame: {
                    orange: "rgb(var(--color-flame-orange) / <alpha-value>)",
                    rose: "rgb(var(--color-flame-rose) / <alpha-value>)",
                    violet: "rgb(var(--color-flame-violet) / <alpha-value>)",
                },
                glow: {
                    cyan: "rgb(var(--color-glow-cyan) / <alpha-value>)",
                    purple: "rgb(var(--color-glow-purple) / <alpha-value>)",
                    pink: "rgb(var(--color-glow-pink) / <alpha-value>)",
                },
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-in-right": "slideInRight 0.3s ease-out",
                shimmer: "shimmer 2s linear infinite",
                glow: "glow 2s ease-in-out infinite alternate",
                float: "float 4s ease-in-out infinite",
                "float-slow": "float 6s ease-in-out infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideInRight: {
                    "0%": { opacity: "0", transform: "translateX(10px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                glow: {
                    "0%": { boxShadow: "0 0 5px rgba(122, 44, 253, 0.2)" },
                    "100%": { boxShadow: "0 0 20px rgba(122, 44, 253, 0.4)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-6px)" },
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                flame: "linear-gradient(90deg, #fb5b1f 0%, #e1427f 50%, #7a2cfd 100%)",
            },
            boxShadow: {
                float: "var(--shadow-float)",
                "float-lg": "var(--shadow-float-lg)",
                flame: "var(--shadow-flame)",
            },
        },
    },
    plugins: [],
};
