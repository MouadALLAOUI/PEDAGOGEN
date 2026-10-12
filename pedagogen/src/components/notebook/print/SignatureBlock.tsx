interface SignatureBlockProps {
  teacherName?: string;
  className?: string;
}

export function SignatureBlock({ teacherName }: SignatureBlockProps) {
  return (
    <div className="mt-8 pt-4 avoid-break text-black">
      <div className="grid grid-cols-2 gap-6">
        {/* Teacher box */}
        <div className="border border-black p-4 min-h-[120px] flex flex-col justify-between bg-white">
          <div className="font-bold text-xs uppercase tracking-wider border-b border-black/40 pb-1.5 flex items-center justify-between">
            <span>Signature de l'enseignant(e)</span>
            {teacherName && (
              <span className="text-[11px] font-medium text-black/80">{teacherName}</span>
            )}
          </div>
          <div className="text-[11px] text-black/70 mt-1">
            Date : ........................................
          </div>
          <div className="text-[10px] text-black/40 italic text-right mt-6">
            Signature & Émargement
          </div>
        </div>

        {/* Director / Inspector Visa box */}
        <div className="border border-black p-4 min-h-[120px] flex flex-col justify-between bg-white">
          <div className="font-bold text-xs uppercase tracking-wider border-b border-black/40 pb-1.5">
            Visa de la Direction / de l'Inspection
          </div>
          <div className="text-[11px] text-black/70 mt-1">
            Vu le : ........................................
          </div>
          <div className="text-[10px] text-black/40 italic text-right mt-6">
            Cachet et Signature de l'établissement
          </div>
        </div>
      </div>
    </div>
  );
}
