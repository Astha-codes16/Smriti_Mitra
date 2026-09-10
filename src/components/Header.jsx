import { useEffect, useState } from 'react';
import { patient } from '../data/demoData';

function formatDate(date) {
	return new Intl.DateTimeFormat('en-IN', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	}).format(date);
}

function formatTime(date) {
	return new Intl.DateTimeFormat('en-IN', {
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

export default function Header({ mode, onMenuClick }) {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), 30000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<header className="topbar">
			<button className="mobile-menu" type="button" onClick={onMenuClick} aria-label="Open navigation">
				<span />
				<span />
				<span />
			</button>
			<div className="topbar-date">
				<span className="eyebrow">{mode === 'patient' ? 'Your day' : 'Care team view'}</span>
				<strong>{formatDate(now)}</strong>
			</div>
			<div className="topbar-profile">
				<div className="avatar avatar-small">RK</div>
				<div>
					<strong>{patient.shortName}</strong>
					<span>{formatTime(now)}</span>
				</div>
			</div>
		</header>
	);
}
