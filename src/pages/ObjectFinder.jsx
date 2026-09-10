import { useEffect, useState } from 'react';
import { patient } from '../data/demoData';
import { speak } from '../services/voiceService';
import { useVoice } from '../context/VoiceContext';

const defaultObjects = [
  { id: 'glasses', name: 'Glasses', icon: '👓', location: 'Bedside Table', resultVerb: 'ARE', sentenceLocation: 'are on the bedside table', locationIcon: '🛏️', aliases: ['glasses', 'spectacles', 'chashma'], color: 'blue' },
  { id: 'walking-stick', name: 'Walking Stick', icon: '🦯', location: 'Near the Main Door', resultVerb: 'IS', sentenceLocation: 'is near the main door', locationIcon: '🚪', aliases: ['walking stick', 'stick', 'cane'], color: 'sage' },
  { id: 'medicine', name: 'Medicine', icon: '💊', location: 'Kitchen Shelf', resultVerb: 'IS', sentenceLocation: 'is on the kitchen shelf', locationIcon: '🍽️', aliases: ['medicine', 'medicines', 'tablet', 'tablets', 'medication'], color: 'coral' },
  { id: 'phone', name: 'Phone', icon: '📱', location: 'Living Room Table', resultVerb: 'IS', sentenceLocation: 'is on the living room table', locationIcon: '🛋️', aliases: ['phone', 'mobile', 'mobile phone'], color: 'gold' },
  { id: 'keys', name: 'Keys', icon: '🔑', location: 'Near Your Bag', resultVerb: 'ARE', sentenceLocation: 'are near your bag', locationIcon: '👜', aliases: ['keys', 'key'], color: 'lavender' },
];

export function findObject(query, objects = defaultObjects) {
  const normalizedQuery = query.toLowerCase();
  return objects.find((object) => object.aliases.some((alias) => normalizedQuery.includes(alias))) || null;
}

function getResultSentence(object) {
  return `Your ${object.name.toLowerCase()} ${object.sentenceLocation}.`;
}

