import React from "react";

/** Fixed, decorative page background: a plain dot grid behind everything. */
export const Backdrop: React.FC = () => (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid" />
    </div>
);
