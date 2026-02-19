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
                surface: {
                    50: "#f8fafc",
                    100: "#f1f5f9",
                    200: "#e2e8f0",
                    300: "#cbd5e1",
                    400: "#94a3b8",
                    500: "#64748b",
                    600: "#475569",
                    700: "#334155",
                    800: "#1e293b",
                    850: "#172033",
                    900: "#0f172a",
                    950: "#020617",
                },
                accent: {
                    50: "#f0fdf4",
                    100: "#dcfce7",
                    200: "#bbf7d0",
                    300: "#86efac",
                    400: "#4ade80",
                    500: "#22c55e",
                    600: "#16a34a",
                    700: "#15803d",
                },
                brand: {
                    50: "#eef2ff",
                    100: "#e0e7ff",
                    200: "#c7d2fe",
                    300: "#a5b4fc",
                    400: "#818cf8",
                    500: "#6366f1",
                    600: "#4f46e5",
                    700: "#4338ca",
                },
                glow: {
                    cyan: "#06b6d4",
                    purple: "#a855f7",
                    pink: "#ec4899",
                },
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-in-right": "slideInRight 0.3s ease-out",
                shimmer: "shimmer 2s linear infinite",
                glow: "glow 2s ease-in-out infinite alternate",
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
                    "0%": { boxShadow: "0 0 5px rgba(99, 102, 241, 0.2)" },
                    "100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" },
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
