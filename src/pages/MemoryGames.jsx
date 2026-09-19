import { useEffect, useState } from 'react';
import { family } from '../data/demoData';
import { getStoredState, saveStoredState } from '../services/storageService';

const gameCards = [
  { id: 'match', icon: '🎴', title: 'MEMORY MATCH', description: 'Find the matching pairs.', detail: 'Familiar objects make this a gentle matching activity.', color: 'blue' },
  { id: 'who', icon: '👨‍👩‍👧', title: 'WHO IS WHO?', description: 'Can you recognize your loved ones?', detail: 'Remember the people who are close to your heart.', color: 'coral' },
  { id: 'pattern', icon: '🔷', title: 'PATTERN RECOGNITION', description: 'Can you complete the pattern?', detail: 'Look carefully and choose what comes next.', color: 'lavender' },
  { id: 'object', icon: '🖼️', title: 'OBJECT RECOGNITION', description: 'Can you recognize this everyday object?', detail: 'A friendly everyday-object quiz.', color: 'gold' },
];

const matchItems = ['👓', '☕', '🌸', '🏠'];
const whoQuestions = family.map((person) => ({ person, answer: person.name }));
const patternQuestions = [
  { sequence: ['🔴', '🔵', '🔴', '🔵'], options: ['🔴', '🔵', '🟢'], answer: '🔴' },
  { sequence: ['🌸', '🌼', '🌸', '🌼'], options: ['🌸', '🌼', '🌷'], answer: '🌸' },
  { sequence: ['⭐', '⭐', '🌙', '⭐', '⭐', '🌙'], options: ['🌙', '⭐', '☀️'], answer: '⭐' },
  { sequence: ['🟢', '🟡', '🟢', '🟡'], options: ['🟢', '🔵', '🟡'], answer: '🟢' },
  { sequence: ['☀️', '🌧️', '☀️', '🌧️'], options: ['🌈', '☀️', '🌧️'], answer: '☀️' },
];
const objectQuestions = [
  { icon: '👓', answer: 'Glasses', options: ['Glasses', 'Phone', 'Keys'] },
  { icon: '📱', answer: 'Phone', options: ['Medicine', 'Phone', 'Cup'] },
  { icon: '🔑', answer: 'Keys', options: ['Walking Stick', 'Keys', 'Glasses'] },
  { icon: '💊', answer: 'Medicine', options: ['Cup', 'Medicine', 'Phone'] },
  { icon: '☕', answer: 'Cup', options: ['Cup', 'Keys', 'Walking Stick'] },
];

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getDifficulty(performance = []) {
  if (!performance.length) return 'EASY';
  const accuracy = performance.reduce((total, item) => total + item.accuracy, 0) / performance.length;
  if (accuracy >= 80) return performance.length > 2 ? 'MEDIUM' : 'EASY';
  if (accuracy < 50) return 'EASY';
  return 'MEDIUM';
}

function recordGame(game, accuracy, difficulty, completed) {
  const state = getStoredState();
  const games = state.gamePerformance || [];
  saveStoredState({ ...state, gamePerformance: [...games, { game, accuracy, difficulty, completedAt: new Date().toISOString(), completed }] });
}

function GameHeader({ game, question, total, difficulty, onBack }) {
  return <div className="focused-game-header"><button className="back-to-games" type="button" onClick={onBack}>← BACK TO GAMES</button><div className="focused-game-meta"><span className="eyebrow">MindMate activity</span><span className="difficulty-badge">🧠 MindMate is adapting to you · 🌱 {difficulty}</span></div><h1>{game.title}</h1><p>{game.detail}</p>{question && <div className="game-progress"><span>Question {question} of {total}</span><div><i style={{ width: `${(question / total) * 100}%` }} /></div></div>}</div>;
}

