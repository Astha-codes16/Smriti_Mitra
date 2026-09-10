import { useState } from 'react';
import { patient } from '../data/demoData';
import { useVoice } from '../context/VoiceContext';

const completedActivities = [
  { icon: '🍳', name: 'Breakfast', time: 'Completed at 8:00 AM' },
  { icon: '💊', name: 'Morning Medicine', time: 'Taken at 9:00 AM' },
];

const upcomingActivities = [
  { icon: '💧', name: 'Drink Water', time: '2:00 PM', detail: 'A refreshing glass of water will help you feel your best.' },
  { icon: '🚶', name: 'Evening Walk', time: '5:00 PM', detail: 'A gentle walk around the neighborhood can be a lovely part of your evening.' },
  { icon: '📞', name: 'Call Anita', time: '7:00 PM', detail: 'Anita will be happy to hear your voice this evening.' },
];

export default function MyDay({ navigate }) {
  const { isListening: listening, startListening: onVoiceToggle } = useVoice();
  const [reminderShown, setReminderShown] = useState(false);
  const [brainCompleted, setBrainCompleted] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const completedCount = brainCompleted ? 4 : 3;

  function remindLater() {
    setReminderShown(true);
    window.setTimeout(() => setReminderShown(false), 3500);
  }

  return (
    <div className="my-day-page page-enter">
      <header className="my-day-heading">
        <div><span className="my-day-title-icon" aria-hidden="true">📅</span><div><span className="eyebrow">My day</span><h1>Let&apos;s see how your day is going, {patient.shortName}.</h1></div></div>
        <span className="day-reassurance">One moment at a time <span>♡</span></span>
      </header>

      <section className="my-day-progress" aria-label="Today's progress">
        <div><span className="eyebrow">Today&apos;s progress</span><strong>{completedCount} of 5 daily activities completed</strong></div>
        <div className="progress-dots" aria-label={`${completedCount} of 5 activities completed`}>
          {[0, 1, 2, 3, 4].map((dot) => <span className={dot < completedCount ? 'progress-dot-filled' : ''} key={dot} />)}
        </div>
      </section>

      <section className="my-day-section">
        <div className="my-day-section-heading"><div><span className="section-number">01</span><div><span className="eyebrow">Done today</span><h2>✅ DONE TODAY</h2></div></div><span className="section-caption">You&apos;ve made a good start</span></div>
        <div className="completed-grid">{completedActivities.map((activity) => <div className="completed-activity" key={activity.name}><span className="activity-icon">{activity.icon}</span><div><strong>{activity.name}</strong><span>{activity.time}</span></div><span className="completed-check">✓</span></div>)}</div>
      </section>

      <section className="my-day-section now-section">
        <div className="my-day-section-heading"><div><span className="section-number">02</span><div><span className="eyebrow">Your next gentle step</span><h2>⭐ HAPPENING NOW</h2></div></div><span className="section-caption">No rush, just begin</span></div>
        <div className="happening-card">
          <div className="happening-art" aria-hidden="true">🧠</div>
          <div className="happening-copy"><span className="now-kicker">Brain Activity</span><h3>Let&apos;s exercise your memory!</h3><p>A short, cheerful activity to keep your mind active and bright.</p><div className="happening-actions"><button className="primary-button" type="button" onClick={() => navigate('memory-games')}>▶ Start activity <span>→</span></button><button className={`done-button ${brainCompleted ? 'done-button-active' : ''}`} type="button" onClick={() => setBrainCompleted(true)}>{brainCompleted ? '✓ Activity completed' : 'Mark as done'}</button></div></div>
          <div className="ask-prompt"><span>🎙️</span><div><strong>You can ask:</strong><span>&quot;What should I do now?&quot;</span></div></div>
        </div>
      </section>

      <section className="my-day-section coming-section">
        <div className="my-day-section-heading"><div><span className="section-number">03</span><div><span className="eyebrow">A little later</span><h2>⏳ COMING UP</h2></div></div><span className="section-caption">Tap an activity for details</span></div>
        <div className="upcoming-list">{upcomingActivities.map((activity, index) => <button className="upcoming-activity" type="button" key={activity.name} onClick={() => setSelectedActivity(activity)}><span className="timeline-line" /><span className="activity-icon">{activity.icon}</span><div><strong>{activity.name}</strong><span>{activity.time}</span></div><span className="upcoming-arrow">→</span></button>)}</div>
      </section>

      <section className="my-day-bottom-grid">
        <div className="medicine-card"><div className="my-day-section-heading"><div><span className="eyebrow">Medicine status</span><h2>💊 MEDICINE STATUS</h2></div><span className="medicine-heart">♡</span></div><div className="medicine-rows"><div><span>Morning Medicine</span><strong className="taken-status">✅ Taken</strong></div><div><span>Next Medicine</span><strong>🌙 9:00 PM</strong></div></div><button className="reminder-button" type="button" onClick={remindLater}>🔔 Remind me later</button></div>
        <div className={`my-day-voice-card ${listening ? 'my-day-voice-listening' : ''}`}><span className="voice-card-icon">🎙️</span><div><span className="eyebrow">Voice-first support</span><h2>{listening ? "I'm listening..." : 'ASK MINDMATE'}</h2><p>{listening ? 'Tell me what you need.' : 'You can speak instead of typing.'}</p></div><button type="button" onClick={onVoiceToggle} aria-label={listening ? 'Stop asking MindMate' : 'Ask MindMate'}>{listening ? '■' : '🎙️'}</button></div>
      </section>

      {reminderShown && <div className="my-day-toast" role="status">✅ Okay {patient.shortName}, I will remind you again.</div>}
      {selectedActivity && <div className="my-day-modal-backdrop" role="presentation" onClick={() => setSelectedActivity(null)}><div className="my-day-modal" role="dialog" aria-modal="true" aria-labelledby="activity-modal-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedActivity(null)} aria-label="Close activity details">×</button><span className="modal-icon">{selectedActivity.icon}</span><span className="eyebrow">Coming up at {selectedActivity.time}</span><h2 id="activity-modal-title">{selectedActivity.name}</h2><p>{selectedActivity.detail}</p><button className="primary-button" type="button" onClick={() => setSelectedActivity(null)}>Okay, got it</button></div></div>}
    </div>
  );
}