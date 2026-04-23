// /client/src/App.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Modal from 'react-modal'; // NEW: Import Modal
import PixelatedImage from './PixelatedImage';
import ShareCard from './ShareCard';
import * as htmlToImage from 'html-to-image';
import { FastAverageColor } from 'fast-average-color';
import './App.css';
import './ShareCard.css'; // Import the new CSS file

// Set the app element for accessibility
Modal.setAppElement('#root');

// LocalStorage Keys
const GUESSED_ALBUMS_KEY_PREFIX = 'pixelJumbleGuessedAlbums_';
const WIN_STREAK_KEY = 'pixelJumbleWinStreak';
const LONGEST_WIN_STREAK_KEY = 'pixelJumbleLongestWinStreak';
const TOTAL_SCORE_KEY = 'pixelJumbleTotalScore';
const DAILY_CHALLENGE_KEY = 'pixelJumbleDailyChallenge';

// LocalStorage Helper Functions
const getGuessedAlbums = (timeRange) => JSON.parse(localStorage.getItem(GUESSED_ALBUMS_KEY_PREFIX + timeRange) || '[]');
const addGuessedAlbum = (albumData, timeRange) => {
  const key = GUESSED_ALBUMS_KEY_PREFIX + timeRange;
  let guessed = getGuessedAlbums(timeRange);
  // Add new guess to the top of the list
  guessed.unshift({ id: albumData.albumId, name: albumData.albumName });
  // Keep only the most recent 5
  guessed = guessed.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(guessed));
};
const getWinStreak = () => parseInt(localStorage.getItem(WIN_STREAK_KEY) || '0');
const incrementWinStreak = () => {
  const newStreak = getWinStreak() + 1;
  localStorage.setItem(WIN_STREAK_KEY, newStreak);
  const longestStreak = getLongestWinStreak();
  if (newStreak > longestStreak) {
    localStorage.setItem(LONGEST_WIN_STREAK_KEY, newStreak);
  }
};
const resetWinStreak = () => localStorage.setItem(WIN_STREAK_KEY, '0');
const getLongestWinStreak = () => parseInt(localStorage.getItem(LONGEST_WIN_STREAK_KEY) || '0');
const getTotalScore = () => parseInt(localStorage.getItem(TOTAL_SCORE_KEY) || '0');
const updateTotalScore = (newScore) => localStorage.setItem(TOTAL_SCORE_KEY, newScore);
const getDailyChallenge = () => JSON.parse(localStorage.getItem(DAILY_CHALLENGE_KEY) || '{ "completionTime": null }');
const saveDailyCompletion = () => localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify({ completionTime: Date.now() }));

