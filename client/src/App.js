// /client/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PixelatedImage from './PixelatedImage';
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [gameState, setGameState] = useState('login'); // login, loading, playing, finished
  const [gameData, setGameData] = useState(null);
  const [pixelationLevel, setPixelationLevel] = useState(12);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState([]);
  const [jumbledName, setJumbledName] = useState('');

  // Handle Login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    if (token) {
      setAccessToken(token);
      setGameState('loading');
      window.history.pushState({}, document.title, "/");
    }
  }, []);

  // Fetch Game Data
  useEffect(() => {
    if (gameState === 'loading' && accessToken) {
      const fetchGameData = async () => {
        try {
          // Change to your deployed Render URL
          const response = await axios.get(`http://localhost:5000/game-data?access_token=${accessToken}`);
          setGameData(response.data);
          setHints([`Album was released on ${response.data.releaseDate}`]);
          setGameState('playing');
        } catch (error) {
          console.error("Error fetching game data", error);
          setMessage('Could not load game. Do you have any recent listening history?');
        }
      };
      fetchGameData();
    }
  }, [gameState, accessToken]);

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess) return;

    // Simple check (can be improved with string similarity)
    if (guess.toLowerCase().trim() === gameData.albumName.toLowerCase().trim()) {
      setMessage(`Correct! The album is ${gameData.albumName} by ${gameData.artistName}.`);
      setGameState('finished');
    } else {
      setMessage('Incorrect. Try again!');
      // Make it easier
      if (pixelationLevel < 32) {
        setPixelationLevel(pixelationLevel + 4);
      }
    }
    setGuess('');
  };

  const addHint = () => {
    if (gameData.artistBirthDate && !hints.some(h => h.includes('born'))) {
      setHints([...hints, `The artist was born on ${gameData.artistBirthDate}`]);
    } else if (gameData.playCountHint && !hints.some(h => h.includes('top tracks'))) {
      setHints([...hints, gameData.playCountHint]);
    } else {
      setMessage("No more hints available!");
    }
  };

  const showJumbledName = () => {
    if (gameData.albumName) {
      const shuffled = gameData.albumName.split('').sort(() => 0.5 - Math.random()).join('');
      setJumbledName(shuffled);
    }
  };

  const giveUp = () => {
    setMessage(`The album was ${gameData.albumName} by ${gameData.artistName}.`);
    setGameState('finished');
  };

  const playAgain = () => {
    setGameState('loading');
    setGameData(null);
    setPixelationLevel(12);
    setMessage('');
    setHints([]);
    setJumbledName('');
  };

  if (gameState === 'login') {
    return (
      <div className="container">
        <h1>Pixel Jumble</h1>
        <p>Guess the album from your own Spotify history!</p>
        <a href="http://localhost:5000/login" className="login-button">Connect with Spotify</a>
      </div>
    );
  }

  if (gameState === 'loading' || !gameData) {
    return <div className="container"><h2>Loading your next puzzle...</h2></div>;
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
        <ul>
          {hints.map((hint, i) => <li key={i}>{hint}</li>)}
        </ul>
        {jumbledName && <p>Jumbled name: <strong>{jumbledName}</strong></p>}

        {gameState === 'playing' ? (
          <form onSubmit={handleGuess}>
            <label>Add answer</label>
            <input 
              type="text" 
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type your guess here..."
            />
          </form>
        ) : (
          <button onClick={playAgain} className="play-again-button">Play Again</button>
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