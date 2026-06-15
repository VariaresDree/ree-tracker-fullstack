// src/components/LatexRenderer.jsx
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // CRITICAL: The stylesheet that makes the math render beautifully

const LatexRenderer = ({ content, className = "" }) => {
    if (!content) return null;

    return (
        <div className={`prose prose-invert max-w-none math-scroll-mobile ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Optional: Custom styling for standard paragraphs if needed
                    p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

// CRITICAL FIX: Memoize the component to prevent heavy LaTeX re-renders during state changes
export default memo(LatexRenderer, (prevProps, nextProps) => prevProps.content === nextProps.content);