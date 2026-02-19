import React from "react";

interface PreviewPaneProps {
    url: string | null;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ url }) => {
    if (!url) return null;

    return (
        <div className="h-full flex flex-col" id="preview-pane">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 border-b border-surface-800/50">
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 px-2 py-0.5 rounded bg-surface-800/50 text-[11px] text-surface-500 font-mono truncate">
                    {url}
                </div>
            </div>
            <iframe
                src={url}
                title="Preview"
                className="flex-1 w-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
        </div>
    );
};
