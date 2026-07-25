import React, { useState, useRef, useCallback } from "react";

interface PreviewPaneProps {
    url: string | null;
}

type ViewportSize = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
};

export const PreviewPane: React.FC<PreviewPaneProps> = ({ url }) => {
    const [viewport, setViewport] = useState<ViewportSize>("desktop");
    const [isLoading, setIsLoading] = useState(true);
    const [addressBarValue, setAddressBarValue] = useState(url || "");
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeSrc, setIframeSrc] = useState(url);

    // Sync address bar when url prop changes
    React.useEffect(() => {
        if (url) {
            setAddressBarValue(url);
            setIframeSrc(url);
            setIsLoading(true);
        }
    }, [url]);

    const handleRefresh = useCallback(() => {
        if (iframeSrc) {
            setIsLoading(true);
            // Cache-bust by appending a timestamp
            const separator = iframeSrc.includes("?") ? "&" : "?";
            const busted = `${iframeSrc.split("?")[0]}${separator}_t=${Date.now()}`;
            setIframeSrc(busted);
        }
    }, [iframeSrc]);

    const handleOpenNewTab = useCallback(() => {
        if (iframeSrc) {
            window.open(iframeSrc, "_blank");
        }
    }, [iframeSrc]);

    const handleAddressBarSubmit = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                setIframeSrc(addressBarValue);
                setIsLoading(true);
            }
        },
        [addressBarValue]
    );

    if (!url) return null;

    return (
        <div className="h-full flex flex-col bg-surface-950" id="preview-pane">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 border-b border-surface-800/40 flex-shrink-0">
                {/* Traffic lights */}
                <div className="flex gap-1 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        title="Refresh preview"
                        className="p-1 rounded hover:bg-surface-800/50 text-surface-500 hover:text-surface-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 1 0 .42 6.357.75.75 0 0 1 1.073 1.05A6 6 0 1 1 10.29 2.8l1.546 1.545V3.227a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {/* Open in new tab */}
                    <button
                        onClick={handleOpenNewTab}
                        title="Open in new tab"
                        className="p-1 rounded hover:bg-surface-800/50 text-surface-500 hover:text-surface-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                            <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                        </svg>
                    </button>
                </div>

                {/* Editable address bar */}
                <input
                    value={addressBarValue}
                    onChange={(e) => setAddressBarValue(e.target.value)}
                    onKeyDown={handleAddressBarSubmit}
                    className="flex-1 px-2 py-0.5 rounded bg-surface-800/50 text-[11px] text-surface-400 font-mono truncate outline-none focus:ring-1 focus:ring-brand-500/40 transition-all"
                    spellCheck={false}
                />

                {/* Responsive size toggles */}
                <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-surface-800/40 pl-2 ml-1">
                    {(["desktop", "tablet", "mobile"] as ViewportSize[]).map((size) => (
                        <button
                            key={size}
                            onClick={() => setViewport(size)}
                            title={`${size.charAt(0).toUpperCase() + size.slice(1)} view`}
                            className={`p-1 rounded transition-colors ${
                                viewport === size
                                    ? "text-brand-400 bg-brand-500/10"
                                    : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/50"
                            }`}
                        >
                            {size === "desktop" && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                    <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H8.75v1.5h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5V11H2.75a.75.75 0 0 1-.75-.75v-6.5Zm1.5.75v5h9v-5h-9Z" clipRule="evenodd" />
                                </svg>
                            )}
                            {size === "tablet" && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                    <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h7.5A2.25 2.25 0 0 1 14 4.25v7.5A2.25 2.25 0 0 1 11.75 14h-7.5A2.25 2.25 0 0 1 2 11.75v-7.5ZM3.5 4.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75v-7.5Z" clipRule="evenodd" />
                                </svg>
                            )}
                            {size === "mobile" && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                    <path d="M5 3.25A2.25 2.25 0 0 1 7.25 1h1.5A2.25 2.25 0 0 1 11 3.25v9.5A2.25 2.25 0 0 1 8.75 15h-1.5A2.25 2.25 0 0 1 5 12.75v-9.5ZM7.25 2.5a.75.75 0 0 0-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-9.5a.75.75 0 0 0-.75-.75h-1.5Z" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 flex justify-center bg-surface-800/30 overflow-auto relative">
                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-900/60 z-10">
                        <div className="flex items-center gap-2 text-xs text-surface-400">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading preview…
                        </div>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={iframeSrc || undefined}
                    title="Preview"
                    onLoad={() => setIsLoading(false)}
                    style={{ width: VIEWPORT_WIDTHS[viewport], maxWidth: "100%" }}
                    className="h-full bg-white transition-all duration-300"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </div>
    );
};
