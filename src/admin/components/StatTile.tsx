export function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-stat-tile">
      <span className="mono-label">{label}</span>
      <span className="admin-stat-tile__value">{value}</span>
    </div>
  );
}
