// src/components/LatexRenderer.jsx
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // CRITICAL: The stylesheet that makes the math render beautifully

// Fallback boundary: if KaTeX/markdown throws while rendering a malformed
// formula seed, show the raw source text instead of letting the error unmount
// the whole subtree — a single bad seed could otherwise blank an entire
// question (the pillar explicitly requires LaTeX to fall back cleanly).
class LatexErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidUpdate(prevProps) {
        // Reset when the content changes so a later good value re-renders.
        if (prevProps.content !== this.props.content && this.state.failed) {
            this.setState({ failed: false });
        }
    }
    render() {
        if (this.state.failed) {
            return <span className="whitespace-pre-wrap break-words">{this.props.content}</span>;
        }
        return this.props.children;
    }
}

const LatexRenderer = ({ content, className = "", compact = false }) => {
    if (!content) return null;

    // `compact`: skips math-scroll-mobile for short inline tokens (a variable
    // symbol, a unit in parentheses) sitting next to plain text in a
    // `flex items-baseline` row. That class sets `overflow: auto hidden` for
    // wide-formula scrolling, but a non-`visible` overflow forces an
    // inline-block's baseline to its BOTTOM MARGIN EDGE instead of its actual
    // text baseline (CSS Inline Layout) — combined with the class's own
    // 8px padding-bottom, short content rendered measurably 14px above the
    // row's baseline instead of sitting on it. Block-level math (a formula,
    // an explanation) has no adjacent baseline to misalign against and
    // legitimately needs the scroll wrapper, so this stays opt-in.
    return (
        <div className={`prose prose-invert max-w-none ${compact ? '' : 'math-scroll-mobile'} ${className}`}>
            <LatexErrorBoundary content={content}>
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    // throwOnError:false → KaTeX renders an invalid expression in the
                    // danger color instead of throwing; the boundary above catches
                    // anything that still escapes.
                    rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: 'var(--accent-danger)' }]]}
                    components={{
                        // Optional: Custom styling for standard paragraphs if needed
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </LatexErrorBoundary>
        </div>
    );
};

// CRITICAL FIX: Memoize the component to prevent heavy LaTeX re-renders during
// state changes. Compare className too — the old comparator ignored it, so a
// className change silently failed to re-render.
export default memo(
    LatexRenderer,
    (prevProps, nextProps) =>
        prevProps.content === nextProps.content && prevProps.className === nextProps.className,
);