export default function ObjectFinder({ initialObject }) {
  const { isListening: listening, startListening } = useVoice();
  const [objects, setObjects] = useState(defaultObjects);
  const [query, setQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState(null);
  const [recentObjects, setRecentObjects] = useState([]);
  const [unknownQuery, setUnknownQuery] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newThing, setNewThing] = useState({ name: '', location: '' });

  useEffect(() => {
    if (initialObject) {
      const object = findObject(initialObject, objects);
      if (object) {
        searchForObject(initialObject);
        speak(getResultSentence(object));
      }
    }
  }, [initialObject]);

  function rememberSearch(object) {
    setRecentObjects((current) => [object, ...current.filter((item) => item.id !== object.id)].slice(0, 3));
  }

  function showObject(object) {
    setSelectedObject(object);
    setUnknownQuery(false);
    rememberSearch(object);
  }

  function searchForObject(value = query) {
    const object = findObject(value, objects);
    if (object) {
      showObject(object);
    } else {
      setSelectedObject(null);
      setUnknownQuery(true);
    }
  }

  function handleVoiceResult(text) {
    setQuery(text);
    searchForObject(text);
  }

  function hearAgain() {
    if (selectedObject) speak(getResultSentence(selectedObject));
  }

  function addNewThing(event) {
    event.preventDefault();
    const name = newThing.name.trim();
    const location = newThing.location.trim();
    if (!name || !location) return;

    const object = {
      id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name,
      icon: '📦',
      location,
      resultVerb: 'IS',
      sentenceLocation: `is at ${location.toLowerCase()}`,
      locationIcon: '📍',
      aliases: [name.toLowerCase()],
      color: 'cream',
    };
    setObjects((current) => [...current, object]);
    setNewThing({ name: '', location: '' });
    setAddOpen(false);
    showObject(object);
  }

  return (
    <div className="object-finder-page page-enter">
      <header className="object-finder-heading">
        <div><span className="object-finder-title-icon" aria-hidden="true">👓</span><div><span className="eyebrow">A helping hand</span><h1>FIND MY THINGS</h1><p>Don&apos;t worry, {patient.shortName}. Let&apos;s find it together.</p></div></div>
        <span className="finder-reassurance">We&apos;ll look together <span>♡</span></span>
      </header>

      <section className={`finder-question-card ${listening ? 'finder-listening' : ''}`}>
        <div className="finder-question-copy"><span className="eyebrow">Ask MindMate</span><h2>What are you looking for?</h2><p>Tap an item below, or ask me out loud.</p></div>
        <button className="finder-mic-button" type="button" onClick={startListening} aria-label={listening ? 'Stop listening' : 'Ask MindMate where something is'} aria-pressed={listening}><span className="finder-mic-pulse" /><span>🎙️</span><strong>{listening ? "I'M LISTENING..." : 'ASK MINDMATE'}</strong></button>
        <form className="finder-search-form" onSubmit={(event) => { event.preventDefault(); searchForObject(); }}><label htmlFor="thing-search">Or type an object name</label><div><input id="thing-search" value={query} onChange={(event) => { setQuery(event.target.value); setUnknownQuery(false); }} placeholder="For example, glasses" /><button type="submit" aria-label="Find object">→</button></div></form>
      </section>

      {selectedObject && <section className="finder-result-card page-enter" aria-live="polite"><div className={`finder-result-icon finder-result-${selectedObject.color}`}>{selectedObject.icon}</div><div className="finder-result-copy"><span className="eyebrow">We found it for you</span><h2>YOUR {selectedObject.name.toUpperCase()} {selectedObject.resultVerb} HERE</h2><strong>{selectedObject.locationIcon} {selectedObject.location.toUpperCase()}</strong><p>Your {selectedObject.name.toLowerCase()} {selectedObject.sentenceLocation}.</p></div><button className="hear-again-button" type="button" onClick={hearAgain}>🔊 HEAR AGAIN</button></section>}
      {unknownQuery && <section className="finder-unknown-card page-enter" role="status"><span>🌼</span><div><h2>I don&apos;t know where that is yet, {patient.shortName}.</h2><p>Would you like your caregiver to add it?</p></div><button type="button" onClick={() => setAddOpen(true)}>＋ Add this thing</button></section>}

      <section className="finder-objects-section"><div className="finder-section-heading"><div><span className="eyebrow">Your familiar things</span><h2>Tap an item to find it</h2></div><button className="add-thing-button" type="button" onClick={() => setAddOpen(true)}>＋ ADD NEW THING</button></div><div className="finder-object-grid">{objects.map((object) => <button className={`finder-object-card finder-object-${object.color}`} type="button" key={object.id} onClick={() => showObject(object)}><span className="finder-object-icon">{object.icon}</span><strong>{object.name.toUpperCase()}</strong><span>TAP TO FIND <b>→</b></span></button>)}</div></section>

      {recentObjects.length > 0 && <section className="recently-asked-section"><div className="finder-section-heading"><div><span className="eyebrow">A helpful little history</span><h2>🕒 RECENTLY ASKED</h2></div><span>Easy to find again</span></div><div className="recent-object-list">{recentObjects.map((object) => <button type="button" key={object.id} onClick={() => showObject(object)}><span>{object.icon}</span><strong>{object.name}</strong><small>{object.location}</small><b>→</b></button>)}</div></section>}

      {addOpen && <div className="finder-modal-backdrop" role="presentation" onClick={() => setAddOpen(false)}><form className="finder-add-modal" onSubmit={addNewThing} role="dialog" aria-modal="true" aria-labelledby="add-thing-title" onClick={(event) => event.stopPropagation()}><button className="finder-modal-close" type="button" onClick={() => setAddOpen(false)} aria-label="Close add thing dialog">×</button><span className="finder-modal-icon">📦</span><span className="eyebrow">Personalize care</span><h2 id="add-thing-title">Add a new thing</h2><p>Your caregiver can help keep track of everyday objects.</p><label htmlFor="new-thing-name">Object name<input id="new-thing-name" value={newThing.name} onChange={(event) => setNewThing({ ...newThing, name: event.target.value })} placeholder="Example: Wallet" /></label><label htmlFor="new-thing-location">Location<input id="new-thing-location" value={newThing.location} onChange={(event) => setNewThing({ ...newThing, location: event.target.value })} placeholder="Example: Desk drawer" /></label><button className="save-thing-button" type="submit">SAVE THING</button></form></div>}
    </div>
  );
}