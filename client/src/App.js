// /client/src/App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PixelatedImage from './PixelatedImage';
import './App.css';

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
  const [pixelationLevel, setPixelationLevel] = useState(30); // Start with bigger, blurrier blocks
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
      setGameState('mode_select'); // Go to mode select after login
      window.history.pushState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (gameState === 'loading' && accessToken) {
      const fetchGameData = async () => {
        try {
          const guessedIds = getGuessedAlbums(timeRange);
          // Remember to update this URL for deployment
          const response = await axios.get(`http://localhost:5000/game-data`, {
            params: { 
              access_token: accessToken, 
              exclude: guessedIds.join(','),
              time_range: timeRange 
            }
          });

          if (response.headers['x-reset-guessed-list'] === 'true') {
            clearGuessedAlbums(timeRange);
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
          setMessage('Could not load a puzzle. Try a different time range or log in again.');
          setGameState('mode_select'); // Go back to mode select on error
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
    setPixelationLevel(30);
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
      if (pixelationLevel < 50) setPixelationLevel(pixelationLevel - 5);
    }
    setGuess('');
  };
  
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

  const giveUp = () => {
    setMessage(`The album was ${gameData.albumName} by ${gameData.artistName}.`);
    addGuessedAlbum(gameData.albumId, timeRange);
    setGameState('finished');
  };

  if (!accessToken) {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        <a href="http://localhost:5000/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  }

  if (gameState === 'mode_select') {
    return (
      <div className="container">
        <h1>Select a Game Mode</h1>
        <p className="message">{message}</p>
        <div className="mode-buttons">
          <button onClick={() => handleTimeRangeChange('short_term')}>Recent Hits<br/><span>(Last 4 Weeks)</span></button>
          <button onClick={() => handleTimeRangeChange('medium_term')}>Recent Favorites<br/><span>(Last 6 Months)</span></button>
          <button onClick={() => handleTimeRangeChange('long_term')}>All-Time Classics<br/><span>(Lifetime)</span></button>
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
          </div>
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