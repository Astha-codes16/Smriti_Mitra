import { useEffect, useRef, useState } from 'react';
import { speak } from '../services/voiceService';
import { patient } from '../data/demoData';

const musicTracks = [
  { id: 'bihu', title: 'Bihu Folk Melodies', icon: '🎶', detail: 'A bright demo melody inspired by Assam.' },
  { id: 'assamese', title: 'Assamese Cultural Music', icon: '🎵', detail: 'A warm cultural soundscape for a peaceful moment.' },
  { id: 'rabindra', title: 'Rabindra Sangeet', icon: '🎶', detail: 'A gentle demo tone for quiet reflection.' },
  { id: 'instrumental', title: 'Gentle Instrumental Music', icon: '🎼', detail: 'Soft notes to help you feel at ease.' },
];

const peacefulSounds = [
  { id: 'rain', title: 'Monsoon Rain', icon: '🌧️', detail: 'The soft rhythm of rain outside.' },
  { id: 'river', title: 'River Flow', icon: '🌊', detail: 'A calm flow inspired by the Brahmaputra.' },
  { id: 'birds', title: 'Morning Birds', icon: '🐦', detail: 'A gentle morning greeting from nature.' },
  { id: 'forest', title: 'Forest Sounds', icon: '🌿', detail: 'A quiet walk among green trees.' },
];

const places = [
  { title: 'My Home', icon: '🏡', description: 'The familiar place where your family shares everyday moments.', color: 'cream' },
  { title: 'Brahmaputra River', icon: '🌊', description: 'A peaceful place filled with beautiful memories.', color: 'blue' },
  { title: 'Tea Gardens', icon: '🍃', description: 'Green gardens, fresh air, and the beauty of Assam.', color: 'sage' },
  { title: 'North East Hills', icon: '🏔️', description: 'Quiet hills and wide skies that feel like home.', color: 'lavender' },
];

const memories = [
  { title: 'Childhood Home', icon: '🏡', description: 'A place full of first steps, familiar rooms, and loving memories.', color: 'cream' },
  { title: 'Family Celebration', icon: '🎉', description: 'A beautiful day surrounded by the people you love.', color: 'coral' },
  { title: 'Evening Walk', icon: '🌳', description: 'A peaceful walk together as the day grew quiet.', color: 'sage' },
  { title: 'Morning Tea', icon: '☕', description: 'You have always enjoyed a peaceful cup of tea in the morning.', color: 'gold' },
];

function DemoPlayer({ item, playingId, onToggle }) {
  const isPlaying = playingId === item.id;
  return <div className={`comfort-track ${isPlaying ? 'comfort-track-playing' : ''}`}><span className="comfort-track-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><button type="button" onClick={() => onToggle(item)} aria-label={isPlaying ? `Pause ${item.title}` : `Play ${item.title}`}>{isPlaying ? '⏸' : '▶'} <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span></button></div>;
}

