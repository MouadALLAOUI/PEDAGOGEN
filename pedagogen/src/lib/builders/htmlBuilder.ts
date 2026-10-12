import type { CourseMetadata } from '@/types/generation';
import { marked } from 'marked';
import { renderHtmlMinisterialHeader, type MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface EvaluationQuestion {
  numero: number;
  type: 'qcm' | 'vrai_faux' | 'ouvert' | 'appariement' | 'exercice';
  competence_evaluee?: string;
  niveau_bloom?: string;
  enonce: string;
  points: number;
  options?: string[];
  correction?: string;
  feedback_personnalise?: string;
}

interface EvaluationBaremeCompetence {
  competence?: string;
  points?: number;
}

interface EvaluationGrilleItem {
  critere?: string;
  indicateurs?: string[];
  points_max?: number;
}

interface EvaluationPartieRestitution {
  titre?: string;
  points?: number;
  consigne?: string;
  questions?: EvaluationQuestion[];
}

interface EvaluationPartieRaisonnementAPC {
  titre?: string;
  points?: number;
  situation_probleme?: string;
  documents?: { titre?: string; contenu?: string; source?: string }[];
  questions?: EvaluationQuestion[];
}

interface EvaluationElementReponse {
  question_ref?: string;
  reponse_modele?: string;
  bareme_detaille?: string;
  criteres_acceptation?: string[];
}

interface EvaluationGrilleCriterieeAPCItem {
  critere?: string;
  code?: 'C1' | 'C2' | 'C3' | 'CP';
  description?: string;
  indicateurs?: string[];
  bareme?: number;
  niveaux_maitrise?: {
    niveau?: string;
    description?: string;
    points?: number;
  }[];
}

interface EvaluationData {
  titre?: string;
  niveau?: string;
  duree?: string;
  evaluation_automatique?: boolean;
  consigne?: string;
  consigne_generale?: string;
  partie_restitution?: EvaluationPartieRestitution;
  partie_raisonnement_apc?: EvaluationPartieRaisonnementAPC;
  elements_reponse?: EvaluationElementReponse[];
  grille_criteriee_apc?: EvaluationGrilleCriterieeAPCItem[];
  questions?: EvaluationQuestion[];
  bareme?: {
    total_points?: number;
    repartition_par_competence?: EvaluationBaremeCompetence[];
    criteres?: string[];
  };
  grille_evaluation?: (string | EvaluationGrilleItem)[];
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
    const scoreOn20El = document.getElementById('score-on-20');
    if (scoreOn20El) {
      const scoreOn20 = maxScore > 0 ? (totalScore / maxScore * 20).toFixed(1) : '0';
      scoreOn20El.textContent = scoreOn20;
    }
  }

  function updateProgress() {
    const totalQ = document.querySelectorAll('.question[data-type="qcm"], .question[data-type="vrai_faux"]').length;
    const answeredQ = document.querySelectorAll('.question[data-type="qcm"][data-answered="true"], .question[data-type="vrai_faux"][data-answered="true"]').length;
    const progressFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill) {
      const pct = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
      progressFill.style.width = pct + '%';
    }
    if (progressText) {
      progressText.textContent = answeredQ + ' / ' + totalQ + ' questions répondues';
    }
  }

  function showFinalScore() {
    if (!results) return;
    results.style.display = 'block';
    results.querySelector('.final-score-value').textContent = totalScore + ' / ' + maxScore;
    const scoreOn20 = maxScore > 0 ? (totalScore / maxScore * 20).toFixed(1) : '0';
    const finalScore20El = results.querySelector('.final-score-20');
    if (finalScore20El) finalScore20El.textContent = scoreOn20 + ' / 20';
    
    const pct = maxScore > 0 ? Math.round(totalScore / maxScore * 100) : 0;
    results.querySelector('.final-pct').textContent = pct + '%';
    const bar = results.querySelector('.score-bar-fill');
    if (bar) bar.style.width = pct + '%';
    const msg = results.querySelector('.final-msg');
    if (msg) {
      if (pct >= 80) msg.textContent = 'Très bien !';
      else if (pct >= 60) msg.textContent = 'Bien, continuez vos efforts.';
      else if (pct >= 40) msg.textContent = 'Peut mieux faire, revoyez le cours.';
      else msg.textContent = 'À revoir, relisez attentivement la leçon.';
    }
  }

  window.handleSelect = function(qIndex, optIndex, isVraiFaux) {
    const q = document.querySelector('.question[data-index="' + qIndex + '"]');
    if (!q || q.dataset.answered === 'true') return;
    q.dataset.answered = 'true';
    const correction = q.dataset.correction || '';
    const points = parseFloat(q.dataset.points) || 0;
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

    const feedbackDiv = q.querySelector('.feedback');
    if (feedbackDiv) {
      const fdText = q.dataset.feedback || '';
      if (fdText) {
        feedbackDiv.innerHTML = '<div class="correction-inner"><strong>Feedback :</strong> ' + fdText + '</div>';
        feedbackDiv.style.display = 'block';
      }
    }

    updateScore();
    updateProgress();
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

  window.resetEvaluation = function() {
    totalScore = 0;
    document.querySelectorAll('.question').forEach(function(q) {
      q.dataset.answered = 'false';
      q.querySelectorAll('.option').forEach(function(o) {
        o.classList.remove('correct', 'incorrect', 'disabled');
        o.style.cursor = 'pointer';
      });
      const feedbackDiv = q.querySelector('.feedback');
      if (feedbackDiv) {
        feedbackDiv.innerHTML = '';
        feedbackDiv.style.display = 'none';
      }
      const textarea = q.querySelector('.open-input');
      if (textarea) {
        textarea.value = '';
      }
      const corrContent = q.querySelector('.correction-content');
      if (corrContent) {
        corrContent.style.display = 'none';
      }
      const showCorrBtn = q.querySelector('.show-correction');
      if (showCorrBtn) {
        showCorrBtn.textContent = 'Voir la correction';
      }
    });

    if (results) {
      results.style.display = 'none';
    }

    updateScore();
    updateProgress();
  };

  window.showAllScores = function() {
    showFinalScore();
    document.querySelectorAll('.question').forEach(function(q) {
      q.dataset.answered = 'true';
      const opts = q.querySelectorAll('.option');
      opts.forEach(function(o) { o.classList.add('disabled'); o.style.cursor = 'default'; });

      const details = q.querySelector('details.correction');
      if (details) details.open = true;

      const corrContent = q.querySelector('.correction-content');
      if (corrContent) {
        corrContent.style.display = 'block';
      }
      const showCorrBtn = q.querySelector('.show-correction');
      if (showCorrBtn) {
        showCorrBtn.textContent = 'Masquer la correction';
      }

      const feedbackDiv = q.querySelector('.feedback');
      if (feedbackDiv) {
        const fdText = q.dataset.feedback || '';
        if (fdText) {
          feedbackDiv.innerHTML = '<div class="correction-inner"><strong>Feedback :</strong> ' + fdText + '</div>';
          feedbackDiv.style.display = 'block';
        }
      }
    });
    updateProgress();
  };

  // Compute static maxScore based on existing questions
  document.querySelectorAll('.question[data-type="qcm"], .question[data-type="vrai_faux"]').forEach(function(q) {
    maxScore += parseFloat(q.dataset.points) || 0;
  });
  updateScore();
  updateProgress();

  window.toggleCorrections = function(show) {
    if (show) {
      document.body.classList.remove('hide-corrections');
    } else {
      document.body.classList.add('hide-corrections');
    }
  };
  document.body.classList.add('hide-corrections');

  document.querySelectorAll('.show-correction').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var qIdx = btn.dataset.q;
      if (!qIdx) return;
      window.toggleCorrection(qIdx);
    });
  });
})();
</script>`;
}

function renderOptions(q: EvaluationQuestion, index: number, evaluationAutomatique: boolean): string {
  if (!q.options?.length) return '';

  if (evaluationAutomatique && q.type === 'vrai_faux') {
    return q.options.map((opt, i) => `
      <div class="option interactive" onclick="handleSelect(${index}, ${i}, true)">
        ${opt}
      </div>`).join('');
  }

  if (evaluationAutomatique && q.type === 'qcm') {
    return q.options.map((opt, i) => `
      <div class="option interactive" onclick="handleSelect(${index}, ${i}, false)">
        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
        <span class="option-text">${opt}</span>
      </div>`).join('');
  }

  if (!evaluationAutomatique && (q.type === 'qcm' || q.type === 'vrai_faux')) {
    return q.options.map((opt, i) => `
      <div class="option">
        ${q.type === 'qcm' ? `<span class="option-letter">${String.fromCharCode(65 + i)}</span>` : ''}
        <span class="option-text">${opt}</span>
      </div>`).join('');
  }

  return q.options.map((opt) => `<li class="option">${opt}</li>`).join('');
}

function renderQuestion(q: EvaluationQuestion, index: number, evaluationAutomatique: boolean): string {
  const typeLabels: Record<string, string> = {
    qcm: 'QCM',
    vrai_faux: 'Vrai / Faux',
    ouvert: 'Question ouverte',
    appariement: 'Appariement',
    exercice: 'Exercice',
  };

  const isInteractive = evaluationAutomatique && (q.type === 'qcm' || q.type === 'vrai_faux');
  const optionsHtml = renderOptions(q, index, evaluationAutomatique);

  return `
    <div class="question" data-index="${index}" data-type="${q.type}" data-points="${q.points}" data-correction="${(q.correction || '').replace(/"/g, '&quot;')}" data-feedback="${(q.feedback_personnalise || '').replace(/"/g, '&quot;')}" data-answered="false">
      <div class="question-header">
        <span class="question-number">Question ${q.numero}</span>
        <span class="question-type ${isInteractive ? 'interactive-badge' : ''}">${typeLabels[q.type] || q.type}</span>
        ${q.niveau_bloom ? `<span class="q-badge-interactive bloom-badge">${q.niveau_bloom}</span>` : ''}
        ${isInteractive ? '<span class="q-badge-interactive">Auto-corrigé</span>' : ''}
        <span class="question-points">${q.points} pt${q.points > 1 ? 's' : ''}</span>
      </div>
      <div class="question-body">
        ${q.competence_evaluee ? `<p class="competence-label">${q.competence_evaluee}</p>` : ''}
        <p class="question-text">${q.enonce}</p>
        ${optionsHtml ? `<div class="options">${optionsHtml}</div>` : ''}

        ${q.type === 'ouvert' ? `
        <textarea class="open-input" rows="3" placeholder="Écrivez votre réponse ici..."></textarea>
        <button class="show-correction" data-q="${index}">Voir la correction</button>
        <div class="correction-content" data-q="${index}" style="display:none">
          <div class="correction-inner">
            <strong>Correction :</strong>
            <p>${q.correction || 'Pas de correction fournie.'}</p>
            ${q.feedback_personnalise ? `<p style="margin-top: 5px; color: #0d9488;"><strong>Feedback :</strong> ${q.feedback_personnalise}</p>` : ''}
          </div>
        </div>` : ''}

        ${isInteractive && q.correction ? `
        <div class="feedback" data-q="${index}" style="display:none"></div>` : ''}

        ${q.correction && !isInteractive && q.type !== 'ouvert' ? `
        <details class="correction">
          <summary>Corrigé</summary>
          <p>${q.correction}</p>
          ${q.feedback_personnalise ? `<p style="margin-top: 5px; color: #0d9488;"><strong>Feedback :</strong> ${q.feedback_personnalise}</p>` : ''}
        </details>` : ''}
      </div>
    </div>`;
}

export function buildHtml(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string,
  header?: MinisterialHeaderInfo,
): string {
  const evalData = content as EvaluationData;

  const restitutionQuestions = Array.isArray(evalData.partie_restitution?.questions)
    ? evalData.partie_restitution!.questions.filter((q): q is EvaluationQuestion => q && typeof q.numero === 'number' && typeof q.enonce === 'string' && q.enonce !== 'undefined')
    : [];

  const raisonnementQuestions = Array.isArray(evalData.partie_raisonnement_apc?.questions)
    ? evalData.partie_raisonnement_apc!.questions.filter((q): q is EvaluationQuestion => q && typeof q.numero === 'number' && typeof q.enonce === 'string' && q.enonce !== 'undefined')
    : [];

  const hasStandardizedParts = restitutionQuestions.length > 0 || raisonnementQuestions.length > 0;

  const validQuestions = hasStandardizedParts
    ? [...restitutionQuestions, ...raisonnementQuestions]
    : (Array.isArray(evalData.questions)
        ? evalData.questions.filter((q): q is EvaluationQuestion => q && typeof q.numero === 'number' && typeof q.enonce === 'string' && q.enonce !== 'undefined')
        : []);

  const evaluationAutomatique = evalData.evaluation_automatique !== false;

  let bodyContentHtml = '';

  if (hasStandardizedParts) {
    let qGlobalIndex = 0;
    const restitutionHtml = restitutionQuestions.length > 0 ? `
      <div class="eval-part-card">
        <div class="eval-part-header">
          <span class="part-badge">Composante 1</span>
          <h3>${evalData.partie_restitution?.titre || 'Restitution des connaissances'}</h3>
          <span class="part-points">${evalData.partie_restitution?.points || 8} pts</span>
        </div>
        ${evalData.partie_restitution?.consigne ? `<div class="part-consigne">${evalData.partie_restitution.consigne}</div>` : ''}
        <div class="questions">
          ${restitutionQuestions.map((q) => renderQuestion(q, qGlobalIndex++, evaluationAutomatique)).join('\n')}
        </div>
      </div>` : '';

    const raisonnementHtml = raisonnementQuestions.length > 0 ? `
      <div class="eval-part-card" style="margin-top: 2rem;">
        <div class="eval-part-header">
          <span class="part-badge">Composante 2</span>
          <h3>${evalData.partie_raisonnement_apc?.titre || 'Raisonnement scientifique et résolution de problème (APC)'}</h3>
          <span class="part-points">${evalData.partie_raisonnement_apc?.points || 12} pts</span>
        </div>
        ${evalData.partie_raisonnement_apc?.situation_probleme ? `
          <div class="sp-box">
            <strong>Situation-Problème :</strong>
            <p>${evalData.partie_raisonnement_apc.situation_probleme}</p>
          </div>` : ''}
        ${evalData.partie_raisonnement_apc?.documents?.length ? `
          <div class="documents-grid">
            ${evalData.partie_raisonnement_apc.documents.map((doc, dIdx) => `
              <div class="doc-card">
                <div class="doc-title">Document ${dIdx + 1} : ${doc.titre || 'Document support'}</div>
                <div class="doc-body">${doc.contenu || ''}</div>
                ${doc.source ? `<div class="doc-source">Source : ${doc.source}</div>` : ''}
              </div>`).join('\n')}
          </div>` : ''}
        <div class="questions">
          ${raisonnementQuestions.map((q) => renderQuestion(q, qGlobalIndex++, evaluationAutomatique)).join('\n')}
        </div>
      </div>` : '';

    bodyContentHtml = restitutionHtml + raisonnementHtml;
  } else {
    bodyContentHtml = validQuestions.length > 0
      ? `<div class="questions">${validQuestions.map((q, i) => renderQuestion(q, i, evaluationAutomatique)).join('\n')}</div>`
      : `<div class="questions">` + Object.entries(content)
          .filter(([key]) => !['titre', 'consigne', 'bareme', 'grille_evaluation', 'partie_restitution', 'partie_raisonnement_apc', 'elements_reponse', 'grille_criteriee_apc'].includes(key))
          .map(([key, value]) => `
            <div class="question">
              <div class="question-header">
                <span class="question-number">${key.replace(/_/g, ' ')}</span>
              </div>
              <div class="question-body">
                <p class="question-text">${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>
              </div>
            </div>`)
          .join('\n') + `</div>`;
  }

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
    .bloom-badge { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .competence-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #0d9488;
      margin-bottom: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: #f0fdfa;
      border-radius: 6px;
      display: inline-block;
    }
    .question-points {
      margin-left: auto;
      font-size: 0.8rem;
      font-weight: 500;
      color: #64748b;
    }
    .question-body { padding: 1.25rem; }
    .question-text { font-size: 0.95rem; margin-bottom: 0.75rem; color: #1e293b; }
    .options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.75rem;
      margin: 0.75rem 0;
    }
    @media (max-width: 600px) {
      .options {
        grid-template-columns: 1fr;
      }
    }
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
    .progress-container {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }
    .progress-bar-outer {
      width: 100%;
      height: 10px;
      background: #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      width: 0%;
      transition: width 0.3s ease;
    }
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
    .student-cartouche {
      background: #fff;
      border: 1.5px solid #0f172a;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .cartouche-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: #1e293b;
      flex: 1;
    }
    .cartouche-note-box {
      border: 2px solid #0d9488;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      text-align: center;
      min-width: 120px;
      background: #f0fdfa;
    }
    .note-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #0d9488;
      letter-spacing: 0.05em;
    }
    .note-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .eval-part-card {
      margin-bottom: 2rem;
    }
    .eval-part-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
    }
    .eval-part-header h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fafc;
      flex: 1;
      margin: 0;
    }
    .part-badge {
      background: #0d9488;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .part-points {
      background: rgba(255, 255, 255, 0.15);
      color: #5eead4;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .part-consigne {
      font-size: 0.85rem;
      color: #475569;
      font-style: italic;
      margin: -0.5rem 0 1rem 0.25rem;
      padding-left: 0.5rem;
      border-left: 3px solid #0d9488;
    }
    .sp-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #d97706;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      color: #78350f;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .sp-box strong {
      color: #92400e;
      display: block;
      margin-bottom: 0.25rem;
      font-size: 0.95rem;
    }
    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .doc-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.85rem;
      font-size: 0.85rem;
    }
    .doc-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.35rem;
    }
    .doc-body {
      color: #334155;
      line-height: 1.4;
    }
    .doc-source {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.5rem;
      font-style: italic;
    }
    .corrige-table, .apc-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 0.85rem;
    }
    .timer-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
      color: #334155;
    }
    .timer-card strong { color: #2563eb; }
    .timer-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    .timer-btn:hover { background: #e2e8f0; }
    .teacher-controls {
      background: #fff;
      border: 1px solid #e2e8f0;
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1rem;
    }
    body.hide-corrections .correction-content,
    body.hide-corrections .feedback,
    body.hide-corrections .correction,
    body.hide-corrections .show-correction,
    body.hide-corrections details,
    body.hide-corrections .btn-score,
    body.hide-corrections #interactive-results,
    body.hide-corrections .teacher-corrigé-section {
      display: none !important;
    }
    body.hide-corrections .option.correct,
    body.hide-corrections .option.incorrect {
      border-color: #e2e8f0 !important;
      background: #f8fafc !important;
      color: #334155 !important;
    }
    body.hide-corrections .option.correct::after,
    body.hide-corrections .option.incorrect::after {
      display: none !important;
    }
    @media print {
      body {
        background: white;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .header { border-radius: 0; }
      .student-cartouche { break-inside: avoid; }
      .eval-part-card { break-inside: avoid-page; }
      .question { break-inside: avoid; }
      .teacher-corrigé-section { break-inside: avoid; }
      .grille-apc-section { break-inside: avoid; }
      button.interactive, .show-correction, .btn-score, .no-print { display: none !important; }
      .correction-content { display: block !important; }
      details.correction { display: block !important; }
      details.correction summary { display: none; }
      details.correction p { display: block !important; }
      body.hide-corrections .correction-content,
      body.hide-corrections .feedback,
      body.hide-corrections .correction,
      body.hide-corrections .show-correction,
      body.hide-corrections details,
      body.hide-corrections .btn-score,
      body.hide-corrections #interactive-results,
      body.hide-corrections .teacher-corrigé-section {
        display: none !important;
      }
      .option.correct {
        background-color: #f0fdf4 !important;
        border-color: #16a34a !important;
        color: #166534 !important;
      }
      .option.incorrect {
      background-color: #fef2f2 !important;
        border-color: #dc2626 !important;
        color: #991b1b !important;
      }
    }
    /* Flashcard styles */
    .flashcard-box { display: none; perspective: 1000px; height: 320px; cursor: pointer; user-select: none; margin: 1.5rem 0; }
    .flashcard-box.active { display: block; }
    .flashcard-inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; border-radius: 16px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #cbd5e1; }
    .flashcard-box.flipped .flashcard-inner { transform: rotateY(180deg); }
    .flashcard-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 16px; padding: 1.75rem; display: flex; flex-direction: column; background: white; }
    .flashcard-back { transform: rotateY(180deg); background: #f8fafc; border: 2px solid #0d9488; }
  </style>
</head>
<body>
  <div class="container">
    ${renderHtmlMinisterialHeader(header, metadata)}

    <div class="no-print" style="display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center;">
      <button id="btn-mode-quiz" onclick="switchEvalMode('quiz')" style="padding:8px 18px;border-radius:10px;border:1px solid #0d9488;background:#0d9488;color:white;font-weight:600;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;">📝 Mode Quiz Interactif</button>
      <button id="btn-mode-flashcards" onclick="switchEvalMode('flashcards')" style="padding:8px 18px;border-radius:10px;border:1px solid #cbd5e1;background:white;color:#0f172a;font-weight:600;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;">🗂️ Mode Flashcards (Révision)</button>
      <button onclick="window.print()" style="padding:8px 16px;border-radius:10px;border:1px solid #cbd5e1;background:white;color:#0f172a;font-weight:600;font-size:0.85rem;cursor:pointer;margin-left:auto;display:flex;align-items:center;gap:6px;">🖨️ Imprimer</button>
    </div>

    <!-- FLASHCARDS SECTION -->
    ${validQuestions.length > 0 ? `
    <div id="flashcards-section" style="display: none;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; text-align: center;">
        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.25rem;">Flashcards de Révision Autonome</h3>
        <p style="font-size: 0.85rem; color: #64748b;">Cliquez sur la carte pour la retourner. Utilisez les flèches pour naviguer entre les questions.</p>
        <div style="display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 1rem;">
          <button onclick="prevFlashcard()" style="padding: 6px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 600; cursor: pointer;">← Précédent</button>
          <span id="flashcard-counter" style="font-weight: 700; color: #0d9488; font-size: 0.95rem;">1 / ${validQuestions.length}</span>
          <button onclick="nextFlashcard()" style="padding: 6px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 600; cursor: pointer;">Suivant →</button>
        </div>
      </div>
      <div class="flashcards-deck">
        ${validQuestions.map((q, idx) => `
          <div class="flashcard-box ${idx === 0 ? 'active' : ''}" data-index="${idx}" onclick="this.classList.toggle('flipped')">
            <div class="flashcard-inner">
              <div class="flashcard-face flashcard-front">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #0d9488; background: #f0fdfa; padding: 3px 8px; border-radius: 6px;">Question ${q.numero || idx + 1} (${q.type?.toUpperCase()})</span>
                  ${q.niveau_bloom ? `<span style="font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${q.niveau_bloom}</span>` : ''}
                </div>
                <div style="font-size: 1.15rem; font-weight: 600; color: #0f172a; margin: auto 0; text-align: center;">${q.enonce}</div>
                ${q.options?.length ? `<div style="margin-top: 12px; font-size: 0.85rem; color: #475569; text-align: left; background: #f8fafc; padding: 8px 12px; border-radius: 8px;">${q.options.map(o => `<div>• ${o}</div>`).join('')}</div>` : ''}
                <div style="margin-top: auto; font-size: 0.75rem; color: #94a3b8; text-align: center;">💡 Cliquer pour voir la correction</div>
              </div>
              <div class="flashcard-face flashcard-back">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #16a34a; background: #f0fdf4; padding: 3px 8px; border-radius: 6px;">✓ Réponse / Correction</span>
                  <span style="font-size: 0.75rem; color: #64748b;">${q.points || 1} pt(s)</span>
                </div>
                <div style="font-size: 1.05rem; font-weight: 500; color: #0f172a; margin: auto 0; line-height: 1.5; text-align: center;">${q.correction || 'Consulter le résumé du cours.'}</div>
                ${q.feedback_personnalise ? `<div style="margin-top: 12px; font-size: 0.8rem; color: #334155; text-align: left; background: #ffffff; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #0d9488;"><strong>Explication :</strong> ${q.feedback_personnalise}</div>` : ''}
                <div style="margin-top: auto; font-size: 0.75rem; color: #94a3b8; text-align: center;">↺ Cliquer pour retourner</div>
              </div>
            </div>
          </div>
        `).join('\n')}
      </div>
    </div>` : ''}

    <!-- QUIZ SECTION -->
    <div id="quiz-section">
      <div class="header">
        <h1>${evalData.titre || title}</h1>
        <div class="meta">
          ${evalData.niveau ? `<strong>${evalData.niveau}</strong>` : `<strong>${metadata.niveau}</strong>`} — ${metadata.matiere}<br>
          ${metadata.unite} — ${metadata.lecon}<br>
          ${evalData.duree ? `Durée: ${evalData.duree} &middot; ` : ''}Semestre: ${metadata.semestre}
        </div>
      </div>

      <div class="timer-card no-print">
        <span>⏱️ Temps restant : <strong id="timer-display">--:--</strong></span>
        <span style="font-size:0.85rem;color:#64748b;">(Durée conseillée : ${evalData.duree || metadata.duree || '45 min'})</span>
        <span style="display:flex;gap:0.4rem;">
          <button class="timer-btn" id="timer-pause-btn" onclick="toggleTimerPause()" title="Pause/Reprendre">⏸️</button>
          <button class="timer-btn" onclick="resetTimer()" title="Réinitialiser le timer">🔄</button>
        </span>
      </div>

      <div class="teacher-controls no-print">
        <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 500; color: #475569;">
          <input type="checkbox" id="toggle-corrections" onchange="toggleCorrections(this.checked)" style="accent-color: #0d9488; width: 16px; height: 16px;">
          Afficher le corrigé et les critères
        </label>
        <span style="font-size: 0.8rem; color: #94a3b8;">(Activer pour la correction en classe)</span>
      </div>

      ${hasStandardizedParts ? `
      <div class="student-cartouche">
        <div class="cartouche-row">
          <div><strong>Nom & Prénom :</strong> .....................................................................................</div>
          <div style="display:flex;gap:2rem;">
            <span><strong>Classe :</strong> ................</span>
            <span><strong>N° :</strong> ........</span>
            <span><strong>Date :</strong> ................</span>
          </div>
        </div>
        <div class="cartouche-note-box">
          <div class="note-label">NOTE SUR 20</div>
          <div class="note-value">....... / 20</div>
        </div>
      </div>` : ''}

      ${evalData.consigne || evalData.consigne_generale ? `
      <div class="consigne">
        <strong>Consignes :</strong> ${evalData.consigne || evalData.consigne_generale}
      </div>` : ''}

      ${bodyContentHtml}

      ${evaluationAutomatique ? `
      <div id="interactive-results" style="display: none; background: white; border: 2px solid #0d9488; border-radius: 12px; padding: 1.5rem; margin-top: 1.5rem; text-align: center;">
        <h3 style="color: #0f172a; margin-bottom: 0.5rem;">Résultat de l'Évaluation</h3>
        <p style="font-size: 1.5rem; font-weight: 700; color: #0d9488; margin-bottom: 0.5rem;">Note : <span class="final-score-20">0 / 20</span></p>
        <p class="final-pct">0%</p>
        <div class="score-bar-outer">
          <div class="score-bar-fill"></div>
        </div>
        <p class="final-msg"></p>
      </div>` : ''}

      ${evalData.elements_reponse?.length ? `
      <div class="teacher-corrigé-section bareme" style="margin-top: 2rem;">
        <h3 style="color:#0d9488;display:flex;align-items:center;gap:8px;">
          <span>📋</span> Éléments de Réponse & Corrigé Type Officiel
          <span style="font-size:0.75rem;background:#f0fdfa;color:#0d9488;padding:2px 8px;border-radius:12px;border:1px solid #0d948844;">Enseignant</span>
        </h3>
        <table class="corrige-table">
          <thead>
            <tr style="background:#0f172a;color:white;">
              <th style="padding:8px 10px;text-align:left;border:1px solid #334155;width:15%;">Question</th>
              <th style="padding:8px 10px;text-align:left;border:1px solid #334155;width:45%;">Réponse Modèle / Attendue</th>
              <th style="padding:8px 10px;text-align:left;border:1px solid #334155;width:20%;">Barème Détaillé</th>
              <th style="padding:8px 10px;text-align:left;border:1px solid #334155;width:20%;">Critères d'Acceptation</th>
            </tr>
          </thead>
          <tbody>
            ${evalData.elements_reponse.map(el => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 10px;font-weight:600;color:#0d9488;vertical-align:top;border:1px solid #e2e8f0;">${escapeHtml(el.question_ref || 'Q')}</td>
                <td style="padding:8px 10px;color:#1e293b;vertical-align:top;border:1px solid #e2e8f0;">${escapeHtml(el.reponse_modele || '')}</td>
                <td style="padding:8px 10px;color:#0f172a;font-weight:500;vertical-align:top;border:1px solid #e2e8f0;">${escapeHtml(el.bareme_detaille || '')}</td>
                <td style="padding:8px 10px;color:#64748b;font-size:0.8rem;vertical-align:top;border:1px solid #e2e8f0;">
                  ${el.criteres_acceptation?.length ? el.criteres_acceptation.map(c => `<div>• ${escapeHtml(c)}</div>`).join('') : '—'}
                </td>
              </tr>
            `).join('\n')}
          </tbody>
        </table>
      </div>` : ''}

      ${evalData.grille_criteriee_apc?.length ? `
      <div class="grille-apc-section bareme" style="margin-top: 1.5rem;">
        <h3 style="color:#0f172a;display:flex;align-items:center;gap:8px;">
          <span>📐</span> Grille d'Évaluation Critériée APC (Officielle MEN)
        </h3>
        <table class="apc-table">
          <thead>
            <tr style="background:#0d9488;color:white;">
              <th style="padding:8px 10px;text-align:left;border:1px solid #0f766e;width:14%;">Code</th>
              <th style="padding:8px 10px;text-align:left;border:1px solid #0f766e;width:24%;">Critère d'Évaluation</th>
              <th style="padding:8px 10px;text-align:left;border:1px solid #0f766e;width:48%;">Description & Indicateurs Observables</th>
              <th style="padding:8px 10px;text-align:center;border:1px solid #0f766e;width:14%;">Barème</th>
            </tr>
          </thead>
          <tbody>
            ${evalData.grille_criteriee_apc.map(g => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 10px;font-weight:700;color:${g.code === 'CP' ? '#d97706' : '#0d9488'};vertical-align:top;border:1px solid #e2e8f0;">
                  ${escapeHtml(g.code || '')} ${g.code === 'CP' ? '<span style="font-size:0.7rem;display:block;color:#92400e;font-weight:normal;">Perfectionnement</span>' : '<span style="font-size:0.7rem;display:block;color:#64748b;font-weight:normal;">Critère minimal</span>'}
                </td>
                <td style="padding:8px 10px;font-weight:600;color:#1e293b;vertical-align:top;border:1px solid #e2e8f0;">${escapeHtml(g.critere || '')}</td>
                <td style="padding:8px 10px;color:#475569;vertical-align:top;border:1px solid #e2e8f0;">
                  ${g.description ? `<p style="margin-bottom:4px;font-weight:500;">${escapeHtml(g.description)}</p>` : ''}
                  ${g.indicateurs?.length ? `<ul style="list-style:none;padding:0;margin:0;">${g.indicateurs.map(ind => `<li style="font-size:0.8rem;color:#64748b;">• ${escapeHtml(ind)}</li>`).join('')}</ul>` : ''}
                </td>
                <td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;vertical-align:top;border:1px solid #e2e8f0;">${g.bareme !== undefined ? `${escapeHtml(g.bareme)} pt${Number(g.bareme) > 1 ? 's' : ''}` : '—'}</td>
              </tr>
            `).join('\n')}
          </tbody>
        </table>
      </div>` : ''}

      ${!evalData.grille_criteriee_apc?.length && evalData.bareme ? `
      <div class="bareme">
        <h3>Barème</h3>
        ${evalData.bareme.total_points ? `<p class="total">Total: ${escapeHtml(evalData.bareme.total_points)} points</p>` : ''}
        ${evalData.bareme.repartition_par_competence?.length ? `
        <p style="font-weight:600;font-size:0.85rem;color:#0f172a;margin-bottom:0.4rem;">Répartition par compétence</p>
        <ul>${evalData.bareme.repartition_par_competence.map(r => `<li><strong>${escapeHtml(r.competence || '')}:</strong> ${escapeHtml(r.points || 0)} pts</li>`).join('')}</ul>` : ''}
        ${evalData.bareme.criteres?.length ? `<ul>${evalData.bareme.criteres.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}
      </div>` : ''}

      ${!evalData.grille_criteriee_apc?.length && evalData.grille_evaluation?.length ? `
      <div class="bareme" style="margin-top:1rem;">
        <h3>Grille d'Évaluation</h3>
        ${evalData.grille_evaluation.map((g) => {
          if (typeof g === 'string') return `<p style="font-size:0.85rem;color:#475569;margin:0.3rem 0;">• ${escapeHtml(g)}</p>`;
          const gi = g as EvaluationGrilleItem;
          return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:0.75rem;margin:0.5rem 0;">
            <p style="font-weight:600;font-size:0.85rem;color:#92400e;">${escapeHtml(gi.critere || '')} ${gi.points_max ? `<span style="font-weight:400;color:#64748b;">(${escapeHtml(gi.points_max)} pts max)</span>` : ''}</p>
            ${gi.indicateurs?.length ? `<ul style="list-style:none;padding:0;margin:0.3rem 0 0 0;">${gi.indicateurs.map(ind => `<li style="font-size:0.8rem;color:#475569;padding:0.15rem 0;">• ${escapeHtml(ind)}</li>`).join('')}</ul>` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>
  </div>
  ${evaluationAutomatique ? renderInteractiveJS() : ''}
  <script>
  (function() {
    const TOTAL_MINUTES = ${parseInt(String(evalData.duree || metadata.duree || 45).replace(/\D/g, '')) || 45};
    let seconds = TOTAL_MINUTES * 60;
    let isPaused = false;
    let intervalId = null;
    const timerEl = document.getElementById('timer-display');

    function updateDisplay() {
      if (!timerEl) return;
      if (seconds <= 0) {
        timerEl.textContent = "Temps écoulé !";
        timerEl.style.color = "#dc2626";
        return;
      }
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function startTimer() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(function() {
        if (isPaused) return;
        if (seconds <= 0) {
          clearInterval(intervalId);
          intervalId = null;
          timerEl.textContent = "Temps écoulé !";
          timerEl.style.color = "#dc2626";
          return;
        }
        seconds--;
        updateDisplay();
      }, 1000);
    }

    window.toggleTimerPause = function() {
      isPaused = !isPaused;
      const btn = document.getElementById('timer-pause-btn');
      if (btn) btn.textContent = isPaused ? '▶️' : '⏸️';
    };

    window.resetTimer = function() {
      isPaused = false;
      seconds = TOTAL_MINUTES * 60;
      const btn = document.getElementById('timer-pause-btn');
      if (btn) btn.textContent = '⏸️';
      if (timerEl) timerEl.style.color = '';
      updateDisplay();
      if (!intervalId) startTimer();
    };

    updateDisplay();
    startTimer();

    // Flashcard navigation
    let currentFc = 0;
    const allCards = document.querySelectorAll('.flashcard-box');
    const totalFc = allCards.length;

    function renderFc(idx) {
      allCards.forEach(function(card, i) {
        card.classList.remove('active');
        card.classList.remove('flipped');
        if (i === idx) card.classList.add('active');
      });
      const counterEl = document.getElementById('flashcard-counter');
      if (counterEl) counterEl.textContent = (idx + 1) + ' / ' + totalFc;
    }

    window.nextFlashcard = function() {
      if (currentFc < totalFc - 1) {
        currentFc++;
        renderFc(currentFc);
      }
    };

    window.prevFlashcard = function() {
      if (currentFc > 0) {
        currentFc--;
        renderFc(currentFc);
      }
    };

    window.switchEvalMode = function(mode) {
      const quizSec = document.getElementById('quiz-section');
      const fcSec = document.getElementById('flashcards-section');
      const btnQuiz = document.getElementById('btn-mode-quiz');
      const btnFc = document.getElementById('btn-mode-flashcards');
      if (mode === 'quiz') {
        if (quizSec) quizSec.style.display = 'block';
        if (fcSec) fcSec.style.display = 'none';
        if (btnQuiz) { btnQuiz.style.background = '#0d9488'; btnQuiz.style.color = 'white'; btnQuiz.style.borderColor = '#0d9488'; }
        if (btnFc) { btnFc.style.background = 'white'; btnFc.style.color = '#0f172a'; btnFc.style.borderColor = '#cbd5e1'; }
      } else {
        if (quizSec) quizSec.style.display = 'none';
        if (fcSec) fcSec.style.display = 'block';
        if (btnFc) { btnFc.style.background = '#0d9488'; btnFc.style.color = 'white'; btnFc.style.borderColor = '#0d9488'; }
        if (btnQuiz) { btnQuiz.style.background = 'white'; btnQuiz.style.color = '#0f172a'; btnQuiz.style.borderColor = '#cbd5e1'; }
      }
    };
  })();
  </script>
</body>
</html>`;
}

export function buildHtmlFromMarkdown(
  markdown: string,
  title?: string,
  header?: MinisterialHeaderInfo,
): string {
  const htmlContent = marked.parse(markdown);
  const ministerialHeaderHtml = renderHtmlMinisterialHeader(header);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Document Pédagogique'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8f6f3; color: #0f172a; line-height: 1.6; padding: 2rem 1rem; }
    .container { max-width: 860px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    h1 { font-size: 1.8rem; color: #0f172a; margin-bottom: 1rem; border-bottom: 3px solid #0d9488; padding-bottom: 0.5rem; }
    h2 { font-size: 1.3rem; color: #0d9488; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; color: #1e293b; margin-top: 1rem; margin-bottom: 0.4rem; }
    p { margin-bottom: 0.8rem; color: #334155; }
    ul, ol { margin-left: 1.5rem; margin-bottom: 1rem; color: #334155; }
    li { margin-bottom: 0.3rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    th { background: #0d9488; color: white; text-align: left; padding: 8px 12px; border: 1px solid #0f766e; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em; color: #0f172a; }
    pre { background: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; }
    pre code { background: none; color: inherit; padding: 0; }
    blockquote { border-left: 4px solid #0d9488; padding-left: 1rem; color: #475569; font-style: italic; margin: 1rem 0; background: #f0fdfa; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; }
    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${ministerialHeaderHtml}
    ${htmlContent}
  </div>
</body>
</html>`;
}
