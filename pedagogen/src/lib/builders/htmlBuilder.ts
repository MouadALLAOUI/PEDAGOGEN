import type { CourseMetadata } from '@/types/generation';

interface EvaluationQuestion {
  numero: number;
  type: 'qcm' | 'vrai_faux' | 'ouvert' | 'appariement' | 'exercice';
  enonce: string;
  points: number;
  options?: string[];
  correction?: string;
}

interface EvaluationData {
  titre?: string;
  consigne?: string;
  questions?: EvaluationQuestion[];
  bareme?: { total_points?: number; criteres?: string[] };
  grille_evaluation?: string[];
}

function renderInteractiveJS(): string {
  return `
<script>
(function() {
  let totalScore = 0;
  let maxScore = 0;
  const scoreEl = document.getElementById('score-display');
  const maxScoreEl = document.getElementById('max-score');
  const results = document.getElementById('interactive-results');

  function updateScore() {
    if (scoreEl) scoreEl.textContent = totalScore;
    if (maxScoreEl) maxScoreEl.textContent = maxScore;
  }

  function showFinalScore() {
    if (!results) return;
    results.style.display = 'block';
    results.querySelector('.final-score-value').textContent = totalScore + ' / ' + maxScore;
    const pct = maxScore > 0 ? Math.round(totalScore / maxScore * 100) : 0;
    results.querySelector('.final-pct').textContent = pct + '%';
    const bar = results.querySelector('.score-bar-fill');
    if (bar) bar.style.width = pct + '%';
    const msg = results.querySelector('.final-msg');
    if (msg) {
      if (pct >= 80) msg.textContent = 'Tr\u00e8s bien !';
      else if (pct >= 60) msg.textContent = 'Bien, continuez vos efforts.';
      else if (pct >= 40) msg.textContent = 'Peut mieux faire, revoyez le cours.';
      else msg.textContent = '\u00c0 revoir, relisez attentivement la le\u00e7on.';
    }
  }

  window.handleSelect = function(qIndex, optIndex, isVraiFaux) {
    const q = document.querySelector('.question[data-index="' + qIndex + '"]');
    if (!q || q.dataset.answered === 'true') return;
    q.dataset.answered = 'true';
    const correction = q.dataset.correction || '';
    const points = parseFloat(q.dataset.points) || 0;
    maxScore += points;
    const opts = q.querySelectorAll('.option');
    let isCorrect = false;

    if (isVraiFaux) {
      const selectedText = opts[optIndex]?.textContent?.trim() || '';
      isCorrect = selectedText.toLowerCase() === correction.toLowerCase();
      opts.forEach(function(o) { o.classList.add('disabled'); });
      if (isCorrect) {
        opts[optIndex].classList.add('correct');
        totalScore += points;
      } else {
        opts[optIndex].classList.add('incorrect');
        opts.forEach(function(o) {
          if (o.textContent.trim().toLowerCase() === correction.toLowerCase()) o.classList.add('correct');
        });
      }
    } else {
      const selectedLetter = String.fromCharCode(65 + optIndex);
      isCorrect = selectedLetter === correction.toUpperCase();
      opts.forEach(function(o) { o.classList.add('disabled'); });
      if (isCorrect) {
        opts[optIndex].classList.add('correct');
        totalScore += points;
      } else {
        opts[optIndex].classList.add('incorrect');
        opts.forEach(function(o, i) {
          if (String.fromCharCode(65 + i) === correction.toUpperCase()) o.classList.add('correct');
        });
      }
    }

    updateScore();
    q.querySelectorAll('.option').forEach(function(o) {
      o.style.cursor = 'default';
    });
  };

  window.toggleCorrection = function(qIndex) {
    const el = document.querySelector('.correction-content[data-q="' + qIndex + '"]');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    const btn = document.querySelector('.show-correction[data-q="' + qIndex + '"]');
    if (btn) btn.textContent = el.style.display === 'block' ? 'Masquer la correction' : 'Voir la correction';
  };

  window.showAllScores = function() {
    showFinalScore();
    document.querySelectorAll('.question').forEach(function(q) {
      q.dataset.answered = 'true';
      var opts = q.querySelectorAll('.option');
      opts.forEach(function(o) { o.classList.add('disabled'); o.style.cursor = 'default'; });
    });
  };

  document.querySelectorAll('.question[data-type="qcm"], .question[data-type="vrai_faux"]').forEach(function(q) {
    maxScore += parseFloat(q.dataset.points) || 0;
  });
  updateScore();

  document.querySelectorAll('.show-correction').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var qIdx = btn.dataset.q;
      if (!qIdx) return;
      var q = document.querySelector('.question[data-index="' + qIdx + '"]');
      if (q && q.dataset.answered !== 'true') {
        q.dataset.answered = 'true';
        var pts = parseFloat(q.dataset.points) || 0;
        maxScore += pts;
        updateScore();
      }
      window.toggleCorrection(qIdx);
    });
  });
})();
</script>`;
}

