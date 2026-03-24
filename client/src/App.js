// /client/src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PixelatedImage from './PixelatedImage';
import * as htmlToImage from 'html-to-image';
import './App.css';

// LocalStorage Keys
const GUESSED_ALBUMS_KEY_PREFIX = 'pixelJumbleGuessedAlbums_';
const WIN_STREAK_KEY = 'pixelJumbleWinStreak';
const TOTAL_SCORE_KEY = 'pixelJumbleTotalScore';

// LocalStorage Helper Functions
const getGuessedAlbums = (timeRange) => JSON.parse(localStorage.getItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange) || '[]');
const addGuessedAlbum = (albumId, timeRange) => {
  const key = GUESSED_ALBUMS_KEY_PREFIX + timeRange;
  const guessed = getGuessedAlbums(timeRange);
  if (!guessed.includes(albumId)) { localStorage.setItem(key, JSON.stringify([...guessed, albumId])); }
};
const getWinStreak = () => parseInt(localStorage.getItem(WIN_STREAK_KEY) || '0');
const incrementWinStreak = () => localStorage.setItem(WIN_STREAK_KEY, getWinStreak() + 1);
const resetWinStreak = () => localStorage.setItem(WIN_STREAK_KEY, '0');
const getTotalScore = () => parseInt(localStorage.getItem(TOTAL_SCORE_KEY) || '0');
const updateTotalScore = (newScore) => localStorage.setItem(TOTAL_SCORE_KEY, newScore);