export default function ComfortZone({ initialSection = 'home', navigate }) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [playingId, setPlayingId] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [relaxing, setRelaxing] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Breathe In');
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const phaseTimerRef = useRef(null);

  useEffect(() => {
    setActiveSection(initialSection);
    if (initialSection !== 'home') window.setTimeout(() => document.getElementById(`comfort-${initialSection}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [initialSection]);

  useEffect(() => () => {
    stopDemoAudio();
    window.clearInterval(phaseTimerRef.current);
  }, []);

  function stopDemoAudio() {
    oscillatorRef.current?.stop();
    oscillatorRef.current = null;
    setPlayingId(null);
  }

  function toggleDemoAudio(item) {
    if (playingId === item.id) {
      stopDemoAudio();
      return;
    }
    stopDemoAudio();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Audio unavailable');
      const context = audioContextRef.current || new AudioContext();
      audioContextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = item.id === 'rain' ? 220 : item.id === 'river' ? 262 : item.id === 'birds' ? 392 : 330;
      oscillator.type = item.id === 'rain' || item.id === 'forest' ? 'sine' : 'triangle';
      gain.gain.value = 0.035;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillatorRef.current = oscillator;
      setPlayingId(item.id);
    } catch {
      setPlayingId(item.id);
      window.setTimeout(() => setPlayingId(null), 1800);
    }
  }

  function changeSection(section) {
    setActiveSection(section);
    document.getElementById(`comfort-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startRelaxing() {
    setRelaxing(true);
    setBreathPhase('Breathe In');
    phaseTimerRef.current = window.setInterval(() => setBreathPhase((phase) => phase === 'Breathe In' ? 'Hold' : phase === 'Hold' ? 'Breathe Out' : 'Breathe In'), 4000);
  }

  function stopRelaxing() {
    setRelaxing(false);
    window.clearInterval(phaseTimerRef.current);
  }

  return <div className="comfort-zone-page page-enter">
    <header className="comfort-zone-heading"><div><span className="smriti-mark" aria-hidden="true">🌸</span><div><span className="eyebrow">Smriti Anand</span><h1>COMFORT ZONE</h1><p>Let&apos;s spend a peaceful moment together, {patient.shortName}.</p></div></div><div className="smriti-meaning"><strong>SMRITI ANAND</strong><span>A space of happy memories and comfort.</span></div></header>
    <nav className="comfort-zone-nav" aria-label="Comfort Zone sections"><button className={activeSection === 'music' ? 'comfort-nav-active' : ''} type="button" onClick={() => changeSection('music')}>🎵 Familiar Music</button><button className={activeSection === 'sounds' ? 'comfort-nav-active' : ''} type="button" onClick={() => changeSection('sounds')}>🌧️ Peaceful Sounds</button><button className={activeSection === 'places' ? 'comfort-nav-active' : ''} type="button" onClick={() => changeSection('places')}>🏞️ Familiar Places</button><button className={activeSection === 'memories' ? 'comfort-nav-active' : ''} type="button" onClick={() => changeSection('memories')}>📖 Happy Memories</button><button className={activeSection === 'relax' ? 'comfort-nav-active' : ''} type="button" onClick={() => changeSection('relax')}>🌿 Relax</button></nav>

    <section className="comfort-welcome"><div><span className="eyebrow">Your peaceful place</span><h2>Take a little time for yourself.</h2><p>Familiar sounds, places, and memories are here whenever you need a gentle moment.</p></div><span className="welcome-art">🌺</span></section>

    <section className="comfort-section" id="comfort-music"><div className="comfort-section-heading"><div><span className="eyebrow">A familiar tune</span><h2>🎵 FAMILIAR MUSIC</h2><p>Listen to music that brings back beautiful memories.</p></div><span className="demo-label">Demo tones · no music files needed</span></div><div className="comfort-track-grid">{musicTracks.map((track) => <DemoPlayer item={track} key={track.id} playingId={playingId} onToggle={toggleDemoAudio} />)}</div></section>

    <section className="comfort-section" id="comfort-sounds"><div className="comfort-section-heading"><div><span className="eyebrow">Nature nearby</span><h2>🌧️ PEACEFUL SOUNDS</h2><p>Relax with familiar peaceful sounds.</p></div></div><div className="comfort-track-grid">{peacefulSounds.map((sound) => <DemoPlayer item={sound} key={sound.id} playingId={playingId} onToggle={toggleDemoAudio} />)}</div></section>

    <section className="comfort-section" id="comfort-places"><div className="comfort-section-heading"><div><span className="eyebrow">Places that feel like home</span><h2>🏞️ FAMILIAR PLACES</h2></div><span className="demo-label">Tap a place to remember it</span></div><div className="comfort-places-grid">{places.map((place) => <button className={`comfort-place-card place-${place.color}`} type="button" key={place.title} onClick={() => setSelectedPlace(place)}><span>{place.icon}</span><strong>{place.title}</strong><small>{place.description}</small><b>EXPLORE →</b></button>)}</div></section>

    <section className="comfort-section" id="comfort-memories"><div className="comfort-section-heading"><div><span className="eyebrow">Moments worth keeping</span><h2>📖 MY HAPPY MEMORIES</h2></div><span className="demo-label">Little pieces of a beautiful life</span></div><div className="comfort-memory-grid">{memories.map((memory) => <button className={`comfort-memory-card memory-${memory.color}`} type="button" key={memory.title} onClick={() => setSelectedMemory(memory)}><span>{memory.icon}</span><div><strong>{memory.title}</strong><small>{memory.description}</small></div><b>→</b></button>)}</div></section>

    <section className="comfort-support-card"><div><span className="eyebrow">Here whenever you need me</span><h2>💙 NEED A LITTLE COMFORT?</h2><p>Choose something gentle for this moment.</p></div><div className="comfort-support-actions"><button type="button" onClick={() => changeSection('music')}>🎵 Listen to Music</button><button type="button" onClick={() => navigate('my-people')}>❤️ See My Family</button><button type="button" onClick={() => changeSection('sounds')}>🌿 Relax</button></div></section>

    <section className="comfort-relax-section" id="comfort-relax"><div className="comfort-section-heading"><div><span className="eyebrow">A quiet moment</span><h2>🌿 RELAX WITH MINDMATE</h2><p>Take a slow breath with me.</p></div>{relaxing && <span className="relax-phase-label">{breathPhase}</span>}</div><div className="breathing-card"><div className={`breathing-orb ${relaxing ? 'breathing-active' : ''}`}><span>{relaxing ? (breathPhase === 'Hold' ? '⏸️' : breathPhase === 'Breathe Out' ? '💨' : '🌬️') : '🌿'}</span></div><div><h3>{relaxing ? breathPhase : 'Ready when you are'}</h3><p>{relaxing ? 'Let the circle guide your breathing.' : 'A simple, peaceful breathing moment.'}</p><div className="breathing-steps"><span>🌬️ Breathe In</span><i>↓</i><span>⏸️ Hold</span><i>↓</i><span>💨 Breathe Out</span></div><button className="relax-button" type="button" onClick={relaxing ? stopRelaxing : startRelaxing}>{relaxing ? '⏹️ STOP' : '▶ START RELAXING'}</button></div></div></section>

    {selectedPlace && <div className="comfort-modal-backdrop" role="presentation" onClick={() => setSelectedPlace(null)}><div className="comfort-detail-modal" role="dialog" aria-modal="true" aria-labelledby="place-title" onClick={(event) => event.stopPropagation()}><button className="comfort-modal-close" type="button" onClick={() => setSelectedPlace(null)} aria-label="Close place details">×</button><span className={`comfort-detail-art place-${selectedPlace.color}`}>{selectedPlace.icon}</span><span className="eyebrow">A place to feel at home</span><h2 id="place-title">{selectedPlace.title}</h2><p>{selectedPlace.description}</p><button type="button" onClick={() => speak(selectedPlace.description)}>🔊 LISTEN</button></div></div>}
    {selectedMemory && <div className="comfort-modal-backdrop" role="presentation" onClick={() => setSelectedMemory(null)}><div className="comfort-detail-modal" role="dialog" aria-modal="true" aria-labelledby="memory-title" onClick={(event) => event.stopPropagation()}><button className="comfort-modal-close" type="button" onClick={() => setSelectedMemory(null)} aria-label="Close memory details">×</button><span className={`comfort-detail-art memory-${selectedMemory.color}`}>{selectedMemory.icon}</span><span className="eyebrow">A happy memory</span><h2 id="memory-title">{selectedMemory.title}</h2><p>{selectedMemory.description}</p><button type="button" onClick={() => speak(selectedMemory.description)}>🔊 HEAR THIS MEMORY</button></div></div>}
  </div>;
}