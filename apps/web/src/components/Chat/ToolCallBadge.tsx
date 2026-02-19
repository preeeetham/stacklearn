import React from "react";
import type { ToolCallInfo } from "../../types";

interface ToolCallBadgeProps {
    toolCall: ToolCallInfo;
}

export const ToolCallBadge: React.FC<ToolCallBadgeProps> = ({ toolCall }) => {
    const isLoading = toolCall.status === "loading";

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-light text-xs animate-fade-in my-1">
            {isLoading ? (
                <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-glow-cyan/30 border-t-glow-cyan rounded-full animate-spin" />
                    <span className="text-glow-cyan font-medium">
                        Researching
                    </span>
                </div>
            ) : (
                <span className="text-accent-400">✓</span>
            )}

            {toolCall.url && (
                <span className="text-surface-300 truncate max-w-[280px]" title={toolCall.url}>
                    {toolCall.reason || new URL(toolCall.url).hostname}
                </span>
            )}
        </div>
    );
};
