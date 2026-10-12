interface PrintHeaderProps {
  teacherName?: string;
  school?: string;
  subject?: string;
  academicYear?: string;
  aref?: string;
  direction?: string;
  className?: string; // Specific class name for 'Par classe' layout
  level?: string;
  compact?: boolean;
}

export function PrintHeader({
  teacherName,
  school,
  subject,
  academicYear,
  aref,
  direction,
  className,
  level,
  compact = false,
}: PrintHeaderProps) {
  if (compact) {
    return (
      <header className="border-b border-black/40 pb-2 mb-4 text-[10px] text-black flex items-center justify-between">
        <div className="font-semibold truncate">
          Cahier de Textes • {teacherName || 'Enseignant'} • {subject || 'Matière'}
        </div>
        <div className="text-right truncate">
          {className ? `${className} • ` : ''}
          {academicYear ? `A.S. ${academicYear}` : ''}
        </div>
      </header>
    );
  }

  return (
    <header className="border border-black text-black p-4 mb-6 bg-white avoid-break">
      {/* Top Ministry & Kingdom Header */}
      <div className="grid grid-cols-3 items-center border-b border-black pb-3 mb-3 text-[10px] leading-tight">
        {/* Left: French Administration */}
        <div className="space-y-0.5">
          <p className="font-bold uppercase tracking-wider text-[9px]">Royaume du Maroc</p>
          <p className="font-medium text-[9px]">Ministère de l'Éducation Nationale,</p>
          <p className="text-[9px]">du Préscolaire et des Sports</p>
          {aref && <p className="text-[9px]">AREF : {aref}</p>}
          {direction && <p className="text-[9px]">Dir. Prov. : {direction}</p>}
        </div>

        {/* Center: Official Title */}
        <div className="text-center space-y-1">
          <div className="text-xs font-bold font-arabic tracking-wide">المملكة المغربية</div>
          <h1 className="text-base font-extrabold tracking-wider uppercase border-y border-black/80 py-1 font-serif">
            CAHIER DE TEXTES
          </h1>
          <div className="text-[11px] font-bold font-arabic text-black/90">
            دفتر النصوص والأنشطة التربوية
          </div>
        </div>

        {/* Right: Arabic Administration */}
        <div className="text-right font-arabic space-y-0.5 text-[10px]" dir="rtl">
          <p className="font-bold">وزارة التربية الوطنية والتعليم الأولي والرياضة</p>
          {aref && <p>الأكاديمية الجهوية: {aref}</p>}
          {direction && <p>المديرية الإقليمية: {direction}</p>}
        </div>
      </div>

      {/* Teacher, School & Class Information Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
        <div>
          <span className="text-[10px] uppercase font-bold text-black/70 block">Établissement</span>
          <span className="font-semibold text-black">{school || 'Collège'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-black/70 block">Année scolaire</span>
          <span className="font-semibold text-black">{academicYear || '2025 - 2026'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-black/70 block">Enseignant(e)</span>
          <span className="font-semibold text-black">{teacherName || '—'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-black/70 block">Matière</span>
          <span className="font-semibold text-black">{subject || '—'}</span>
        </div>
      </div>

      {className && (
        <div className="mt-3 pt-2.5 border-t border-black/30 flex items-center justify-between text-xs font-bold">
          <div>
            <span className="uppercase text-[10px] text-black/70 mr-1.5">Classe :</span>
            <span className="text-sm bg-black/5 px-2 py-0.5 rounded border border-black/20">
              {className} {level ? `(${level})` : ''}
            </span>
          </div>
          <div className="text-[11px] text-black/70 font-normal">
            Section spécifique pour classeur pédagogique
          </div>
        </div>
      )}
    </header>
  );
}
