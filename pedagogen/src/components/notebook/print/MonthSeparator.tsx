interface MonthSeparatorProps {
  label: string; // e.g. "Septembre 2026"
  colSpan?: number;
}

export function MonthSeparator({ label, colSpan = 6 }: MonthSeparatorProps) {
  return (
    <tr className="border-y-2 border-black bg-black/5 avoid-break">
      <td
        colSpan={colSpan}
        className="px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-black font-serif"
      >
        — {label} —
      </td>
    </tr>
  );
}