function renderOptions(q: EvaluationQuestion, index: number): string {
  if (!q.options?.length) return '';

  if (q.type === 'vrai_faux') {
    return q.options.map((opt, i) => `
      <div class="option interactive" onclick="handleSelect(${index}, ${i}, true)">
        ${opt}
      </div>`).join('');
  }

  if (q.type === 'qcm') {
    return q.options.map((opt, i) => `
      <div class="option interactive" onclick="handleSelect(${index}, ${i}, false)">
        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
        <span class="option-text">${opt}</span>
      </div>`).join('');
  }

  return q.options.map((opt) => `<li class="option">${opt}</li>`).join('');
}

function renderQuestion(q: EvaluationQuestion, index: number): string {
  const typeLabels: Record<string, string> = {
    qcm: 'QCM',
    vrai_faux: 'Vrai / Faux',
    ouvert: 'Question ouverte',
    appariement: 'Appariement',
    exercice: 'Exercice',
  };

  const isInteractive = q.type === 'qcm' || q.type === 'vrai_faux';
  const optionsHtml = renderOptions(q, index);

  return `
    <div class="question" data-index="${index}" data-type="${q.type}" data-points="${q.points}" data-correction="${(q.correction || '').replace(/"/g, '&quot;')}" data-answered="false">
      <div class="question-header">
        <span class="question-number">Question ${q.numero}</span>
        <span class="question-type ${isInteractive ? 'interactive-badge' : ''}">${typeLabels[q.type] || q.type}</span>
        ${isInteractive ? '<span class="q-badge-interactive">Auto-corrigé</span>' : ''}
        <span class="question-points">${q.points} pt${q.points > 1 ? 's' : ''}</span>
      </div>
      <div class="question-body">
        <p class="question-text">${q.enonce}</p>
        ${optionsHtml ? `<div class="options">${optionsHtml}</div>` : ''}

        ${q.type === 'ouvert' ? `
        <textarea class="open-input" rows="3" placeholder="Écrivez votre réponse ici..."></textarea>
        <button class="show-correction" data-q="${index}">Voir la correction</button>
        <div class="correction-content" data-q="${index}" style="display:none">
          <div class="correction-inner">
            <strong>Correction :</strong>
            <p>${q.correction || 'Pas de correction fournie.'}</p>
          </div>
        </div>` : ''}

        ${isInteractive && q.correction ? `
        <div class="feedback" data-q="${index}"></div>` : ''}

        ${q.correction && !isInteractive && q.type !== 'ouvert' ? `
        <details class="correction">
          <summary>Corrigé</summary>
          <p>${q.correction}</p>
        </details>` : ''}
      </div>
    </div>`;
}

