// /client/src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PixelatedImage from './PixelatedImage';
import * as htmlToImage from 'html-to-image';
import './App.css';

// LocalStorage Keys
const GUESSED_ALBUMS_KEY_PREFIX = 'pixelJumbleGuessedAlbums_';
const WIN_STREAK_KEY = 'pixelJumbleWinStreak';

// LocalStorage Helper Functions
const getGuessedAlbums = (timeRange) => JSON.parse(localStorage.getItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange) || '[]');
const addGuessedAlbum = (albumId, timeRange) => {
  const key = GUESSED_ALBUMS_KEY_PREFIX + timeRange;
  const guessed = getGuessedAlbums(timeRange);
  if (!guessed.includes(albumId)) {
    localStorage.setItem(key, JSON.stringify([...guessed, albumId]));
  }
};
const getWinStreak = () => parseInt(localStorage.getItem(WIN_STREAK_KEY) || '0');
const incrementWinStreak = () => localStorage.setItem(WIN_STREAK_KEY, getWinStreak() + 1);
const resetWinStreak = () => localStorage.setItem(WIN_STREAK_KEY, '0');


function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [gameState, setGameState] = useState('login');
  const [gameData, setGameData] = useState(null);
  const [timeRange, setTimeRange] = useState('long_term');
  const [pixelationLevel, setPixelationLevel] = useState(3); // More aggressive pixelation
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState([]);
  const [availableHints, setAvailableHints] = useState([]);
  
  // NEW SCORING SYSTEM STATE
  const [score, setScore] = useState(0);
  const [winStreak, setWinStreak] = useState(getWinStreak());
  const [timeLeft, setTimeLeft] = useState(40);
  const timerRef = useRef(null);
  const infographicRef = useRef(null);

  useEffect(() => {
    // Timer logic: score goes down over time
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (gameState !== 'playing' || timeLeft === 0) {
      clearInterval(timerRef.current);
      if (timeLeft === 0 && gameState === 'playing') {
        setMessage("Time's up! Game Over.");
        endGame(false); // Game over, no win
      }
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft]);


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
          const response = await axios.get(`https://pixel-jumble-backend.onrender.com/game-data/game-data`, {
            params: { access_token: accessToken, exclude: guessedIds.join(','), time_range: timeRange }
          });
          if (response.headers['x-reset-guessed-list'] === 'true') {
            localStorage.removeItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange);
          }
          const data = response.data;
          setGameData(data);
          setHints([`Album was released on ${data.releaseDate}`]);
          const hintPool = [
            data.availableHints.playCount, data.availableHints.artistPopularity,
            data.availableHints.primaryGenre, data.availableHints.artistBirthDate,
            data.availableHints.similarArtist, data.availableHints.albumTrack,
          ].filter(hint => hint !== null);
          setAvailableHints(hintPool);
          setGameState('playing');
          setTimeLeft(40);
          setScore(0);
        } catch (error) {
          setMessage('Could not load a puzzle. Try a different time range.');
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
    setPixelationLevel(3);
    setMessage('');
    setHints([]);
    setAvailableHints([]);
  };

  const endGame = (isWin) => {
    if (isWin) {
      // Calculate final score based on time left, with a base score
      const timeBonus = timeLeft * 100;
      const streakBonus = getWinStreak() > 0 ? (getWinStreak() * 250) : 0;
      const finalScore = 1000 + timeBonus + streakBonus;
      setScore(finalScore);
      incrementWinStreak();
      setWinStreak(getWinStreak());
      setMessage(`Correct! It's ${gameData.albumName}. Your score: ${finalScore}`);
    } else {
      // Game over on wrong guess or time up
      resetWinStreak();
      setWinStreak(0);
      setScore(0);
    }
    setGameState('finished');
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess) return;
    const simplifiedGuess = guess.toLowerCase().trim();
    if (simplifiedGuess === gameData.simplifiedAlbumName) {
      addGuessedAlbum(gameData.albumId, timeRange);
      endGame(true); // Win!
    } else {
      setMessage('Incorrect! Game Over.');
      endGame(false); // Lose!
    }
    setGuess('');
  };

  const addHint = () => {
    if (availableHints.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableHints.length);
      const nextHint = availableHints[randomIndex];
      setHints([...hints, nextHint]);
      setAvailableHints(availableHints.filter((_, index) => index !== randomIndex));
    } else {
      setMessage("No more hints available!");
    }
  };

  const handleShare = async () => {
    if (!infographicRef.current) return;
    try {
        const dataUrl = await htmlToImage.toPng(infographicRef.current);
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        alert("Results image copied to clipboard!");
    } catch (error) {
        console.error('Sharing failed:', error);
        alert('Could not copy image. Feature may not be supported on your browser.');
    }
  };

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
      <p>Current Win Streak: {winStreak}</p>
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
            <span>Score: {score}</span>
            <span>Time: {timeLeft}</span>
        </div>
        <h2>Pixel Jumble - Guess the album</h2>
        <ul>{hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul>
        <form onSubmit={handleGuess}>
          <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess here..."/>
        </form>
        <p className="message">{message}</p>
        <div className="hint-buttons">
          <button onClick={addHint}>Add Hint</button>
          <button onClick={() => { setMessage('Game Over.'); endGame(false); }}>End Game</button>
        </div>
      </div>
    </div>
  );

  const renderFinished = () => {
      const guessedAlbums = getGuessedAlbums(timeRange);
      return (
        <div className="container">
          <img src={gameData.coverUrl} alt={gameData.albumName} style={{ width: '300px', borderRadius: '8px' }}/>
          <div className="game-info">
            <div className='score-timer'>
                <span>Final Score: {score}</span>
                <span>Win Streak: {winStreak}</span>
            </div>
            <p className="message">{message}</p>
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
                    <p>Recently Guessed in this Mode:</p>
                    <ul>
                      {guessedAlbums.slice(-5).map(id => <li key={id}>- Guessed an album</li>)}
                    </ul>
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