function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [gameState, setGameState] = useState('login');
  const [gameData, setGameData] = useState(null);
  const [timeRange, setTimeRange] = useState('long_term');
  const [pixelationLevel, setPixelationLevel] = useState(20);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState([]);
  const [availableHints, setAvailableHints] = useState([]);
  const [artistRevealed, setArtistRevealed] = useState(false);
  
  // --- NEW SCORING & GAME STATE ---
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(getTotalScore());
  const [winStreak, setWinStreak] = useState(getWinStreak());
  const [guessesLeft, setGuessesLeft] = useState(5);
  const [timeLeft, setTimeLeft] = useState(40);
  const [maxScore, setMaxScore] = useState(10000); // Max possible score for the round
  const timerRef = useRef(null);
  const infographicRef = useRef(null);

  const endGame = useCallback((isWin) => {
    if (gameState !== 'playing') return;

    if (isWin) {
      const timeBonus = timeLeft * 100;
      const streakBonus = getWinStreak() > 0 ? (getWinStreak() * 250) : 0;
      // The final score is capped by the maxScore (reduced if artist is revealed)
      const finalScore = Math.min(maxScore, 1000 + timeBonus + streakBonus);
      setScore(finalScore);
      incrementWinStreak();
      const newTotalScore = getTotalScore() + finalScore;
      updateTotalScore(newTotalScore);
      setTotalScore(newTotalScore);
      setMessage(`Correct! It's ${gameData.albumName} by ${gameData.artistName}. You scored ${finalScore} points!`);
    } else {
      resetWinStreak();
      setMessage(message || `Game Over! The album was ${gameData.albumName} by ${gameData.artistName}.`);
    }
    setWinStreak(getWinStreak());
    setGameState('finished');
    if (gameData) {
      addGuessedAlbum(gameData.albumId, timeRange);
    }
  }, [gameData, timeLeft, timeRange, gameState, message, maxScore]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame(false);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft, endGame]);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    if (token) {
      setAccessToken(token);
      setGameState('mode_select');
      window.history.pushState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (gameState === 'loading' && accessToken) {
      const fetchGameData = async () => {
        try {
          const guessedIds = getGuessedAlbums(timeRange);
          // REVERTED TO LOCALHOST FOR TESTING
          const response = await axios.get(`https://pixel-jumble-backend.onrender.com/game-data`, {
            params: { access_token: accessToken, exclude: guessedIds.join(','), time_range: timeRange }
          });
          if (response.headers['x-reset-guessed-list'] === 'true') {
            localStorage.removeItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange);
          }
          const data = response.data;
          setGameData(data);
          setHints([`Album was released on ${data.releaseDate}`]);
          const hintPool = [
            data.availableHints.primaryGenre,
            data.availableHints.artistBirthDate,
            data.availableHints.similarArtist,
            data.availableHints.albumTrack,
          ].filter(hint => hint !== null);
          setAvailableHints(hintPool);
          setGameState('playing');
          setTimeLeft(40);
          setScore(0);
        } catch (error) {
          setMessage('Could not load a new puzzle. Try a different time range.');
          setGameState('mode_select');
        }
      };
      fetchGameData();
    }
  }, [gameState, accessToken, timeRange]);

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    playAgain();
  };

  const playAgain = () => {
    setGameState('loading');
    setGameData(null);
    setPixelationLevel(20);
    setMessage('');
    setHints([]);
    setAvailableHints([]);
    setGuessesLeft(5);
    setArtistRevealed(false); // Reset artist revealed state
    setMaxScore(10000); // Reset max score
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess || gameState !== 'playing') return;
    const simplifiedGuess = guess.toLowerCase().trim();

    if (simplifiedGuess === gameData.simplifiedAlbumName) {
      endGame(true);
    } else {
      const newGuessesLeft = guessesLeft - 1;
      setGuessesLeft(newGuessesLeft);
      if (newGuessesLeft <= 0) {
        endGame(false);
        setMessage(`Game Over! The album was ${gameData.albumName} by ${gameData.artistName}.`)
      } else {
        setMessage(`Incorrect. You have ${newGuessesLeft} guesses left.`);
        if (pixelationLevel < 30) {
          setPixelationLevel(pixelationLevel - 4.5);
        }
      }
    }
    setGuess('');
  };

  const addHint = () => {
    // Exclude the artist name hint from the regular pool
    const regularHints = availableHints.filter(h => !h.startsWith("The artist is:"));
    if (regularHints.length > 0) {
      const randomIndex = Math.floor(Math.random() * regularHints.length);
      const nextHint = regularHints[randomIndex];
      setHints([...hints, nextHint]);
      setAvailableHints(availableHints.filter(h => h !== nextHint));
    } else {
      setMessage("No more hints available (besides revealing the artist)!");
    }
  };

  const revealArtist = () => {
    if (gameData && gameData.availableHints.artistName) {
      setHints([...hints, gameData.availableHints.artistName]);
      setArtistRevealed(true);
      setMaxScore(2000); // Cap the max possible score for this round
      setMessage("Artist revealed! Your max score for this round is now capped.");
    }
  };

  const handleShare = useCallback(async () => {
    if (!infographicRef.current) return;
    try {
      // Temporarily make it visible for capture
      infographicRef.current.style.left = '0px';
      const dataUrl = await htmlToImage.toPng(infographicRef.current, { quality: 0.95 });
      // Hide it again
      infographicRef.current.style.left = '-9999px';
      
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      alert("Results image copied to clipboard!");
    } catch (error) {
      if (infographicRef.current) infographicRef.current.style.left = '-9999px';
      console.error('Sharing failed:', error);
      alert('Could not copy image. Feature may not be supported on your browser.');
    }
  }, []);

  const renderLogin = () => (
    <div className="container">
      <h1>Pixel Jumble</h1>
      <p>Guess the album from your own Spotify history!</p>
      {/* REVERTED TO LOCALHOST FOR TESTING */}
      <a href="https://pixel-jumble-backend.onrender.com/login" className="login-button">Connect with Spotify</a>
    </div>
  );

  const renderModeSelect = () => (
    <div className="container">
      <h1>Select a Game Mode</h1>
      <p>Total Score: {totalScore} | Current Win Streak: {winStreak}</p>
      <p className="message">{message}</p>
      <div className="mode-buttons">
        <button onClick={() => handleTimeRangeChange('short_term')}>Recent Time<br/><span>(Last 4 Weeks)</span></button>
        <button onClick={() => handleTimeRangeChange('medium_term')}>Broader Recent<br/><span>(Last 6 Months)</span></button>
        <button onClick={() => handleTimeRangeChange('long_term')}>All Time<br/><span>(Lifetime)</span></button>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="container">
      <PixelatedImage imageUrl={gameData.coverUrl} pixelationLevel={pixelationLevel} />
      <div className="game-info">
        <div className='score-timer'>
            <span>Time: {timeLeft}</span>
            <span>Guesses: {guessesLeft}</span>
        </div>
        <h2>Pixel Jumble - Guess the album</h2>
        <ul>{hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul>
        <form onSubmit={handleGuess}>
          <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess here..."/>
        </form>
        <p className="message">{message}</p>
        <div className="hint-buttons">
          <button onClick={addHint}>Add Hint</button>
          <button onClick={revealArtist} className="reveal-button" disabled={artistRevealed}>Reveal Artist (Score Cap)</button>
          <button onClick={() => endGame(false)}>End Game</button>
        </div>
      </div>
    </div>
  );

  const renderFinished = () => {
    return (
      <div className="container">
        <img src={gameData.coverUrl} alt={gameData.albumName} style={{ width: '300px', borderRadius: '8px' }}/>
        <div className="game-info">
          <div className='score-timer'>
              <span>Final Score: {score}</span>
              <span>New Total Score: {totalScore}</span>
          </div>
          <p className="message">{message}</p>
          <p>Win Streak: {winStreak}</p>
          <div className='finished-buttons'>
            <button onClick={playAgain} className="play-again-button">Play Again (Same Mode)</button>
            <button onClick={() => setGameState('mode_select')} className="play-again-button secondary">Change Mode</button>
            <button onClick={handleShare} className="play-again-button share">Share Result</button>
          </div>
        </div>
        {/* Hidden component for generating the share image */}
        <div style={{ position: 'absolute', left: '-9999px' }}>
            <div id="share-infographic" ref={infographicRef}>
                <h2>Pixel Jumble</h2>
                <p>My Score:</p>
                <p className="final-score">{score}</p>
                <p className="streak">Current Win Streak: {winStreak}</p>
                <div className="guessed-list">
                  <p>Guessed Today:</p>
                  <ul><li>- {gameData.albumName}</li></ul>
                </div>
            </div>
        </div>
      </div>
    );
  };
  
  if (!accessToken) return renderLogin();
  if (gameState === 'mode_select') return renderModeSelect();
  if (gameState === 'loading' || !gameData) return <div className="container"><h2>Loading your puzzle...</h2></div>;
  if (gameState === 'playing') return renderGame();
  if (gameState === 'finished') return renderFinished();
}

export default App;