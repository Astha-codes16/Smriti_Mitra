export default function LargeCard({ icon, title, description, onClick, accent = 'cream', className = '' }) {
  return (
    <button className={`large-card card-${accent} ${className}`} type="button" onClick={onClick}>
      <span className="large-card-icon" aria-hidden="true">{icon}</span>
      <span className="large-card-copy">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </span>
      <span className="card-arrow" aria-hidden="true">→</span>
    </button>
  );
}