import LargeCard from '../components/LargeCard';
import PatientHeader from '../components/PatientHeader';
import VoiceAssistant from '../components/VoiceAssistant';
import { family, schedule } from '../data/demoData';

const quickActions = [
  { id: 'my-day', icon: '▦', title: 'My Day', description: 'See what is next', accent: 'cream' },
  { id: 'memory-games', icon: '◈', title: 'Play Memory Game', description: 'Keep your mind active', accent: 'blue' },
  { id: 'my-people', icon: '♧', title: 'My People', description: 'Call someone you love', accent: 'coral' },
  { id: 'object-finder', icon: '⌕', title: 'Find My Things', description: 'Find an item nearby', accent: 'gold' },
  { id: 'mood-check', icon: '☺', title: 'Mood Check', description: 'Share how you feel', accent: 'lavender' },
  { id: 'comfort-zone', icon: '♫', title: 'Comfort Zone', description: 'Music and calm moments', accent: 'sage' },
];

export default function Home({ navigate, listening, onVoiceToggle }) {
  return (
    <div className="home-page page-enter">
      <PatientHeader />

      <section className="hero-grid">
        <div className="now-card">
          <div className="section-heading"><span className="eyebrow">What’s happening now?</span><span className="status-pill"><span /> Ready for you</span></div>
          <div className="now-content">
            <div className="brain-illustration"><span>✦</span><div className="brain-lines">≈ ≈<br /> ≈ ≈</div></div>
            <div><span className="now-kicker">Brain activity</span><h2>Let’s exercise<br />your memory!</h2><p>A small moment for your mind can make a big difference.</p></div>
          </div>
          <button className="primary-button" type="button" onClick={() => navigate('memory-games')}>Start activity <span>→</span></button>
        </div>
        <VoiceAssistant listening={listening} onToggle={onVoiceToggle} />
      </section>

      <section className="quick-section">
        <div className="section-heading"><div><span className="eyebrow">At your fingertips</span><h2>What would you like to do?</h2></div><span className="soft-label">Choose one to begin</span></div>
        <div className="quick-grid">
          {quickActions.map((action) => <LargeCard key={action.id} {...action} onClick={() => navigate(action.id)} />)}
        </div>
      </section>

      <section className="home-bottom-grid">
        <div className="today-card">
          <div className="section-heading"><div><span className="eyebrow">A little look ahead</span><h2>Today with MindMate</h2></div><button className="text-button" type="button" onClick={() => navigate('my-day')}>View full day <span>→</span></button></div>
          <div className="timeline-row"><span className="timeline-mark done">✓</span><div><strong>Breakfast</strong><span>Completed this morning</span></div><span className="timeline-time">8:00 AM</span></div>
          <div className="timeline-row current"><span className="timeline-mark">✦</span><div><strong>{schedule.current}</strong><span>Your next gentle activity</span></div><span className="timeline-time">Now</span></div>
          <div className="timeline-row"><span className="timeline-mark upcoming">○</span><div><strong>{schedule.upcoming[0]}</strong><span>Coming up later</span></div><span className="timeline-time">10:30 AM</span></div>
        </div>
        <div className="people-card">
          <div className="section-heading"><div><span className="eyebrow">Your people</span><h2>Always close by</h2></div><button className="icon-button" type="button" aria-label="View all people" onClick={() => navigate('my-people')}>→</button></div>
          <div className="family-stack">{family.map((person) => <div className="family-person" key={person.name}><div className={`avatar avatar-${person.color}`}>{person.initials}</div><div><strong>{person.name}</strong><span>{person.relationship}</span></div><span className="call-dot">⌕</span></div>)}</div>
        </div>
      </section>
    </div>
  );
}