import React, { useEffect, useState } from "react";

/** Cycles through words with a blur-in transition (Aceternity "Flip Words"). */
export const FlipWords: React.FC<{ words: string[]; interval?: number; className?: string }> = ({
    words,
    interval = 2600,
    className = "",
}) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
        return () => clearInterval(id);
    }, [words.length, interval]);

    return (
        <span key={index} className={`inline-block animate-word-in ${className}`}>
            {words[index]}
        </span>
    );
};
