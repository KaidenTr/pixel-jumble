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
const DAILY_CHALLENGE_KEY = 'pixelJumbleDailyChallenge';

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

const getDailyChallenge = () => {
    const daily = localStorage.getItem(DAILY_CHALLENGE_KEY);
    return daily ? JSON.parse(daily) : { completionTime: null };
};
const saveDailyCompletionToLocalStorage = () => {
    localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify({ completionTime: Date.now() }));
};

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
  
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(getTotalScore());
  const [winStreak, setWinStreak] = useState(getWinStreak());
  const [guessesLeft, setGuessesLeft] = useState(5);
  const [timeLeft, setTimeLeft] = useState(40);
  const [maxScore, setMaxScore] = useState(10000);
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(false);
  const timerRef = useRef(null);
  const infographicRef = useRef(null);

  const [dailyChallengeLocked, setDailyChallengeLocked] = useState(false);
  const [countdown, setCountdown] = useState('');

  const [didLose, setDidLose] = useState(false);

useEffect(() => {
  const daily = getDailyChallenge();

  if (daily.completionTime) {
    // 1. Calculate the exact time 24 hours from completion
    // (24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const unlockTime = daily.completionTime + (24 * 60 * 60 * 1000); 

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = unlockTime - now;

      if (remaining <= 0) {
        setDailyChallengeLocked(false);
        setCountdown('');
        return true; // Stop interval
      } else {
        setDailyChallengeLocked(true);
        
        // 2. Calculate Hours, Minutes, and Seconds
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        // 3. Format as HH:MM:SS
        setCountdown(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
        return false;
      }
    };

    const isFinished = updateCountdown();
    if (!isFinished) {
      const interval = setInterval(() => {
        if (updateCountdown()) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }
}, [gameState]);

  const endGame = useCallback((isWin) => {
    if (gameState !== 'playing') return;

    setDidLose(!isWin); 

    if (isWin) {
      const timeBonus = timeLeft * 100;
      const streakBonus = getWinStreak() * 250;
      // --- NEW: Daily Challenge Score Bonus ---
      const dailyBonus = timeRange === 'daily_challenge' ? 5000 : 0;
      const finalScore = Math.min(maxScore, 1000 + timeBonus + streakBonus + dailyBonus);

      setScore(finalScore);
      incrementWinStreak();
      const newTotalScore = getTotalScore() + finalScore;
      updateTotalScore(newTotalScore);
      setTotalScore(newTotalScore);
      setMessage(`Correct! It's ${gameData.albumName}. You scored ${finalScore} points!`);
    } else {
      const streakBeforeReset = getWinStreak();
      setMessage(message || `Game Over! The album was ${gameData.albumName} by ${gameData.artistName}. Your win streak was ${streakBeforeReset}.`);
      resetWinStreak();
    }
    setWinStreak(getWinStreak());
    setGameState('finished');
    if (gameData) {
      addGuessedAlbum(gameData.albumId, timeRange);
    }
    // --- NEW: Lock out daily challenge on win OR loss ---
    if (timeRange === 'daily_challenge') {
      // setDailyChallengeCompleted(true); // Updates the UI state
      saveDailyCompletionToLocalStorage(); // Saves to LocalStorage using the new helper name
    }
  }, [gameData, timeLeft, timeRange, gameState, message, maxScore]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      const streakBeforeReset = getWinStreak();
      setMessage(`Time's up! Game Over. The album was ${gameData.albumName} by ${gameData.artistName}. Your win streak was ${streakBeforeReset}.`);
      endGame(false);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft, endGame, gameData]);


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
          const apiTimeRange = timeRange === 'daily_challenge' ? 'long_term' : timeRange;
          const guessedIds = getGuessedAlbums(apiTimeRange);
          
          const response = await axios.get(`https://pixel-jumble-backend.onrender.com/game-data`, {
            params: { access_token: accessToken, exclude: guessedIds.join(','), time_range: apiTimeRange }
          });
          
          if (response.headers['x-reset-guessed-list'] === 'true') {
            localStorage.removeItem(GUESSED_ALBUMS_KEY_PREFIX + apiTimeRange);
          }
          
          const data = response.data;
          setGameData(data);
          
          // --- NEW: Daily Challenge Hardcore Settings ---
          if (timeRange === 'daily_challenge') {
             setHints([]); // No starting hints for daily
             setPixelationLevel(30); // EXTREME pixelation
             setGuessesLeft(1); // One life
          } else {
             setHints([`Album was released on ${data.releaseDate}`]);
             setPixelationLevel(20);
             setGuessesLeft(5);
          }
          
          const hintPool = [
            data.availableHints.primaryGenre, data.availableHints.artistBirthDate,
            data.availableHints.similarArtist, data.availableHints.albumTrack,
            data.availableHints.artistOrigin
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
    setMessage('');
    setHints([]);
    setAvailableHints([]);
    setArtistRevealed(false);
    setMaxScore(10000);
    setDidLose(false);
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
        const streakBeforeReset = getWinStreak();
        endGame(false);
        setMessage(`Game Over! The album was ${gameData.albumName} by ${gameData.artistName}. Your win streak was ${streakBeforeReset}.`);
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
    const regularHints = availableHints.filter(h => !h?.startsWith("The artist is:"));
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
      setMaxScore(2000);
      setMessage("Artist revealed! Your max score for this round is now capped.");
    }
  };

  const handleShare = useCallback(async () => {
    if (!infographicRef.current) return;
    try {
      infographicRef.current.style.left = '0px';
      const dataUrl = await htmlToImage.toPng(infographicRef.current, { quality: 0.95 });
      infographicRef.current.style.left = '-9999px';
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      alert("Results image copied to clipboard!");
    } catch (error) {
      if (infographicRef.current) infographicRef.current.style.left = '-9999px';
      alert('Could not copy image. Feature may not be supported on your browser.');
    }
  }, []);

  const renderLogin = () => (
    <div className="container">
      <h1>Pixel Jumble</h1>
      <p>Guess the album from your own Spotify history!</p>
      <a href="https://pixel-jumble-backend.onrender.com/login" className="login-button">Connect with Spotify</a>
    </div>
  );

  const renderModeSelect = () => (
    <div className="container">
      <h1>Select a Game Mode</h1>
      <p>Total Score: {totalScore} | Current Win Streak: {winStreak}</p>
      <p className="message">{message}</p>
      <div className="mode-buttons">
        <button onClick={() => handleTimeRangeChange('short_term')}>4 Weeks</button>
        <button onClick={() => handleTimeRangeChange('medium_term')}>6 Months</button>
        <button onClick={() => handleTimeRangeChange('long_term')}>All Time</button>
        <button 
          onClick={() => handleTimeRangeChange('daily_challenge')} 
          disabled={dailyChallengeLocked} 
          className="reveal-button"
        >
          {dailyChallengeLocked ? `Daily Unlocks in ${countdown}` : 'Daily Challenge'}
        </button>
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
          <button onClick={() => endGame(false)}>Give Up</button>
        </div>
      </div>
    </div>
  );

  const renderFinished = () => (
    <div className="container">
      <img src={gameData.coverUrl} alt={gameData.albumName} style={{ width: '300px', borderRadius: '8px' }}/>
      <div className="game-info">
        <div className='score-timer'>
            <span>Round Score: {score}</span>
            <span>Total Score: {totalScore}</span>
        </div>
        <p className="message">{message}</p>
        <p>Win Streak: {winStreak}</p>
        <div className='finished-buttons'>
          {/* ONLY show Continue if it wasn't a Daily Challenge loss */}
          {!(timeRange === 'daily_challenge' && didLose) && (
            <button onClick={playAgain} className="play-again-button">Continue</button>
          )}

          <button onClick={() => setGameState('mode_select')} className="play-again-button secondary">
            {timeRange === 'daily_challenge' && didLose ? "Back to Menu" : "Change Mode"}
          </button>

          <button onClick={handleShare} className="play-again-button share">Share Result</button>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
          <div id="share-infographic" ref={infographicRef}>
              <h2>Pixel Jumble</h2>
              <p>My Score:</p>
              <p className="final-score">{score}</p>
              <p className="streak">Current Win Streak: {winStreak}</p>
          </div>
      </div>
    </div>
  );
  
  if (!accessToken) return renderLogin();
  if (gameState === 'mode_select') return renderModeSelect();
  if (gameState === 'loading' || !gameData) return <div className="container"><h2>Loading your puzzle...</h2></div>;
  if (gameState === 'playing') return renderGame();
  if (gameState === 'finished') return renderFinished();
}

export default App;