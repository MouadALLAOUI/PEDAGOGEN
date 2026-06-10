'use client';

import { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch {
      return `<p>${content}</p>`;
    }
  }, [content]);

  return (
    <div
      className={`prose prose-sm max-w-none
        prose-headings:font-display prose-headings:text-navy
        prose-h1:text-xl prose-h1:font-bold prose-h1:mb-4
        prose-h2:text-lg prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-6
        prose-h3:text-base prose-h3:font-semibold prose-h3:mb-2 prose-h3:mt-4
        prose-p:text-navy prose-p:leading-relaxed prose-p:mb-3
        prose-li:text-navy prose-li:mb-1
        prose-strong:text-navy prose-strong:font-semibold
        prose-table:text-sm
        prose-th:bg-navy-light/5 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-navy
        prose-td:px-3 prose-td:py-2 prose-td:border-border prose-td:border
        prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden
        prose-blockquote:border-l-teal prose-blockquote:bg-teal/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
        prose-code:bg-navy-light/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-pre:bg-navy prose-pre:text-parchment
        prose-a:text-teal prose-a:no-underline hover:prose-a:underline
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
