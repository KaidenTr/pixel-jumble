// /client/src/App.js

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PixelatedImage from './PixelatedImage';
import './App.css';

// --- LocalStorage Helper Functions (Unchanged) ---
const GUESSED_ALBUMS_KEY_PREFIX = 'pixelJumbleGuessedAlbums_';

const getGuessedAlbums = (timeRange) => {
  const key = GUESSED_ALBUMS_KEY_PREFIX + timeRange;
  const guessed = localStorage.getItem(key);
  return guessed ? JSON.parse(guessed) : [];
};
const addGuessedAlbum = (albumId, timeRange) => {
  const key = GUESSED_ALBUMS_KEY_PREFIX + timeRange;
  const guessed = getGuessedAlbums(timeRange);
  if (!guessed.includes(albumId)) {
    localStorage.setItem(key, JSON.stringify([...guessed, albumId]));
  }
};
const clearGuessedAlbums = (timeRange) => {
  localStorage.removeItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange);
};


function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [gameState, setGameState] = useState('login');
  const [gameData, setGameData] = useState(null);
  const [timeRange, setTimeRange] = useState('long_term');
  const [pixelationLevel, setPixelationLevel] = useState(4);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState([]);
  const [availableHints, setAvailableHints] = useState([]);
  const [jumbledName, setJumbledName] = useState('');

  // --- NEW: Scoring and Timer State ---
  const [score, setScore] = useState(6000);
  const [timeLeft, setTimeLeft] = useState(40);
  const timerRef = useRef(null);

  useEffect(() => {
    // Timer logic
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        setScore(prev => Math.max(0, prev - 1)); // Lose 1 point per second
      }, 1000);
    } else if (gameState !== 'playing' || timeLeft === 0) {
      clearInterval(timerRef.current);
      if (timeLeft === 0 && gameState === 'playing') {
        setMessage("Time's up!");
        giveUp();
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
          const response = await axios.get(`https://pixel-jumble-backend.onrender.com/game-data`, {
            params: { access_token: accessToken, exclude: guessedIds.join(','), time_range: timeRange }
          });
          if (response.headers['x-reset-guessed-list'] === 'true') { clearGuessedAlbums(timeRange); }
          
          const data = response.data;
          setGameData(data);
          setHints([`Album was released on ${data.releaseDate}`]);
          
          const hintPool = [
            data.availableHints.playCount, data.availableHints.artistPopularity,
            data.availableHints.primaryGenre, data.availableHints.artistBirthDate,
          ].filter(hint => hint !== null);
          setAvailableHints(hintPool);
          
          setGameState('playing');
          setTimeLeft(40); // Reset timer for new game
          setScore(6000); // Reset score for new game
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
    setPixelationLevel(4);
    setMessage('');
    setHints([]);
    setAvailableHints([]);
    setJumbledName('');
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess) return;
    const simplifiedGuess = guess.toLowerCase().trim();
    if (simplifiedGuess === gameData.simplifiedAlbumName) {
      setMessage(`Correct! It's ${gameData.albumName} by ${gameData.artistName}.`);
      addGuessedAlbum(gameData.albumId, timeRange);
      setGameState('finished');
    } else {
      setMessage('Incorrect. Try again!');
      setScore(prev => Math.max(0, prev - 1000)); // Lose 1000 points for wrong guess
      if (pixelationLevel < 16) {
        setPixelationLevel(pixelationLevel + 1);
      }
    }
    setGuess('');
  };

  const addHint = () => {
    if (availableHints.length > 0) {
      // --- NEW: Dynamic/Random Hint ---
      const randomIndex = Math.floor(Math.random() * availableHints.length);
      const nextHint = availableHints[randomIndex];
      setHints([...hints, nextHint]);
      // Remove the used hint from the pool
      setAvailableHints(availableHints.filter((_, index) => index !== randomIndex));
      setScore(prev => Math.max(0, prev - 500)); // Lose 500 points for a hint
    } else {
      setMessage("No more hints available!");
    }
  };

  const showJumbledName = () => {
    if (gameData.albumName) {
      const shuffled = gameData.simplifiedAlbumName.split('').sort(() => 0.5 - Math.random()).join('');
      setJumbledName(shuffled);
      setScore(prev => Math.max(0, prev - 750)); // Lose 750 points for jumbled name
    }
  };

  const giveUp = () => {
    setMessage(`The album was ${gameData.albumName} by ${gameData.artistName}.`);
    addGuessedAlbum(gameData.albumId, timeRange);
    setGameState('finished');
    setScore(0); // Score is 0 if you give up
  };

  // --- NEW: Share Results ---
  const handleShare = () => {
    const timeRangeMap = {
      short_term: "Recent Time",
      medium_term: "Broader Recent",
      long_term: "All Time"
    };
    const shareText = `Pixel Jumble - ${timeRangeMap[timeRange]}\nI scored ${score} points! 🎮\n\nGuess the album from your own Spotify history:\n[Your Vercel App URL]`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert("Results copied to clipboard!");
    });
  };


  // --- RENDER LOGIC with Updated Options ---
  if (!accessToken) {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        <a href="https://pixel-jumble-backend.onrender.com/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  }

  if (gameState === 'mode_select') {
    return (
      <div className="container">
        <h1>Select a Game Mode</h1>
        <p className="message">{message}</p>
        <div className="mode-buttons">
          {/* UPDATED: Renamed Options */}
          <button onClick={() => handleTimeRangeChange('short_term')}>Recent Time<br/><span>(Last 4 Weeks)</span></button>
          <button onClick={() => handleTimeRangeChange('medium_term')}>Broader Recent<br/><span>(Last 6 Months)</span></button>
          <button onClick={() => handleTimeRangeChange('long_term')}>All Time<br/><span>(Lifetime)</span></button>
        </div>
      </div>
    );
  }
  
  if (gameState === 'loading' || !gameData) {
    return <div className="container"><h2>Loading your puzzle...</h2></div>;
  }
  
  return (
    <div className="container">
      {gameState === 'finished' ? (
        <img src={gameData.coverUrl} alt={gameData.albumName} style={{ width: '300px', borderRadius: '8px' }}/>
      ) : (
        <PixelatedImage imageUrl={gameData.coverUrl} pixelationLevel={pixelationLevel} />
      )}
      
      <div className="game-info">
        <div className='score-timer'>
            <span>Score: {score}</span>
            <span>Time: {timeLeft}</span>
        </div>
        <h2>Pixel Jumble - Guess the album</h2>
        <ul>{hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul>
        {jumbledName && <p>Jumbled name: <strong>{jumbledName}</strong></p>}
        {gameState === 'playing' ? (
          <form onSubmit={handleGuess}>
            <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess here..."/>
          </form>
        ) : (
          <div className='finished-buttons'>
            <button onClick={playAgain} className="play-again-button">Play Again (Same Mode)</button>
            <button onClick={() => setGameState('mode_select')} className="play-again-button secondary">Change Mode</button>
            <button onClick={handleShare} className="play-again-button share">Share Result</button>
          </div>
        )}
        <p className="message">{message}</p>
        {gameState === 'playing' && (
          <div className="hint-buttons">
            <button onClick={addHint}>Add hint (-500)</button>
            <button onClick={showJumbledName}>Jumbled name (-750)</button>
            <button onClick={giveUp}>Give up</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;






          // Remember to update this URL for deployment
          // const response = await axios.get(`http://localhost:5000/game-data`, {
          // const response = await axios.get(`https://pixel-jumble-backend.onrender.com/game-data`, {




            /* 
    if (!accessToken) {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        <a href="http://localhost:5000/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  } 
  */
/*
    if (!accessToken) {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        <a href="https://pixel-jumble-backend.onrender.com/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  }
*/