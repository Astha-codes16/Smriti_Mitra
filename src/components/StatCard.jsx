export default function StatCard({ label, value, detail, icon, accent = 'sage' }) {
	return (
		<div className={`stat-card stat-${accent}`}>
			<div className="stat-icon" aria-hidden="true">{icon}</div>
			<div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
		</div>
	);
}
