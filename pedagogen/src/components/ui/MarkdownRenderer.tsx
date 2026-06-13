'use client';

import { useMemo, useEffect } from 'react';
import { markdownToHtml } from '@/lib/utils/markdownToHtml';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => {
    try {
      return markdownToHtml(content);
    } catch {
      return `<p>${content}</p>`;
    }
  }, [content]);

  useEffect(() => {
    const handleCopy = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('copy-btn')) {
        const codeId = target.getAttribute('data-target');
        if (codeId) {
          const codeEl = document.getElementById(codeId);
          if (codeEl) {
            await navigator.clipboard.writeText(codeEl.innerText);
            const oldText = target.innerText;
            target.innerText = '✅';
            setTimeout(() => {
              target.innerText = oldText;
            }, 2000);
          }
        }
      } else if (target.classList.contains('inline-code')) {
        await navigator.clipboard.writeText(target.innerText);
        target.classList.add('copied');
        setTimeout(() => {
          target.classList.remove('copied');
        }, 1500);
      }
    };

    document.addEventListener('click', handleCopy);
    return () => document.removeEventListener('click', handleCopy);
  }, [html]);

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
