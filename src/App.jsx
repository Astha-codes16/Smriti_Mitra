import { useState } from 'react';
import AccessibilityControls from './components/AccessibilityControls';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GlobalVoiceAssistant from './components/GlobalVoiceAssistant';
import { VoiceProvider } from './context/VoiceContext';
import Home from './pages/Home';
import MyDay from './pages/MyDay';
import MemoryGames from './pages/MemoryGames';
import MyPeople from './pages/MyPeople';
import ObjectFinder from './pages/ObjectFinder';
import MoodCheck from './pages/MoodCheck';
import EyeSense from './pages/EyeSense';
import ComfortZone from './pages/ComfortZone';
import CaregiverDashboard from './pages/CaregiverDashboard';

const patientScreens = {
  home: Home,
  'my-day': MyDay,
  'memory-games': MemoryGames,
  'my-people': MyPeople,
  'object-finder': ObjectFinder,
  'mood-check': MoodCheck,
  'eye-sense': EyeSense,
  'comfort-zone': ComfortZone,
};

export default function App() {
  const [mode, setMode] = useState('patient');
  const [activeScreen, setActiveScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState(null);
  const [pendingObject, setPendingObject] = useState(null);
  const [pendingPerson, setPendingPerson] = useState(null);
  const [pendingMood, setPendingMood] = useState(null);
  const [pendingGame, setPendingGame] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comfortSection, setComfortSection] = useState('home');

  function navigate(screen, section = 'home') {
    if (screen !== activeScreen) setPreviousScreen(activeScreen);
    setActiveScreen(screen);
    if (screen === 'comfort-zone') setComfortSection(section);
  }

  function handleVoiceCommand(command) {
    console.log('EXECUTING ACTION:', command);
    if (command.intent === 'STOP' || command.intent === 'HELP' || command.intent === 'UNKNOWN') return;
    if (command.intent === 'BACK') {
      if (previousScreen) {
        const target = previousScreen;
        setPreviousScreen(null);
        navigate(target);
        console.log('NAVIGATION REQUESTED:', target);
        return "Going back to your previous screen.";
      }
      return 'You are already on the home screen.';
    }
    if (command.intent === 'FIND_OBJECT') {
      setPendingObject(command.object);
      navigate('object-finder');
      console.log('NAVIGATION REQUESTED:', 'object-finder');
      return;
    }
    if (command.intent === 'SHOW_PERSON') {
      setPendingPerson(command.person);
      navigate('my-people');
      console.log('NAVIGATION REQUESTED:', 'my-people');
      return;
    }
    if (command.intent === 'START_GAME') {
      setPendingGame(command.game);
      navigate('memory-games');
      console.log('NAVIGATION REQUESTED:', 'memory-games');
      return;
    }
    if (command.intent === 'MOOD') {
      setPendingMood(command.mood);
      navigate('mood-check');
      console.log('NAVIGATION REQUESTED:', 'mood-check');
      return;
    }
    if (command.intent === 'COMFORT') {
      setPendingObject(null);
      navigate('comfort-zone', command.section);
      console.log('NAVIGATION REQUESTED:', 'comfort-zone');
      return;
    }
    if (command.intent === 'COMFORT_MUSIC') {
      console.log('EXECUTING ACTION: COMFORT_MUSIC');
      console.log('OPENING COMFORT ZONE MUSIC');
      setPendingObject(null);
      navigate('comfort-zone', 'music');
      console.log('NAVIGATION REQUESTED:', 'comfort-zone');
      return;
    }
    if (command.intent === 'NAVIGATE') {
      navigate(command.screen, command.section);
      console.log('NAVIGATION REQUESTED:', command.destination || command.screen);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setActiveScreen(nextMode === 'patient' ? 'home' : 'caregiver-dashboard');
    setComfortSection('home');
    setMenuOpen(false);
  }

  const Page = mode === 'caregiver' ? CaregiverDashboard : patientScreens[activeScreen] || Home;
  const pageProps = mode === 'patient' && ['home', 'my-day', 'object-finder', 'mood-check', 'comfort-zone', 'my-people', 'memory-games'].includes(activeScreen)
    ? { navigate, initialSection: comfortSection, initialObject: pendingObject, initialPerson: pendingPerson, initialMood: pendingMood, initialGame: pendingGame }
    : {};

  return (
    <VoiceProvider onCommand={handleVoiceCommand}>
      <div className="app-shell">
        <Sidebar mode={mode} activeScreen={activeScreen} onNavigate={navigate} onModeChange={changeMode} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="main-shell">
          <Header mode={mode} onMenuClick={() => setMenuOpen(true)} />
          <main className="main-content"><Page {...pageProps} /></main>
        </div>
        {mode === 'patient' && <GlobalVoiceAssistant />}
        <AccessibilityControls />
      </div>
    </VoiceProvider>
  );
}
