// src/components/LatexRenderer.jsx
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMathDelimiters } from '../utils/mathDelimiters';
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

const REMARK_PLUGINS = [remarkMath];
// throwOnError:false → KaTeX renders an invalid expression in the danger color
// instead of throwing; the boundary above catches anything that still escapes.
const KATEX = [rehypeKatex, { throwOnError: false, errorColor: 'var(--accent-danger)' }];

// `node` is taken out so it never reaches the DOM as an attribute.
// eslint-disable-next-line no-unused-vars
const BlockP = ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />;
// Inline mode: paragraphs become spans so the text flows inside a sentence,
// a <strong> or a struck-through answer without breaking the line.
// eslint-disable-next-line no-unused-vars
const InlineP = ({ node, ...props }) => <span {...props} />;

/**
 * Renders markdown + LaTeX as ONE flowing piece of text.
 *
 * - default: a block (`div.math-text`). Inline `$…$` sits on the text baseline
 *   inside its paragraph; a display formula (`$$…$$`) that is wider than the
 *   card scrolls on its own, so the surrounding text never gets a scrollbar.
 * - `inline`: a `span`, for an answer or value that sits inside a sentence.
 * - `compact`: kept for the formula-card variable rows; same as default.
 * - `rehypePlugins` / `components`: extra hast passes run after KaTeX (used by
 *   SmartText to add glossary tooltips to the plain text). Pass stable
 *   references; they take part in the memo comparison.
 */
const LatexRenderer = ({ content, className = "", compact = false, inline = false, rehypePlugins, components }) => {
    if (content === null || content === undefined || content === '') return null;

    const Tag = inline ? 'span' : 'div';
    const base = inline ? 'math-text math-text-inline' : 'math-text';
    return (
        <Tag className={`${base}${compact ? ' math-text-compact' : ''} ${className}`.trim()}>
            <LatexErrorBoundary content={content}>
                <ReactMarkdown
                    remarkPlugins={REMARK_PLUGINS}
                    rehypePlugins={rehypePlugins ? [KATEX, ...rehypePlugins] : [KATEX]}
                    components={{ p: inline ? InlineP : BlockP, ...components }}
                >
                    {normalizeMathDelimiters(content)}
                </ReactMarkdown>
            </LatexErrorBoundary>
        </Tag>
    );
};

// Memoized to keep heavy LaTeX re-renders out of unrelated state changes. Every
// prop that changes the output must be compared: the comparator once ignored
// className, and then `compact`, so changing either silently did nothing.
export default memo(
    LatexRenderer,
    (prevProps, nextProps) =>
        prevProps.content === nextProps.content
        && prevProps.className === nextProps.className
        && prevProps.compact === nextProps.compact
        && prevProps.inline === nextProps.inline
        && prevProps.rehypePlugins === nextProps.rehypePlugins
        && prevProps.components === nextProps.components,
);
