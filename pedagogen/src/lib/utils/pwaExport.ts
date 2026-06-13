import type { CourseMetadata, GeneratedFile } from '@/types/generation';

export function generateStandaloneHtml(params: {
  title: string;
  metadata: CourseMetadata;
  files: GeneratedFile[];
  markdown?: string;
}): string {
  const { title, metadata, markdown } = params;

  const metaTags = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Cours généré par PEDAGOGEN - ${metadata.matiere} ${metadata.niveau}">
    <title>${escapeHtml(title)} - PEDAGOGEN</title>
  `;

  const style = `
    <style>
      :root {
        --navy: #1C1917; --teal: #059669; --parchment: #FAFAF8;
        --border: #E7E5E4; --muted: #78716C;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Inter', -apple-system, sans-serif;
        background: var(--parchment); color: var(--navy);
        line-height: 1.7; padding: 2rem 1rem;
      }
      .container { max-width: 840px; margin: 0 auto; }
      h1 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.8rem; font-weight: 700;
        border-bottom: 2px solid var(--teal);
        padding-bottom: 0.5rem; margin-bottom: 1.5rem;
      }
      h2 { font-size: 1.3rem; margin-top: 2rem; color: var(--teal); }
      h3 { font-size: 1.1rem; margin-top: 1.5rem; }
      .meta {
        background: white; border: 1px solid var(--border);
        border-radius: 12px; padding: 1rem 1.5rem;
        margin-bottom: 2rem; font-size: 0.9rem; color: var(--muted);
      }
      .meta strong { color: var(--navy); }
      .meta-grid { display: flex; flex-wrap: wrap; gap: 1rem 2rem; }
      p { margin: 1rem 0; }
      ul, ol { padding-left: 1.5rem; margin: 1rem 0; }
      li { margin-bottom: 0.3rem; }
      table {
        border-collapse: collapse; width: 100%; margin: 1.5rem 0;
        border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
      }
      th, td { padding: 0.75rem 1rem; border: 1px solid var(--border); text-align: left; }
      th { background: #ECFDF5; font-weight: 600; }
      blockquote {
        border-left: 3px solid var(--teal); padding-left: 1rem;
        margin: 1rem 0; color: var(--muted);
      }
      code {
        background: #F5F0E8; padding: 0.15rem 0.4rem;
        border-radius: 4px; font-size: 0.9em;
      }
      pre code {
        display: block; padding: 1rem; overflow-x: auto;
        background: #1C1917; color: #FAFAF8; border-radius: 8px;
        margin: 1rem 0;
      }
      .footer {
        margin-top: 3rem; padding-top: 1rem;
        border-top: 1px solid var(--border);
        font-size: 0.8rem; color: var(--muted); text-align: center;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
      @media (max-width: 640px) {
        h1 { font-size: 1.4rem; }
        .meta-grid { flex-direction: column; gap: 0.3rem; }
      }
    </style>
  `;

  const metaBlock = `
    <div class="meta">
      <div class="meta-grid">
        <span><strong>Niveau :</strong> ${escapeHtml(metadata.niveau)}</span>
        <span><strong>Matière :</strong> ${escapeHtml(metadata.matiere)}</span>
        <span><strong>Unité :</strong> ${escapeHtml(metadata.unite)}</span>
        <span><strong>Semestre :</strong> ${metadata.semestre}</span>
        <span><strong>Durée :</strong> ${metadata.duree} min</span>
        <span><strong>Langue :</strong> ${metadata.langue}</span>
      </div>
    </div>
  `;

  const content = markdown
    ? renderSimpleMarkdown(markdown)
    : '<p>Contenu généré par PEDAGOGEN.</p>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>${metaTags}${style}</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    ${metaBlock}
    <div class="content">${content}</div>
    <div class="footer no-print">
      Généré par <strong>PEDAGOGEN</strong> &mdash;
      Assistant Pédagogique IA &mdash; ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
  <script>
    document.querySelectorAll('pre code').forEach(function(block) {
      var btn = document.createElement('button');
      btn.textContent = 'Copier';
      btn.className = 'no-print';
      btn.style.cssText = 'float:right;font-size:11px;padding:2px 8px;margin-top:-0.5rem;background:#059669;color:white;border:none;border-radius:4px;cursor:pointer;';
      btn.onclick = function() {
        navigator.clipboard.writeText(block.textContent).then(function() {
          btn.textContent = 'Copié!';
          setTimeout(function() { btn.textContent = 'Copier'; }, 2000);
        });
      };
      block.parentNode.style.position = 'relative';
      block.parentNode.insertBefore(btn, block);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSimpleMarkdown(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (inList) { html += `</${listType}>`; inList = false; listType = null; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) { flushList(); html += '<p></p>'; continue; }

    const isHeader = trimmed.match(/^(#{1,6})\s(.+)/);
    if (isHeader) {
      flushList();
      const level = isHeader[1]!.length;
      html += `<h${level}>${escapeHtml(isHeader[2]!)}</h${level}>`;
      continue;
    }

    const isLi = trimmed.match(/^[-*+]\s(.+)/);
    const isNum = trimmed.match(/^\d+[.)]\s(.+)/);
    if (isLi || isNum) {
      const content = isLi ? isLi[1]! : isNum![1]!;
      if (!inList) { listType = isLi ? 'ul' : 'ol'; html += `<${listType}>`; inList = true; }
      html += `<li>${escapeHtml(content)}</li>`;
      continue;
    }

    flushList();

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('---') === false) {
      // table row - basic support
      if (trimmed.includes('---')) continue;
      const cells = trimmed.split('|').filter(Boolean).map(c => escapeHtml(c.trim()));
      const isHeaderRow = i + 1 < lines.length && lines[i + 1]!.includes('---');
      const tag = isHeaderRow ? 'th' : 'td';
      if (isHeaderRow || !html.includes('<table>')) {
        if (!isHeaderRow) html += '<table>';
        html += '<tr>';
      }
      html += cells.map(c => `<${tag}>${c}</${tag}>`).join('');
      html += '</tr>';
      if (isHeaderRow) { i++; html += '</thead><tbody>'; }
      continue;
    }

    html += `<p>${escapeHtml(trimmed)}</p>`;
  }

  flushList();
  return html;
}

export function downloadHtmlFile(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