export function buildHtml(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string,
): string {
  const evalData = content as EvaluationData;

  const validQuestions = Array.isArray(evalData.questions)
    ? evalData.questions.filter((q): q is EvaluationQuestion => q && typeof q.numero === 'number' && typeof q.enonce === 'string' && q.enonce !== 'undefined')
    : [];

  const questionsHtml = validQuestions.length > 0
    ? validQuestions.map((q, i) => renderQuestion(q, i)).join('\n')
    : Object.entries(content)
        .filter(([key]) => !['titre', 'consigne', 'bareme', 'grille_evaluation'].includes(key))
        .map(([key, value]) => `
          <div class="question">
            <div class="question-header">
              <span class="question-number">${key.replace(/_/g, ' ')}</span>
            </div>
            <div class="question-body">
              <p class="question-text">${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>
            </div>
          </div>`)
        .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${evalData.titre || title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #f8f6f3;
      color: #0f172a;
      line-height: 1.6;
      padding: 2rem 1rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%);
      color: white;
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 2rem;
    }
    .header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
    .header .meta { font-size: 0.85rem; opacity: 0.8; line-height: 1.8; }
    .header .meta strong { opacity: 1; }
    .consigne {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0d9488;
      padding: 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      color: #334155;
    }
    .consigne strong { color: #0d9488; }
    .question {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 1rem;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .question:hover { box-shadow: 0 2px 12px rgba(13, 148, 136, 0.08); }
    .question-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    .question-number {
      font-weight: 600;
      font-size: 0.9rem;
      color: #0f172a;
    }
    .question-type {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.2rem 0.6rem;
      background: #0d9488;
      color: white;
      border-radius: 20px;
    }
    .interactive-badge { background: #2563eb; }
    .q-badge-interactive {
      font-size: 0.65rem;
      font-weight: 500;
      padding: 0.15rem 0.5rem;
      background: #dbeafe;
      color: #2563eb;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
    }
    .question-points {
      margin-left: auto;
      font-size: 0.8rem;
      font-weight: 500;
      color: #64748b;
    }
    .question-body { padding: 1.25rem; }
    .question-text { font-size: 0.95rem; margin-bottom: 0.75rem; color: #1e293b; }
    .options { display: flex; flex-direction: column; gap: 0.5rem; margin: 0.75rem 0; }
    .option {
      padding: 0.65rem 0.85rem;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 0.9rem;
      border: 1.5px solid #e2e8f0;
      transition: all 0.15s ease;
    }
    .option.interactive {
      cursor: pointer;
    }
    .option.interactive:hover { border-color: #0d9488; background: #f0fdfa; }
    .option.correct {
      border-color: #16a34a !important;
      background: #f0fdf4 !important;
      color: #166534;
    }
    .option.correct::after { content: " \\2713"; float: right; color: #16a34a; font-weight: bold; }
    .option.incorrect {
      border-color: #dc2626 !important;
      background: #fef2f2 !important;
      color: #991b1b;
    }
    .option.incorrect::after { content: " \\2717"; float: right; color: #dc2626; font-weight: bold; }
    .option.disabled { pointer-events: none; opacity: 0.85; }
    .option-letter {
      display: inline-block;
      width: 1.5rem;
      height: 1.5rem;
      line-height: 1.5rem;
      text-align: center;
      background: #e2e8f0;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.8rem;
      margin-right: 0.5rem;
      color: #475569;
    }
    .option.correct .option-letter { background: #bbf7d0; color: #166534; }
    .option.incorrect .option-letter { background: #fecaca; color: #991b1b; }
    .open-input {
      width: 100%;
      padding: 0.75rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9rem;
      resize: vertical;
      margin: 0.5rem 0;
      transition: border-color 0.2s;
    }
    .open-input:focus { outline: none; border-color: #0d9488; }
    .show-correction {
      display: inline-block;
      margin: 0.25rem 0;
      padding: 0.4rem 1rem;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #0d9488;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .show-correction:hover { background: #e2e8f0; }
    .correction-inner {
      margin-top: 0.75rem;
      padding: 1rem;
      background: #f0fdfa;
      border: 1px solid #0d948833;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #334155;
    }
    .correction {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed #e2e8f0;
    }
    .correction summary {
      cursor: pointer;
      font-weight: 500;
      font-size: 0.85rem;
      color: #0d9488;
      padding: 0.25rem 0;
    }
    .correction p {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #334155;
      padding: 0.75rem;
      background: #f0fdfa;
      border-radius: 8px;
    }
    .score-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2rem;
      padding: 1rem 1.5rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .score-bar span { font-size: 0.9rem; color: #475569; }
    .score-bar strong { color: #0f172a; }
    .btn-score {
      padding: 0.5rem 1.25rem;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }
    .btn-score:hover { opacity: 0.9; }
    #interactive-results {
      display: none;
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: #fff;
      border: 2px solid #0d9488;
      border-radius: 12px;
      text-align: center;
    }
    #interactive-results h3 { font-size: 1.2rem; color: #0f172a; margin-bottom: 0.75rem; }
    #interactive-results .final-score-value { font-size: 1.5rem; font-weight: 700; color: #0d9488; }
    #interactive-results .final-pct { font-size: 1.1rem; color: #475569; }
    #interactive-results .final-msg { font-size: 1rem; font-weight: 500; margin-top: 0.5rem; }
    .score-bar-outer {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      margin: 0.75rem 0;
      overflow: hidden;
    }
    .score-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #0d9488, #0f766e);
      border-radius: 4px;
      transition: width 0.5s ease;
      width: 0%;
    }
    .bareme {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      margin-top: 1.5rem;
    }
    .bareme h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: #0f172a;
    }
    .bareme .total {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0d9488;
      margin-bottom: 0.5rem;
    }
    .bareme ul { list-style: none; padding: 0; }
    .bareme li {
      padding: 0.3rem 0;
      font-size: 0.9rem;
      color: #475569;
    }
    .bareme li::before { content: "\\2022"; color: #0d9488; font-weight: bold; margin-right: 0.5rem; }
    .page-break { page-break-before: always; }
    @media print {
      body { background: white; padding: 0; }
      .header { border-radius: 0; }
      .question { break-inside: avoid; }
      .interactive, .show-correction, .btn-score { display: none !important; }
      .correction-content { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${evalData.titre || title}</h1>
      <div class="meta">
        <strong>${metadata.niveau}</strong> — ${metadata.matiere}<br>
        ${metadata.unite} — ${metadata.lecon}<br>
        Durée: ${metadata.duree} min &middot; Semestre: ${metadata.semestre}
      </div>
    </div>

    ${evalData.consigne ? `<div class="consigne"><strong>Consigne:</strong> ${evalData.consigne}</div>` : ''}

    ${questionsHtml}

    <div class="score-bar">
      <span>Score: <strong id="score-display">0</strong> / <strong id="max-score">0</strong></span>
      <button class="btn-score" onclick="showAllScores()">Voir les corrigés</button>
    </div>

    <div id="interactive-results">
      <h3>Résultat final</h3>
      <p class="final-score-value">0 / 0</p>
      <p class="final-pct">0%</p>
      <div class="score-bar-outer">
        <div class="score-bar-fill"></div>
      </div>
      <p class="final-msg"></p>
    </div>

    ${evalData.bareme ? `
    <div class="bareme">
      <h3>Barème</h3>
      ${evalData.bareme.total_points ? `<p class="total">Total: ${evalData.bareme.total_points} points</p>` : ''}
      ${evalData.bareme.criteres?.length ? `<ul>${evalData.bareme.criteres.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
    </div>` : ''}
  </div>
  ${renderInteractiveJS()}
</body>
</html>`;
}
