// Marks a card whose data is still sample data (no real source connected yet).
export function SampleBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      title="Este bloco ainda usa dados de exemplo"
      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
    >
      Exemplo
    </span>
  );
}
