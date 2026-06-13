/* eslint-disable no-useless-escape */

function applyRegex(text: string, regex: RegExp, replacement: string | ((substring: string, ...args: any[]) => string)): string {
  // @ts-ignore
  return text.replace(regex, replacement);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseInline(html: string): string {
  html = applyRegex(html, /\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = applyRegex(html, /__(.*?)__/gim, "<strong>$1</strong>");
  html = applyRegex(html, /\*(.*?)\*/gim, "<em>$1</em>");
  html = applyRegex(html, /_(.*?)_/gim, "<em>$1</em>");
  html = applyRegex(html, /~~(.*?)~~/gim, "<del>$1</del>");

  html = applyRegex(html, /!\[(.*?)\]\((.*?)\)/gim, (_match, alt, src) => {
    let finalAlt = (alt as string).trim();
    if (!finalAlt) {
      finalAlt = 'Illustration';
    }
    return `<img src="${src}" alt="${finalAlt}" loading="lazy" class="max-w-full h-auto rounded border border-[var(--md-border)] shadow-sm mx-auto my-4 block">`;
  });

  html = applyRegex(html, /\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--md-accent)] hover:text-[var(--md-accent-hover)] underline transition-colors">$1</a>');

  html = applyRegex(html, /`(.*?)`/gim, (_, code) => {
    const codeId = "code-" + Math.random().toString(36).slice(2, 11);
    return `<code class="inline-code px-1.5 py-0.5 rounded font-mono text-sm bg-[var(--md-inline-bg)] data-target="${codeId}">${escapeHtml(code)}</code>`;
  });

  return html;
}

function renderTOC(toc: Array<{ level: number; text: string; id: string }>): string {
  if (toc.length === 0) return "";
  let html = '<nav class="toc mb-6 p-4 rounded-lg border border-[var(--md-border)] bg-[var(--md-inline-bg)]/10"><h2 id="toc" class="font-serif tracking-wide text-[var(--md-heading)] text-lg mb-3">Table of Contents</h2><ul class="list-none pl-0 mb-0">';
  toc.forEach(item => {
    const indent = item.level > 2 ? 'pl-4' : 'pl-0';
    html += `<li class="${indent} mb-1 text-sm"><a href="#${item.id}" class="text-[var(--md-accent)] hover:text-[var(--md-accent-hover)] hover:underline transition-colors">${item.text}</a></li>`;
  });
  html += "</ul></nav>";
  return html;
}

export function markdownToHtml(markdown: string): string {
  const toc: Array<{ level: number; text: string; id: string }> = [];
  const lines = markdown.split('\n');
  const outputLines: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let inList = false;
  let listType = '';
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let inTable = false;
  let tableHeader = true;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const content = currentParagraphLines.join('\n');
      outputLines.push(`<p class="mb-4 text-[var(--md-text)] leading-relaxed text-justify">${parseInline(content)}</p>`);
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (inList) {
      outputLines.push(`</${listType}>`);
      inList = false;
      listType = '';
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      const content = blockquoteLines.join('\n');
      outputLines.push(`<blockquote class="border-l-4 border-[var(--md-accent)] pl-4 italic my-4 text-[var(--md-muted)] bg-[var(--md-blockquote-bg)] py-2 pr-2 rounded-r">${parseInline(content).replace(/\n/g, '<br>')}</blockquote>`);
      inBlockquote = false;
      blockquoteLines = [];
    }
  };

  const flushTable = () => {
    if (inTable) {
      outputLines.push('</tbody></table>');
      inTable = false;
      tableHeader = true;
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushBlockquote();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // 1. Code Block boundary markers
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Exiting code block
        const escapedCode = escapeHtml(codeBlockLines.join('\n'));
        const codeId = "code-" + Math.random().toString(36).slice(2, 11);
        const languageClass = codeBlockLang ? `language-${codeBlockLang}` : '';
        const blockHtml = `
<div class="code-block-wrapper border border-[var(--md-border)] rounded-lg overflow-hidden bg-[var(--md-code-bg)] my-4 shadow-md transition-all duration-300">
  <div class="code-block-header flex items-center justify-between px-4 py-2 bg-[var(--md-code-header)] text-[var(--md-muted)] border-b border-[var(--md-border)] font-mono text-xs select-none">
    <span class="code-lang uppercase tracking-wider font-semibold text-[var(--md-accent)]">${codeBlockLang || 'code'}</span>
  </div>
  <div class="relative group">
    <pre class="code-block-container p-4 text-sm leading-relaxed font-mono text-[var(--md-code-text)] whitespace-pre-wrap break-words overflow-hidden"><code id="${codeId}" class="${languageClass}">${escapedCode}</code></pre>
    <button class="copy-btn absolute top-3 left-3 p-1.5 rounded bg-[var(--md-btn-bg)] text-[var(--md-btn-text)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--md-btn-hover)] transition-all duration-200 shadow-sm" data-target="${codeId}" title="Copy code">📋</button>
  </div>
</div>
        `;
        outputLines.push(blockHtml.trim());
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockLines = [];
      } else {
        // Entering code block
        flushAll();
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    // 2. While inside a code block, grab raw text verbatim
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 3. Headings with `#`
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1]!.length;
      const headingText = headingMatch[2]!.trim();
      const id = slugify(headingText);
      toc.push({ level, text: headingText, id });
      outputLines.push(`<h${level} id="${id}" class="font-serif tracking-wide text-[var(--md-heading)] transition-colors mt-6 mb-3">${parseInline(headingText)}</h${level}>`);
      continue;
    }

    // 4. Horizontal Rules
    if (/^[\-\*_]{3,}\s*$/.test(trimmed)) {
      flushAll();
      outputLines.push('<hr class="border-t border-[var(--md-border)] my-6 opacity-40">');
      continue;
    }

    // 5. Table Rows starting with |
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim());
      if (trimmed.startsWith('|')) cells.shift();
      if (trimmed.endsWith('|')) cells.pop();
      const isDivider = cells.length > 0 && cells.every(cell => /^[\-:\s]+$/.test(cell));
      if (isDivider) {
        continue;
      }

      if (!inTable) {
        flushParagraph();
        flushList();
        flushBlockquote();
        inTable = true;
        tableHeader = true;
        outputLines.push('<table>');
      }

      if (tableHeader) {
        tableHeader = false;
        const ths = cells.map(c => `<th>${parseInline(c)}</th>`).join('');
        outputLines.push(`<thead><tr>${ths}</tr></thead><tbody>`);
      } else {
        const tds = cells.map(c => `<td>${parseInline(c)}</td>`).join('');
        outputLines.push(`<tr>${tds}</tr>`);
      }
      continue;
    }

    // 6. Lists (unordered * | - | + and ordered digits)
    const unorderedMatch = trimmed.match(/^[\*\-\+]\s+(.*)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (unorderedMatch || orderedMatch) {
      const listContent = unorderedMatch ? unorderedMatch[1]!.trim() : (orderedMatch ? orderedMatch[1]!.trim() : '');
      const currentListType = unorderedMatch ? 'ul' : 'ol';

      if (!inList) {
        flushParagraph();
        flushBlockquote();
        flushTable();
        inList = true;
        listType = currentListType;
        const listClass = listType === 'ul' ? 'list-disc pl-6 mb-4 text-[var(--md-text)]' : 'list-decimal pl-6 mb-4 text-[var(--md-text)]';
        outputLines.push(`<${listType} class="${listClass}">`);
      } else if (listType !== currentListType) {
        outputLines.push(`</${listType}>`);
        listType = currentListType;
        const listClass = listType === 'ul' ? 'list-disc pl-6 mb-4 text-[var(--md-text)]' : 'list-decimal pl-6 mb-4 text-[var(--md-text)]';
        outputLines.push(`<${listType} class="${listClass}">`);
      }

      outputLines.push(`<li class="mb-1 text-justify">${parseInline(listContent)}</li>`);
      continue;
    }

    // 7. Blockquotes
    if (trimmed.startsWith('>')) {
      const content = trimmed.substring(trimmed.startsWith('> ') ? 2 : 1).trim();
      if (!inBlockquote) {
        flushParagraph();
        flushList();
        flushTable();
        inBlockquote = true;
      }
      blockquoteLines.push(content);
      continue;
    }

    // 8. Empty Lines serve to split blocks
    if (trimmed === '') {
      flushAll();
      continue;
    }

    // 9. Regular text lines are accumulated into paragraphs
    flushList();
    flushBlockquote();
    flushTable();
    currentParagraphLines.push(trimmed);
  }

  // End of file cleanup
  flushAll();

  const renderedContent = outputLines.join('\n');
  return renderTOC(toc) + renderedContent;
}