function EndGame({ title, result, accuracy, completed, completedLabel = 'Pairs Found', difficulty = 'EASY', onAgain, onBack, onHome }) {
  const summary = result ? { ...result, completed: result.completed ?? result.pairsFound, completedLabel: result.completedLabel || completedLabel } : { accuracy, completed: completed || '—', completedLabel, timeSeconds: null, attempts: null, hintsUsed: null, difficulty, interactionMessage: '' };
  const encouragement = summary.accuracy >= 90 ? 'Excellent memory!' : summary.accuracy >= 70 ? 'Great job!' : summary.accuracy >= 50 ? 'Very good!' : "Nice effort — let's try again!";
  return <div className="game-end-card page-enter"><span className="end-game-icon">🌟</span><span className="eyebrow">A lovely effort</span><h2>Great Job, Ramesh Ji!</h2><h3>{title} Completed</h3><p>{encouragement}</p><div className="performance-summary"><strong>⭐ Performance Summary</strong><span>Accuracy: <b>{summary.accuracy}%</b></span><span>{summary.completedLabel}: <b>{summary.completed}</b></span>{summary.timeSeconds != null && <span>Time Taken: <b>{summary.timeSeconds} seconds</b></span>}{summary.attempts != null && <span>Attempts: <b>{summary.attempts}</b></span>}{summary.hintsUsed != null && <span>Hints Used: <b>{summary.hintsUsed}</b></span>}<span>Difficulty: <b>{summary.difficulty}</b></span>{summary.interactionMessage && <span>MindMate Interaction: <b>{summary.interactionMessage}</b></span>}</div><div className="end-game-actions"><button type="button" onClick={onAgain}>🔄 PLAY AGAIN</button><button type="button" onClick={onBack}>← OTHER GAMES</button><button type="button" onClick={onHome}>⌂ GO HOME</button></div><small>{title} is saved for your care circle.</small></div>;
}

