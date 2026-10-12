import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, estimateApiTokens } from '../src/lib/utils/tokenEstimator.ts';
import { getCurrentSchoolYear } from '../src/lib/utils/ministerialHeader.ts';
import { markdownToHtml } from '../src/lib/utils/markdownToHtml.ts';
import { getUnitsFor, getLessonsFor, MATIERES } from '../src/lib/curriculum/moroccoCollege.ts';

test('estimateTokens calculates reasonable token values for French and Arabic', () => {
  assert.equal(estimateTokens(''), 0);
  
  // French text: ~4 chars per token
  const frenchText = 'Bonjour tout le monde';
  const tokensFr = estimateTokens(frenchText);
  assert.ok(tokensFr > 0 && tokensFr <= 10);

  // Arabic text: ~3 chars per token
  const arabicText = 'مرحبا بكم في المغرب';
  const tokensAr = estimateTokens(arabicText);
  assert.ok(tokensAr > 0 && tokensAr <= 10);
});

test('estimateApiTokens combines prompt and completion tokens accurately', () => {
  const estimation = estimateApiTokens(
    'Tu es un professeur.',
    'Explique la photosynthèse.',
    'La photosynthèse est un processus biologique...'
  );
  assert.ok(estimation.prompt > 0);
  assert.ok(estimation.completion > 0);
  assert.equal(estimation.total, estimation.prompt + estimation.completion);
});

test('getCurrentSchoolYear returns valid Moroccan school calendar format', () => {
  const year = getCurrentSchoolYear();
  assert.match(year, /^\d{4} - \d{4}$/);
});

test('markdownToHtml converts markdown headings and tables into clean HTML', () => {
  const md = '# Titre Principal\n\n| Col A | Col B |\n|---|---|\n| Val 1 | Val 2 |\n';
  const html = markdownToHtml(md);
  assert.ok(html.includes('Titre Principal'));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('Val 1'));
});

test('moroccoCollege curriculum returns official Middle School subjects and units', () => {
  assert.ok(MATIERES.length >= 10);
  const mathUnits = getUnitsFor('Mathématiques', '1AC', 1);
  assert.ok(Array.isArray(mathUnits));
  assert.ok(mathUnits.length > 0);

  const lessons = getLessonsFor('Mathématiques', '1AC', 1);
  assert.ok(Array.isArray(lessons));
  assert.ok(lessons.length > 0);
});
