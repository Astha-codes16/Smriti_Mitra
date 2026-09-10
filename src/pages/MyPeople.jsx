import { useEffect, useState } from 'react';
import { family } from '../data/demoData';
import { speak } from '../services/voiceService';

const familyDetails = {
  Anita: {
    relationship: 'Your Daughter',
    description: 'Anita is your loving daughter. She often calls you in the evening.',
    speech: 'This is Anita. She is your daughter. Anita often calls you in the evening.',
    memory: 'She brings warmth and conversation to your evenings.',
    color: 'coral',
  },
  Rahul: {
    relationship: 'Your Son',
    description: 'Rahul is your son. He helps take care of you and visits whenever possible.',
    speech: 'This is Rahul. He is your son. He helps take care of you and visits whenever possible.',
    memory: 'Rahul is always ready to lend a helping hand.',
    color: 'blue',
  },
  Sita: {
    relationship: 'Your Wife',
    description: 'Sita is your wife and has shared many beautiful memories with you.',
    speech: 'This is Sita. She is your wife. She has shared many beautiful memories with you.',
    memory: 'You and Sita have built a beautiful life together.',
    color: 'gold',
  },
};

const memories = [
  { icon: '🏡', title: 'Family Home', description: 'Our home where we shared many memories.', color: 'cream' },
  { icon: '🎉', title: 'Family Celebration', description: 'A beautiful day with your family.', color: 'coral' },
  { icon: '🌳', title: 'Evening Walk', description: 'A peaceful walk together.', color: 'sage' },
];

export default function MyPeople({ initialPerson }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [rememberedPeople, setRememberedPeople] = useState([]);
  const [recognitionMessage, setRecognitionMessage] = useState('');

  useEffect(() => {
    const person = family.find((item) => item.name === initialPerson);
    if (person) openPerson(person);
  }, [initialPerson]);

  function openPerson(person) {
    setSelectedPerson(person);
    setRecognitionMessage('');
  }

  function closePerson() {
    setSelectedPerson(null);
    setRecognitionMessage('');
  }

  function listenToPerson(person) {
    speak(familyDetails[person.name].speech);
  }

  function rememberPerson(person) {
    setRememberedPeople((current) => current.includes(person.name) ? current : [...current, person.name]);
    setRecognitionMessage(`Wonderful. You remembered ${person.name}.`);
  }

  return (
    <div className="people-memory-page page-enter">
      <header className="people-memory-heading">
        <div>
          <span className="people-title-icon" aria-hidden="true">❤️</span>
          <div><span className="eyebrow">Your family memory</span><h1>MY PEOPLE</h1><p>These are the people who love and care for you.</p></div>
        </div>
        <span className="people-heading-note">You are never alone <span>♡</span></span>
      </header>

      <section className="family-memory-intro">
        <div><span className="eyebrow">Familiar faces</span><h2>People close to your heart</h2><p>Tap a face to remember them, hear their story, or tell MindMate you remember.</p></div>
        <span className="family-count">{family.length} loved ones</span>
      </section>

      <section className="family-member-grid" aria-label="Family members">
        {family.map((person) => {
          const detail = familyDetails[person.name];
          const remembered = rememberedPeople.includes(person.name);
          return <button className={`family-memory-card family-card-${detail.color}`} type="button" key={person.name} onClick={() => openPerson(person)}>
            <div className="family-photo family-photo-card"><span>{person.initials}</span><i aria-hidden="true">✦</i></div>
            <div className="family-card-copy"><span className="family-heart" aria-hidden="true">❤️</span><h2>{person.name}</h2><strong>Your {person.relationship.toLowerCase()}</strong><p>{detail.description}</p></div>
            <span className={`memory-status ${remembered ? 'memory-status-remembered' : ''}`}>{remembered ? '✓ Remembered' : 'Tap to know them'} <b>→</b></span>
          </button>;
        })}
      </section>

      <section className="recognition-card">
        <div className="recognition-symbol" aria-hidden="true">♡</div>
        <div><span className="eyebrow">A gentle memory activity</span><h2>Who is someone you love?</h2><p>Choose a family member above and practice remembering their name.</p></div>
        <span className="recognition-progress">{rememberedPeople.length} of {family.length} remembered</span>
      </section>

      <section className="special-memories-section">
        <div className="people-section-heading"><div><span className="eyebrow">Moments worth keeping</span><h2>📸 SPECIAL MEMORIES</h2></div><span>Little pieces of a beautiful life</span></div>
        <div className="special-memory-grid">{memories.map((memory) => <div className={`special-memory-card memory-${memory.color}`} key={memory.title}><div className="memory-image" aria-hidden="true"><span>{memory.icon}</span></div><div><h3>{memory.title}</h3><p>{memory.description}</p></div></div>)}</div>
      </section>

      {selectedPerson && <div className="people-detail-backdrop" role="presentation" onClick={closePerson}><div className="people-detail-modal" role="dialog" aria-modal="true" aria-labelledby="person-detail-name" onClick={(event) => event.stopPropagation()}><button className="people-modal-close" type="button" onClick={closePerson} aria-label="Close family member details">×</button><div className={`family-photo family-photo-large family-photo-${familyDetails[selectedPerson.name].color}`}><span>{selectedPerson.initials}</span><i aria-hidden="true">✦</i></div><span className="eyebrow">Someone very special</span><h2 id="person-detail-name">{selectedPerson.name}</h2><strong className="detail-relationship">❤️ {familyDetails[selectedPerson.name].relationship}</strong><p className="detail-description"><b>This is {selectedPerson.name}, {familyDetails[selectedPerson.name].relationship.toLowerCase()}.</b><br />{familyDetails[selectedPerson.name].description.split('. ').slice(1).join('. ')}</p><p className="detail-memory">{familyDetails[selectedPerson.name].memory}</p><div className="detail-actions"><button className="listen-person-button" type="button" onClick={() => listenToPerson(selectedPerson)}>🔊 LISTEN</button><button className={`remember-button ${rememberedPeople.includes(selectedPerson.name) ? 'remember-button-active' : ''}`} type="button" onClick={() => rememberPerson(selectedPerson)}>{rememberedPeople.includes(selectedPerson.name) ? '✓ I Remember' : '❤️ I Remember'}</button></div>{recognitionMessage && <div className="recognition-message" role="status">{recognitionMessage}</div>}</div></div>}
    </div>
  );
}