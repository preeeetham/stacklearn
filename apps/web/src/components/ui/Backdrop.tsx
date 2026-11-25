import React from "react";

/** Fixed, decorative page background: Aceternity-style grid, faded at the edges. */
export const Backdrop: React.FC = () => (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade" />
    </div>
);