const DEFAULT_BG = 'radial-gradient(circle at center, #1a1a1a 0%, #121212 70%)';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [gameState, setGameState] = useState('login');
  const [gameData, setGameData] = useState(null);
  const [timeRange, setTimeRange] = useState('long_term');
  const [pixelationLevel, setPixelationLevel] = useState(20);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState('neutral'); // neutral, correct, incorrect
  const [hints, setHints] = useState([]);
  const [availableHints, setAvailableHints] = useState([]);
  const [artistRevealed, setArtistRevealed] = useState(false);
  const [songHintUsed, setSongHintUsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(getTotalScore());
  const [winStreak, setWinStreak] = useState(getWinStreak());
  const [guessesLeft, setGuessesLeft] = useState(5);
  const [timeLeft, setTimeLeft] = useState(40);
  const [maxScore, setMaxScore] = useState(10000);
  const [dailyChallengeLocked, setDailyChallengeLocked] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [didLose, setDidLose] = useState(false);
  const timerRef = useRef(null);
  const infographicRef = useRef(null);
  const audioRef = useRef(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const openShareModal = () => setIsShareModalOpen(true);
  const closeShareModal = () => setIsShareModalOpen(false);
  const [dominantColor, setDominantColor] = useState(DEFAULT_BG);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!infographicRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(infographicRef.current, { pixelRatio: 2 });
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.download = 'pixel-jumble-stats.png';
      link.href = dataUrl;
      link.click(); // Programmatically click the link to start the download
      link.remove(); // Clean up the temporary link

    } catch (error) {
      console.error('Download failed:', error);
      alert('Could not download image.');
    }
  }, []);

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
    stopAudio();
    setDidLose(!isWin);
    if (isWin) {
      const timeBonus = timeLeft * 100;
      const streakBonus = getWinStreak() * 250;
      const dailyBonus = timeRange === 'daily_challenge' ? 5000 : 0;
      const finalScore = Math.min(maxScore, 1000 + timeBonus + streakBonus + dailyBonus);
      setScore(finalScore);
      incrementWinStreak();
      const newTotalScore = getTotalScore() + finalScore;
      updateTotalScore(newTotalScore);
      setTotalScore(newTotalScore);
      setMessageStatus('correct');
      setMessage(`Correct! It's ${gameData.albumName} by ${gameData.artistName}. You scored ${finalScore} points!`);
    } else {
      const streakBeforeReset = getWinStreak();
      resetWinStreak();
      setMessageStatus('incorrect');
      setMessage(message || `Game Over! The album was ${gameData.albumName} by ${gameData.artistName}. Your win streak was ${streakBeforeReset}.`);
    }
    setWinStreak(getWinStreak());
    setGameState('finished');
    if (gameData) { addGuessedAlbum(gameData, timeRange); }
    if (timeRange === 'daily_challenge') { saveDailyCompletion(); }
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
          // const response = await axios.get(`http://localhost:5000/game-data`, {
            params: { access_token: accessToken, exclude: guessedIds.join(','), time_range: apiTimeRange }
          });
          
          if (response.headers['x-reset-guessed-list'] === 'true') {
            localStorage.removeItem(GUESSED_ALBUMS_KEY_PREFIX + apiTimeRange);
          }
          
          const data = response.data;
          setGameData(data);

          const fac = new FastAverageColor();
          fac.getColorAsync(data.coverUrl, { algorithm: 'dominant' })
            .then(color => {
              // Create a radial gradient from the color
              const newBg = `radial-gradient(circle at center, ${color.hex}80 0%, #121212 70%)`;
              setDominantColor(newBg);
            })
            .catch(e => {
              console.error("Could not get dominant color:", e);
              setDominantColor(DEFAULT_BG); // Fallback to default
            });
          
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
          setDominantColor(DEFAULT_BG);
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
    setDominantColor(DEFAULT_BG);
    stopAudio();
    setGameState('loading');
    setGameData(null);
    setMessage('');
    setMessageStatus('neutral'); // Reset the message color
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
      setMessageStatus('correct');
      endGame(true);
    } else {
      setMessageStatus('incorrect');
      const newGuessesLeft = guessesLeft - 1;
      setGuessesLeft(newGuessesLeft);
      if (newGuessesLeft <= 0) {
        const streakBeforeReset = getWinStreak();
        endGame(false);
        setMessage(`Game Over! The album was ${gameData.albumName} by ${gameData.artistName}. Your win streak was ${streakBeforeReset}.`);
      } else {
        setMessage(`Incorrect. You have ${newGuessesLeft} guesses left.`);
        // BUG FIX: Increase pixelation level, don't decrease
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


    if (gameData?.availableHints?.songPreviewUrl && !songHintUsed) {
      setScore(prev => Math.max(0, prev - 1500)); // Apply penalty
      setSongHintUsed(true); // Mark as used
      
      const audio = new Audio(gameData.availableHints.songPreviewUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
  };

  const renderLogin = () => (
    <div className="container fade-in-slide-up">
      <h1>Pixel Jumble</h1>
      <p>Guess the album from your own Spotify history!</p>
      <a href="https://pixel-jumble-backend.onrender.com/login" className="login-button">Connect with Spotify 🎧</a>
      <p className="disclaimer">
        Due to the <a href="https://developer.spotify.com/documentation/web-api/concepts/quota-modes" target="_blank" rel="noopener noreferrer">Spotify API Policy</a>,
        as this app in Development Mode, please contact <a href="mailto:khantran@outlook.com">khantran@outlook.com</a> to have your account added to the user list.
      </p>
    </div>
  );

  const renderModeSelect = () => (
    <div className="container fade-in-slide-up">
      <h1>Select a Game Mode</h1>
      <p>Total Score: {totalScore} | Current Win Streak: {winStreak}</p>
      <p className={`message ${messageStatus}`}>{message}</p>
      <div className="mode-buttons">
        <button onClick={() => handleTimeRangeChange('short_term')}>4 Weeks 🕰️</button>
        <button onClick={() => handleTimeRangeChange('medium_term')}>6 Months 🗓️</button>
        <button onClick={() => handleTimeRangeChange('long_term')}>All Time 🌎</button>
        <button 
          onClick={() => handleTimeRangeChange('daily_challenge')} 
          disabled={dailyChallengeLocked} 
          className="reveal-button"
        >
          {dailyChallengeLocked ? `Daily Unlocks in ${countdown} 🔒` : 'Daily Challenge 🔥'}
        </button>
      </div>
    </div>
  );




  const renderGame = () => (
    <div className="container fade-in-slide-up">
      <PixelatedImage imageUrl={gameData.coverUrl} pixelationLevel={pixelationLevel} />
      <div className="game-info">
        <div className='score-timer'>
            <span>Time: {timeLeft} ⏱️</span>
            <span>Guesses: {guessesLeft} 🗳️</span>
        </div>
        <h2>Pixel Jumble - Guess the album</h2>
        <ul>{hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul>
        <form onSubmit={handleGuess}>
          <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess here..."/>
        </form>
        <p className={`message ${messageStatus}`}>{message}</p>
        <div className="hint-buttons">
          <button onClick={addHint}>Add Hint 💡</button>
          <button onClick={revealArtist} className="reveal-button" disabled={artistRevealed}>Reveal Artist (Reduced Score) 🎤</button>
          <button onClick={() => endGame(false)}>Give Up 🏳️</button>
        </div>
      </div>
    </div>
  );

  

  const renderFinished = () => {
    if (!gameData) return null;
    const spotifyEmbedUrl = `https://open.spotify.com/embed/album/${gameData.albumId}`;
    const showContinue = !(timeRange === 'daily_challenge' && didLose);
    const recentGuesses = getGuessedAlbums(timeRange);
    return (
      
      <div className="container fade-in-slide-up">
        <img src={gameData.coverUrl} alt={gameData.albumName} style={{ width: '300px', borderRadius: '8px' }}/>
        <div className="game-info">
          <div className='score-timer'>
              <span>Round Score: ⭐{score}</span>
              <span>Total Score: 🏆{totalScore}</span>
          </div>
          <p className={`message ${messageStatus}`}>{message}</p>
          <p>Current Win Streak: {winStreak}</p>

          <iframe
            className="spotify-embed"
            src={spotifyEmbedUrl}
            width="100%"
            height="380" // A good default height for album embeds
            frameBorder="0"
            allow="encrypted-media"
            title="Spotify Player"
            loading="lazy" // Improves performance
          ></iframe>

          <div className='finished-buttons'>
            {showContinue && (
              <button onClick={playAgain} className="play-again-button">Continue ⏭️</button>
            )}
            <button onClick={() => setGameState('mode_select')} className="play-again-button secondary">
              {showContinue ? "Change Mode ⚙️" : "Back to Menu 🏠"}
            </button>
            <button onClick={openShareModal} className="play-again-button share">Share Result 📤</button>
          </div>
        </div>
        
        {/* NEW: The Share Modal */}
        <Modal
          isOpen={isShareModalOpen}
          onRequestClose={closeShareModal}
          contentLabel="Share Your Results"
        >
          <div className="modal-content">
            <h2>Your Stats 📊</h2>
            {/* The ShareCard is now rendered inside the modal */}
            <ShareCard 
              ref={infographicRef}
              score={score}
              totalScore={totalScore}
              winStreak={getLongestWinStreak()}
              recentGuesses={recentGuesses}
              gameData={gameData}
            />
            <div className="modal-buttons">
              <button onClick={handleDownload} className="download-button">Download Image 💾</button>
              <button onClick={closeShareModal} className="close-button">Close ❌</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };
  
  <div className="app-wrapper" style={{ background: dominantColor }}></div>
  if (!accessToken) return renderLogin();
  if (gameState === 'mode_select') return renderModeSelect();
  if (gameState === 'loading' || !gameData) return <div className="container"><h2>Loading your puzzle...</h2></div>;
  if (gameState === 'playing') return renderGame();
  if (gameState === 'finished') return renderFinished();
}



export default App;