function MatchGame({ onBack, onHome, difficulty }) {
  const [cards, setCards] = useState(() => shuffle([...matchItems, ...matchItems]).map((value, index) => ({ id: index, value, open: false, matched: false })));
  const [picked, setPicked] = useState([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [result, setResult] = useState(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  function resetGame() {
    setCards(shuffle([...matchItems, ...matchItems]).map((value, index) => ({ id: index, value, open: false, matched: false })));
    setPicked([]);
    setMoves(0);
    setMatches(0);
    setResult(null);
    setStartedAt(Date.now());
  }

  function flipCard(card) {
    if (picked.length === 2 || card.open || card.matched) return;
    const nextPicked = [...picked, card];
    setPicked(nextPicked);
    setCards((current) => current.map((item) => item.id === card.id ? { ...item, open: true } : item));
    if (nextPicked.length === 2) {
      setMoves((value) => value + 1);
      if (nextPicked[0].value === nextPicked[1].value) {
        setCards((current) => current.map((item) => nextPicked.some((pickedCard) => pickedCard.id === item.id) ? { ...item, matched: true } : item));
        setMatches((value) => {
          const next = value + 1;
          if (next === matchItems.length) {
            const attempts = moves + 1;
            const accuracy = Math.round((next / attempts) * 100);
            const completedResult = {
              accuracy,
              completed: `${next} / ${matchItems.length}`,
              completedLabel: 'Pairs Found',
              timeSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
              attempts,
              hintsUsed: 0,
              difficulty,
              interactionMessage: 'Interaction data will appear after more activity.',
            };
            setResult(completedResult);
            recordGame('Memory Match', accuracy, difficulty, `${next} of ${matchItems.length} pairs`);
          }
          return next;
        });
        setPicked([]);
      } else {
        window.setTimeout(() => { setCards((current) => current.map((item) => nextPicked.some((pickedCard) => pickedCard.id === item.id) ? { ...item, open: false } : item)); setPicked([]); }, 800);
      }
    }
  }

  if (result) return <EndGame title="Memory Match" result={result} onAgain={resetGame} onBack={onBack} onHome={onHome} />;
  return <><GameHeader game={gameCards[0]} difficulty={difficulty} onBack={onBack} /><div className="match-stats"><span>Moves <b>{moves}</b></span><span>Matches <b>{matches} / {matchItems.length}</b></span><span>Take your time</span></div><div className="match-grid">{cards.map((card) => <button className={`match-card ${card.open || card.matched ? 'match-card-open' : ''} ${card.matched ? 'match-card-matched' : ''}`} key={card.id} type="button" onClick={() => flipCard(card)}><span>{card.open || card.matched ? card.value : '?'}</span></button>)}</div></>;
}

function QuizGame({ type, onBack, onHome, difficulty }) {
  const questions = type === 'who' ? whoQuestions : type === 'pattern' ? patternQuestions : objectQuestions;
  const game = gameCards.find((item) => item.id === type);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(null);
  const question = questions[questionIndex];
  const isCorrect = question ? answered === question.answer : false;
  const whoChoices = type === 'who' && difficulty === 'EASY' && correct === 0
    ? [question?.answer, ...['Anita', 'Rahul', 'Sita'].filter((name) => name !== question?.answer)].slice(0, 2)
    : ['Anita', 'Rahul', 'Sita'];

  function resetQuiz() {
    setQuestionIndex(0);
    setCorrect(0);
    setAnswered(null);
  }

  function answer(value) {
    if (answered) return;
    setAnswered(value);
  }

  function nextQuestion() {
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    if (questionIndex === questions.length - 1) {
      const accuracy = Math.round((nextCorrect / questions.length) * 100);
      recordGame(game.title, accuracy, difficulty, `${questions.length} of ${questions.length} questions`);
      setCorrect(nextCorrect);
      setQuestionIndex(questions.length);
    } else {
      setCorrect(nextCorrect);
      setQuestionIndex((value) => value + 1);
      setAnswered(null);
    }
  }

  if (questionIndex >= questions.length) return <EndGame title={game.title} accuracy={Math.round((correct / questions.length) * 100)} completed={`${correct} / ${questions.length}`} completedLabel="Correct Answers" difficulty={difficulty} onAgain={resetQuiz} onBack={onBack} onHome={onHome} />;
  return <><GameHeader game={game} question={questionIndex + 1} total={questions.length} difficulty={difficulty} onBack={onBack} /><div className="quiz-card">{type === 'who' && <div className="quiz-person-photo"><span>{question.person.initials}</span><i>✦</i></div>}{type === 'object' && <div className="quiz-object-picture">{question.icon}</div>}{type === 'pattern' && <div className="pattern-sequence">{question.sequence.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}<span>❓</span></div>}<h2>{type === 'who' ? 'Who is this?' : type === 'object' ? 'What is this?' : 'Can you complete the pattern?'}</h2>{type === 'who' && <p>A familiar face from your family</p>}<div className="quiz-options">{(type === 'who' ? whoChoices : question.options).map((option) => <button className={answered ? option === question.answer ? 'answer-correct' : option === answered ? 'answer-gentle' : '' : ''} type="button" key={option} onClick={() => answer(option)}>{option}</button>)}</div>{answered && <div className={`gentle-feedback ${isCorrect ? 'feedback-positive' : 'feedback-gentle'}`}><strong>{isCorrect ? '🎉 Wonderful, Ramesh Ji!' : '💙 That’s okay, Ramesh Ji.'}</strong><span>{isCorrect ? `You ${type === 'who' ? `remembered ${question.answer}` : type === 'pattern' ? 'completed the pattern' : `recognized the ${question.answer.toLowerCase()}`}!` : type === 'who' ? `This is ${question.answer}, your ${question.person.relationship.toLowerCase()}.` : type === 'pattern' ? 'Almost! Let’s look at the pattern together.' : `These are ${question.answer.toLowerCase()}.`}</span><button type="button" onClick={nextQuestion}>{questionIndex === questions.length - 1 ? 'See my result →' : 'Next gentle question →'}</button></div>}</div></>;
}

export default function MemoryGames({ initialGame, navigate }) {
  const [activeGame, setActiveGame] = useState(initialGame || null);
  const [performance, setPerformance] = useState(() => getStoredState().gamePerformance || []);
  const difficulty = getDifficulty(performance);

  useEffect(() => { setPerformance(getStoredState().gamePerformance || []); }, [activeGame]);
  useEffect(() => { if (initialGame) setActiveGame(initialGame); }, [initialGame]);

  if (activeGame === 'match') return <div className="memory-games-page focused-game-page page-enter"><MatchGame difficulty={difficulty} onBack={() => setActiveGame(null)} onHome={() => navigate?.('home')} /></div>;
  if (['who', 'pattern', 'object'].includes(activeGame)) return <div className="memory-games-page focused-game-page page-enter"><QuizGame type={activeGame} difficulty={difficulty} onBack={() => setActiveGame(null)} onHome={() => navigate?.('home')} /></div>;

  return <div className="memory-games-page page-enter"><header className="memory-games-heading"><div><span className="memory-games-title-icon" aria-hidden="true">🧠</span><div><span className="eyebrow">A little brain sunshine</span><h1>MEMORY GAMES</h1><p>Let&apos;s exercise your mind together, Ramesh Ji!</p></div></div><span className="memory-games-reassurance">Play at your own pace <span>♡</span></span></header><div className="adaptive-banner"><span>🧠</span><div><strong>MindMate is adapting to you</strong><p>Activities gently adjust to your pace.</p></div><b>🌱 {difficulty}</b></div><section className="games-menu-section"><div className="games-menu-heading"><div><span className="eyebrow">Choose a happy challenge</span><h2>What would you like to play?</h2></div><span>No scores. Just practice.</span></div><div className="games-menu-grid">{gameCards.map((game) => <article className={`game-menu-card game-menu-${game.color}`} key={game.id}><div className="game-menu-icon">{game.icon}</div><span className="game-menu-number">0{gameCards.indexOf(game) + 1}</span><h2>{game.title}</h2><p>{game.description}</p><small>{game.detail}</small><button type="button" onClick={() => setActiveGame(game.id)}>▶ PLAY NOW <span>→</span></button></article>)}</div></section></div>;
}