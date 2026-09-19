import { caregiverNavigation, patientNavigation } from '../data/demoData';

export default function Sidebar({ mode, activeScreen, onNavigate, onModeChange, isOpen, onClose }) {
	const navigation = mode === 'patient' ? patientNavigation : caregiverNavigation;

	function handleNavigate(screen) {
		onNavigate(screen);
		onClose?.();
	}

	return (
		<>
			<aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
				<div className="brand">
					<div className="brand-mark">M</div>
					<div>
						<strong>SmritiMitra</strong>
						<span>memory support</span>
					</div>
				</div>

				<div className="mode-switcher" aria-label="Choose application mode">
					<button className={mode === 'patient' ? 'mode-active' : ''} type="button" onClick={() => onModeChange('patient')}>
						<span>●</span> Patient
					</button>
					<button className={mode === 'caregiver' ? 'mode-active' : ''} type="button" onClick={() => onModeChange('caregiver')}>
						<span>◌</span> Caregiver
					</button>
				</div>

				<nav className="main-nav" aria-label={`${mode} navigation`}>
					<span className="nav-label">{mode === 'patient' ? 'For Ramesh' : 'Care circle'}</span>
					{navigation.map((item) => (
						<button
							className={`nav-item ${activeScreen === item.id ? 'nav-item-active' : ''}`}
							key={item.id}
							type="button"
							onClick={() => handleNavigate(item.id)}
						>
							<span className="nav-icon" aria-hidden="true">{item.icon}</span>
							<span>{item.label}</span>
							{activeScreen === item.id && <span className="nav-dot" />}
						</button>
					))}
				</nav>

				<div className="sidebar-footer">
					<div className="comfort-note">
						<span className="sun-icon">☼</span>
						<div><strong>Take it easy</strong><span>You are doing well today.</span></div>
					</div>
					<span className="version">SmritiMitra MVP · 2026</span>
				</div>
			</aside>
			{isOpen && <button className="sidebar-overlay" type="button" aria-label="Close navigation" onClick={onClose} />}
		</>
	);
}
