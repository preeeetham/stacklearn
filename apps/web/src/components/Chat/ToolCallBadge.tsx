import React from "react";
import type { ToolCallInfo } from "../../types";

interface ToolCallBadgeProps {
    toolCall: ToolCallInfo;
}

function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export const ToolCallBadge: React.FC<ToolCallBadgeProps> = ({ toolCall }) => {
    const isLoading = toolCall.status === "loading";
    const host = toolCall.url ? hostnameOf(toolCall.url) : null;

    return (
        <div
            className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs animate-fade-in chip`}
        >
            {isLoading ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 text-surface-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 text-accent-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
            )}
            <span className={isLoading ? "text-shimmer font-medium" : "text-surface-400"}>
                {isLoading ? "Reading docs" : "Read"}
            </span>
            {toolCall.url && (
                <span className="truncate font-mono text-[11px] text-surface-300" title={toolCall.reason || toolCall.url}>
                    {host}
                </span>
            )}
        </div>
    );
};
