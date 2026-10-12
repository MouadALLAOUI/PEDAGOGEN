'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Minus,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { StudentGrade, StudentQuizResult } from '@/types/student';

export interface EvaluationPoint {
  id: string;
  title: string;
  date: string;
  scoreNorm20: number;
  rawScore: number;
  maxScore: number;
  type: string;
}

interface StudentEvolutionChartProps {
  grades: StudentGrade[];
  quizResults?: StudentQuizResult[];
  studentName?: string;
}

export function StudentEvolutionChart({
  grades,
  quizResults = [],
  studentName,
}: StudentEvolutionChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<EvaluationPoint | null>(null);

  // Combine and sort chronologically
  const points: EvaluationPoint[] = useMemo(() => {
    const list: EvaluationPoint[] = [];

    // From student_grades
    for (const g of grades) {
      const max = g.max_score || 20;
      const norm20 = max > 0 ? (g.score / max) * 20 : g.score;
      list.push({
        id: g.id,
        title: g.title,
        date: g.date || '',
        scoreNorm20: Math.round(norm20 * 10) / 10,
        rawScore: g.score,
        maxScore: max,
        type: g.eval_type ? g.eval_type.replace('_', ' ') : 'Évaluation',
      });
    }

    // From exam quizzes if not duplicated
    for (const qr of quizResults) {
      // Check if not already in grades by title/date
      const alreadyIn = list.some(
        (it) => it.title.toLowerCase() === qr.exam_titre.toLowerCase() && it.date === qr.exam_date
      );
      if (!alreadyIn) {
        const max = qr.total_points || 20;
        const norm20 = max > 0 ? (qr.total_score / max) * 20 : qr.total_score;
        list.push({
          id: qr.exam_id,
          title: qr.exam_titre,
          date: qr.exam_date || '',
          scoreNorm20: Math.round(norm20 * 10) / 10,
          rawScore: qr.total_score,
          maxScore: max,
          type: 'Quiz / Examen',
        });
      }
    }

    // Sort chronologically ascending
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [grades, quizResults]);

  // Statistics
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const scores = points.map((p) => p.scoreNorm20);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

    // Progression delta (first evaluation vs latest evaluation)
    const firstScore = points[0]?.scoreNorm20 ?? 0;
    const lastScore = points[points.length - 1]?.scoreNorm20 ?? 0;
    const delta = Math.round((lastScore - firstScore) * 10) / 10;

    return { min, max, avg, delta, total: points.length };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-center text-muted text-xs">
        <Sparkles size={24} className="mx-auto text-teal mb-2 opacity-50" />
        <p className="font-medium text-navy">Aucune évaluation enregistrée pour le moment.</p>
        <p className="text-[11px] mt-1">
          Les notes saisies et les résultats de quiz s'afficheront ici sous forme de courbe d'évolution.
        </p>
      </div>
    );
  }

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 30;

  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingY * 2;

  // Scale functions
  const getY = (val: number) => {
    // 0 is bottom, 20 is top
    const clamped = Math.max(0, Math.min(20, val));
    return svgHeight - paddingY - (clamped / 20) * innerHeight;
  };

  const getX = (idx: number) => {
    if (points.length <= 1) return paddingX + innerWidth / 2;
    return paddingX + (idx / (points.length - 1)) * innerWidth;
  };

  // Generate SVG path for the curve
  const pathD = points.reduce((acc, p, idx) => {
    const x = getX(idx);
    const y = getY(p.scoreNorm20);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Generate closed area path for the gradient fill
  const areaD =
    points.length > 0
      ? `${pathD} L ${getX(points.length - 1)} ${svgHeight - paddingY} L ${getX(0)} ${
          svgHeight - paddingY
        } Z`
      : '';

  const avgY = stats ? getY(stats.avg) : 0;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
      {/* Top Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-navy flex items-center gap-1.5">
              <TrendingUp size={18} className="text-teal" />
              Suivi Longitudinal de Progression
            </h3>
            {stats && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  stats.delta > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : stats.delta < 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {stats.delta > 0 ? (
                  <>
                    <ArrowUpRight size={14} /> +{stats.delta} pts
                  </>
                ) : stats.delta < 0 ? (
                  <>
                    <ArrowDownRight size={14} /> {stats.delta} pts
                  </>
                ) : (
                  <>
                    <Minus size={14} /> Stable
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            Évolution des résultats d'évaluations et examens sur l'année pour{' '}
            <strong className="text-navy">{studentName || "l'élève"}</strong>
          </p>
        </div>

        {/* Quick KPI stats */}
        {stats && (
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-muted block">Min / Max</span>
              <span className="font-semibold text-navy">
                {stats.min} <span className="text-muted text-[10px]">/ 20</span> • {stats.max}{' '}
                <span className="text-muted text-[10px]">/ 20</span>
              </span>
            </div>
            <div className="text-right pl-3 border-l border-border/80">
              <span className="text-[10px] uppercase font-semibold text-muted block">Moyenne</span>
              <span className="text-sm font-bold text-teal">{stats.avg} / 20</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y Axis labels */}
          {[0, 5, 10, 15, 20].map((val) => {
            const y = getY(val);
            const isTen = val === 10;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke={isTen ? '#F59E0B' : '#E2E8F0'}
                  strokeDasharray={isTen ? '4 3' : '2 2'}
                  strokeWidth={isTen ? 1.2 : 0.8}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className={`text-[9px] font-mono ${
                    isTen ? 'fill-amber-600 font-bold' : 'fill-slate-400'
                  }`}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Average Reference Line */}
          {stats && (
            <line
              x1={paddingX}
              y1={avgY}
              x2={svgWidth - paddingX}
              y2={avgY}
              stroke="#0D9488"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.6}
            />
          )}

          {/* Gradient Area under curve */}
          {areaD && <path d={areaD} fill="url(#curveGradient)" />}

          {/* Main Curve Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0D9488"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((p, idx) => {
            const x = getX(idx);
            const y = getY(p.scoreNorm20);
            const isHovered = hoveredPoint?.id === p.id;
            const isAboveAverage = p.scoreNorm20 >= 10;

            return (
              <g
                key={p.id}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Hit area for easier hover */}
                <circle cx={x} cy={y} r={14} fill="transparent" />

                {/* Outer halo */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 4.5}
                  fill={isAboveAverage ? '#0D9488' : '#E11D48'}
                  className="transition-all duration-150"
                />
                {/* Inner dot */}
                <circle cx={x} cy={y} r={isHovered ? 3.5 : 2} fill="#FFFFFF" />

                {/* Bottom X-axis label (date or index) */}
                <text
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-500 font-mono"
                >
                  {p.date ? p.date.slice(5) : `T${idx + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-navy text-white p-2.5 rounded-xl shadow-lg border border-navy-light text-xs pointer-events-none z-10 space-y-1 animate-in fade-in duration-150">
            <div className="font-semibold text-white flex items-center justify-between gap-3">
              <span className="truncate max-w-[160px]">{hoveredPoint.title}</span>
              <span className="text-teal-light font-bold">
                {hoveredPoint.scoreNorm20} / 20
              </span>
            </div>
            <div className="text-[10px] text-white/70 flex items-center gap-2">
              <span>{hoveredPoint.date || 'Date non précisée'}</span>
              <span>•</span>
              <span className="capitalize">{hoveredPoint.type}</span>
            </div>
            {hoveredPoint.maxScore !== 20 && (
              <div className="text-[10px] text-white/50">
                Note brute : {hoveredPoint.rawScore} / {hoveredPoint.maxScore}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal" />
            Progression globale
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 border-b border-dashed" />
            Seuil de validation (10/20)
          </span>
        </div>
        <span className="font-mono text-[10px]">
          {points.length} évaluation{points.length > 1 ? 's' : ''} comptabilisée{points.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
