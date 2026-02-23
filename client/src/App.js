// /client/src/App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PixelatedImage from './PixelatedImage';
import './App.css';

const GUESSED_ALBUMS_KEY_PREFIX = 'pixelJumbleGuessedAlbums_';

// Modified to handle different keys for each time range
const getGuessedAlbums = (timeRange) => {
  const guessed = localStorage.getItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange);
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
  // NEW: State to manage the selected time range, defaults to 'long_term'
  const [timeRange, setTimeRange] = useState('long_term'); 
  
  // All other state variables remain the same
  const [pixelationLevel, setPixelationLevel] = useState(12);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState([]);
  const [availableHints, setAvailableHints] = useState([]);
  const [jumbledName, setJumbledName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    if (token) {
      setAccessToken(token);
      setGameState('loading');
      window.history.pushState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (gameState === 'loading' && accessToken) {
      const fetchGameData = async () => {
        try {
          const guessedIds = getGuessedAlbums(timeRange); // Get guessed albums for the current time range
          const response = await axios.get(`http://localhost:5000/game-data`, {
            params: { 
              access_token: accessToken, 
              exclude: guessedIds.join(','),
              time_range: timeRange // Send the selected time range to the backend
            }
          });

          if (response.headers['x-reset-guessed-list'] === 'true') {
            clearGuessedAlbums(timeRange); // Clear progress only for this time range
          }
          const data = response.data;
          setGameData(data);
          setHints([`Album was released on ${data.releaseDate}`]);
          const hintPool = [
            data.availableHints.playCount, data.availableHints.artistPopularity,
            data.availableHints.primaryGenre, data.availableHints.artistBirthDate,
          ].filter(hint => hint !== null);
          setAvailableHints(hintPool);
          setGameState('playing');
        } catch (error) {
          console.error("Error fetching game data", error);
          setMessage('Could not load a new puzzle. Try a different time range or log in again.');
        }
      };
      fetchGameData();
    }
  }, [gameState, accessToken, timeRange]); // Re-fetch data if timeRange changes

  // NEW: Handler to change the game mode
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    playAgain(); // Reset the game state to trigger a new fetch
  };

  const playAgain = () => {
    setGameState('loading');
    setGameData(null);
    setPixelationLevel(12);
    setMessage('');
    setHints([]);
    setAvailableHints([]);
    setJumbledName('');
  };

  // handleGuess and giveUp now need to know the current timeRange
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
      if (pixelationLevel < 32) setPixelationLevel(pixelationLevel + 4);
    }
    setGuess('');
  };

  const giveUp = () => {
    setMessage(`The album was ${gameData.albumName} by ${gameData.artistName}.`);
    addGuessedAlbum(gameData.albumId, timeRange);
    setGameState('finished');
  };
  
  //... (showJumbledName and addHint remain the same)

  // --- RENDER LOGIC with new Time Range Selector ---
  if (!accessToken) {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        <a href="http://localhost:5000/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  }

  // Show a screen to select game mode after login
  if (gameState === 'login' || (gameState !== 'loading' && !gameData)) {
    return (
      <div className="container">
        <h1>Select a Game Mode</h1>
        <div className="hint-buttons">
          <button onClick={() => handleTimeRangeChange('short_term')}>Recent Hits (4 Weeks)</button>
          <button onClick={() => handleTimeRangeChange('medium_term')}>Favorites (6 Months)</button>
          <button onClick={() => handleTimeRangeChange('long_term')}>All-Time Classics</button>
        </div>
      </div>
    );
  }
  
  if (gameState === 'loading' || !gameData) {
    return <div className="container"><h2>Loading your puzzle...</h2></div>;
  }
  
  const addHint = () => {
    if (availableHints.length > 0) {
      const nextHint = availableHints[0];
      setHints([...hints, nextHint]);
      setAvailableHints(availableHints.slice(1));
    } else {
      setMessage("No more hints available!");
    }
  };

  const showJumbledName = () => {
    if (gameData.albumName) {
      const shuffled = gameData.simplifiedAlbumName.split('').sort(() => 0.5 - Math.random()).join('');
      setJumbledName(shuffled);
    }
  };


  if (gameState === 'login') {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        {/* Remember to use your deployed Render URL (or ngrok URL) here */}
        <a href="https://1b9d-2601-646-a088-5690-b1ca-cea6-b2d7-dcbe.ngrok-free.app/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  }

  if (gameState === 'loading' || !gameData) {
    return <div className="container"><h2>Loading your next puzzle...</h2></div>;
  }

  // The main game screen
  return (
    <div className="container">
      {gameState === 'finished' ? (
        <img src={gameData.coverUrl} alt={gameData.albumName} style={{ width: '300px', borderRadius: '8px' }}/>
      ) : (
        <PixelatedImage imageUrl={gameData.coverUrl} pixelationLevel={pixelationLevel} />
      )}
      
      <div className="game-info">
        <h2>Pixel Jumble - Guess the album</h2>
        <ul>{hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul>
        {jumbledName && <p>Jumbled name: <strong>{jumbledName}</strong></p>}
        {gameState === 'playing' ? (
          <form onSubmit={handleGuess}>
            <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess here..."/>
          </form>
        ) : (
          <button onClick={() => setGameState('login')} className="play-again-button">Change Mode</button>
        )}
        <p className="message">{message}</p>
        {gameState === 'playing' && (
          <div className="hint-buttons">
            <button onClick={addHint}>Add hint</button>
            <button onClick={showJumbledName}>Jumbled name</button>
            <button onClick={giveUp}>Give up</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;