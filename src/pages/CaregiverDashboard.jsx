import { useMemo, useState } from 'react';
import { patient } from '../data/demoData';
import { getStoredState, saveStoredState } from '../services/storageService';

const demoPerformance = [82, 75, 88, 80, 85, 78, 84];
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const demoRoutine = [
  { label: 'Breakfast', status: 'completed', icon: '🍳' },
  { label: 'Morning Medicine', status: 'completed', icon: '💊' },
  { label: 'Memory Game', status: 'completed', icon: '🧠' },
  { label: 'Evening Walk', status: 'upcoming', icon: '🚶' },
  { label: 'Evening Medicine', status: 'pending', icon: '🌙' },
];

function average(values) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }

function Donut({ value, color = '#6d9a7a' }) {
  return <div className="care-donut" style={{ '--donut-value': `${value * 3.6}deg`, '--donut-color': color }}><div><strong>{value}%</strong><small>overall</small></div></div>;
}

function LineChart({ values }) {
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - value}`).join(' ');
  return <div className="care-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Weekly cognitive accuracy chart"><path d="M 0 20 H 100 M 0 50 H 100 M 0 80 H 100" className="chart-grid-line" /><polyline points={points} className="chart-line" /></svg><div className="chart-labels">{days.map((day) => <span key={day}>{day}</span>)}</div></div>;
}

export default function CaregiverDashboard() {
  const stored = getStoredState();
  const [routine, setRoutine] = useState(stored.routine || demoRoutine);
  const [message, setMessage] = useState('');
  const [showRoutineEditor, setShowRoutineEditor] = useState(false);
  const performance = (stored.gamePerformance || []).map((item) => item.accuracy).filter(Boolean);
  const accuracyValues = performance.length >= 3 ? performance.slice(-7) : demoPerformance;
  const voiceHistory = stored.voiceHistory || [];
  const moodHistory = stored.moodHistory || [{ mood: 'happy' }, { mood: 'happy' }, { mood: 'okay' }, { mood: 'sad' }, { mood: 'happy' }];
  const moodCounts = moodHistory.reduce((counts, item) => ({ ...counts, [item.mood]: (counts[item.mood] || 0) + 1 }), {});
  const completedRoutine = routine.filter((item) => item.status === 'completed').length;
  const successfulCommands = voiceHistory.filter((item) => item.success).length;
  const mostUsed = voiceHistory.length ? voiceHistory.reduce((counts, item) => ({ ...counts, [item.command]: (counts[item.command] || 0) + 1 }), {}) : {};
  const topCommand = Object.entries(mostUsed).sort((a, b) => b[1] - a[1])[0]?.[0] || 'What should I do now?';
  const insight = completedRoutine < routine.length / 2 ? 'Daily routine completion is lower than usual. Consider checking in.' : moodCounts.sad + (moodCounts.worried || 0) > 2 ? 'Recent mood check-ins may benefit from additional family interaction.' : 'Memory game performance has remained stable recently.';
  const alerts = [
    { type: 'positive', icon: '🟢', text: 'Memory activity completed today.' },
    { type: completedRoutine < routine.length ? 'attention' : 'positive', icon: completedRoutine < routine.length ? '🟡' : '🟢', text: completedRoutine < routine.length ? 'Evening medicine is still pending.' : 'Today’s routine is complete.' },
    { type: 'change', icon: '🟠', text: 'Activity pattern is being observed over time.' },
  ];

  function showMessage(text) { setMessage(text); window.setTimeout(() => setMessage(''), 3500); }
  function toggleRoutine(index) {
    const next = routine.map((item, itemIndex) => itemIndex === index ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' } : item);
    setRoutine(next);
    saveStoredState({ ...getStoredState(), routine: next });
  }

  return <div className="care-dashboard page-enter">
    <header className="care-dashboard-heading"><div><span className="eyebrow">👨‍👩‍👧 Care circle</span><h1>CAREGIVER DASHBOARD</h1><p>Good evening, Rahul 👋 · A calm overview of {patient.shortName}&apos;s day.</p></div><span className="care-live"><span /> Active today</span></header>
    <section className="care-patient-banner"><div className="care-patient-avatar">RK</div><div><span className="eyebrow">Patient overview</span><h2>Ramesh Sharma</h2><p>Age 72 · Guwahati, Assam</p></div><div className="patient-status"><span>🟢</span><strong>Active Today</strong><small>Last Activity · Memory Game · 10 minutes ago</small></div><div className="care-date">Today<br /><b>Evening check-in</b></div></section>

    <section className="care-section"><div className="care-section-title"><div><span className="eyebrow">At a glance</span><h2>TODAY&apos;S OVERVIEW</h2></div></div><div className="care-metric-grid"><div className="care-metric metric-blue"><span>🧠</span><small>Cognitive Activity</small><strong>{average(accuracyValues)}%</strong><em>steady engagement</em></div><div className="care-metric metric-coral"><span>😊</span><small>Mood</small><strong>{getMoodLabel(moodHistory[moodHistory.length - 1]?.mood)}</strong><em>last check-in today</em></div><div className="care-metric metric-sage"><span>📅</span><small>Routine</small><strong>{completedRoutine} / {routine.length}</strong><em>completed today</em></div><div className="care-metric metric-gold"><span>💊</span><small>Medicine</small><strong>1 / 2</strong><em>confirmed today</em></div><div className="care-metric metric-lavender"><span>🎙️</span><small>Voice Commands</small><strong>{voiceHistory.length || 12}</strong><em>today</em></div></div></section>

    <section className="care-section care-alert-section"><div className="care-section-title"><div><span className="eyebrow">Keep gently aware</span><h2>🚨 ATTENTION &amp; ALERTS</h2></div><span className="care-muted">Observations, not diagnoses</span></div><div className="care-alert-list">{alerts.map((alert) => <div className={`care-alert care-alert-${alert.type}`} key={alert.text}><span>{alert.icon}</span><strong>{alert.text}</strong><small>Today · MindMate</small></div>)}</div></section>

    <div className="care-two-column"><section className="care-section care-panel-modern"><div className="care-section-title"><div><span className="eyebrow">Memory activity</span><h2>🧠 COGNITIVE PERFORMANCE</h2></div><Donut value={average(accuracyValues)} /></div><div className="care-stats-row"><span><b>{performance.length || 6}</b> Games played</span><span><b>{average(accuracyValues)}%</b> Average accuracy</span><span><b>6m</b> Avg. session</span></div><LineChart values={accuracyValues} /></section><section className="care-section care-panel-modern"><div className="care-section-title"><div><span className="eyebrow">Emotional check-ins</span><h2>😊 EMOTIONAL WELL-BEING</h2></div></div><div className="mood-distribution">{[['happy', '😊', 'Happy'], ['okay', '😐', 'Okay'], ['sad', '😔', 'Sad'], ['worried', '😟', 'Worried']].map(([id, icon, label]) => <div key={id}><span>{icon}</span><strong>{label}</strong><div><i style={{ width: `${Math.max(10, ((moodCounts[id] || 0) / Math.max(moodHistory.length, 1)) * 100)}%` }} /></div><b>{moodCounts[id] || 0}</b></div>)}</div><p className="care-insight">Recent mood check-ins have been mostly positive.</p></section></div>

    <div className="care-two-column"><section className="care-section care-panel-modern"><div className="care-section-title"><div><span className="eyebrow">Simple daily rhythm</span><h2>📅 TODAY&apos;S ROUTINE</h2></div><button className="care-small-action" type="button" onClick={() => setShowRoutineEditor(!showRoutineEditor)}>✎ Update</button></div><div className="routine-list">{routine.map((item, index) => <button type="button" className="routine-line" key={item.label} onClick={() => showRoutineEditor && toggleRoutine(index)}><span>{item.icon}</span><strong>{item.label}</strong><em className={`routine-status routine-${item.status}`}>{item.status === 'completed' ? '✅ Completed' : item.status === 'upcoming' ? '🔔 Upcoming' : '⏳ Pending'}</em></button>)}</div>{showRoutineEditor && <small className="editor-note">Tap an item to update its status.</small>}</section><section className="care-section care-panel-modern"><div className="care-section-title"><div><span className="eyebrow">Daily confirmation</span><h2>💊 MEDICINE ADHERENCE</h2></div><span className="adherence-score">85%</span></div><div className="adherence-big"><strong>1 / 2</strong><span>doses confirmed today</span></div><div className="adherence-bar"><i style={{ width: '50%' }} /></div><p className="care-note">🟡 Evening medicine confirmation was missed or is still pending.</p></section></div>

    <div className="care-three-column"><section className="care-section care-panel-modern"><div className="care-section-title"><div><span className="eyebrow">Voice-first support</span><h2>🎙️ VOICE INTERACTION</h2></div></div><div className="voice-care-big">{voiceHistory.length || 12}<small>commands today</small></div><p className="care-pair"><span>Most used</span><b>&quot;{topCommand}&quot;</b></p><p className="care-pair"><span>Success rate</span><b>{voiceHistory.length ? Math.round((successfulCommands / voiceHistory.length) * 100) : 92}%</b></p></section><section className="care-section care-panel-modern"><div className="care-section-title"><div><span className="eyebrow">Close connections</span><h2>❤️ FAMILY CONNECTION</h2></div></div><div className="family-care-big">❤️ <strong>3</strong><span>family moments today</span></div><div className="care-pair"><span>Last interaction</span><b>Rahul · Today at 5:30 PM</b></div><button className="care-outline-button" type="button" onClick={() => showMessage('A call reminder is ready for Rahul.')}>📞 Check in with Ramesh</button></section><section className="care-insight-card"><span>🧠</span><span className="eyebrow">MindMate observation</span><h2>MINDMATE INSIGHT</h2><p>{insight}</p><small>Based on recent activity patterns.</small></section></div>

    <section className="care-section quick-action-panel"><div className="care-section-title"><div><span className="eyebrow">For the care circle</span><h2>🚨 QUICK ACTIONS</h2></div></div><div className="care-quick-actions"><button type="button" onClick={() => window.location.href = 'tel:+919876543210'}>📞 Call Patient</button><button type="button" onClick={() => showMessage('Reminder sent to Ramesh’s My Day.')}>🔔 Send Reminder</button><button type="button" onClick={() => showMessage('A warm encouragement is ready for Ramesh.')}>💬 Send Encouragement</button><button type="button" onClick={() => setShowRoutineEditor(true)}>📅 Update Routine</button></div></section>
    {message && <div className="care-dashboard-toast" role="status">✅ {message}</div>}
  </div>;
}

function getMoodLabel(mood) { return { happy: '😊 Happy', okay: '😐 Okay', sad: '😔 Sad', worried: '😟 Worried' }[mood] || '😊 Happy'; }