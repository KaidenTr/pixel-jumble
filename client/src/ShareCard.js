// /client/src/ShareCard.js

import React from 'react';
import './ShareCard.css';

const ShareCard = React.forwardRef(({ score, totalScore, winStreak, recentGuesses, gameData }, ref) => {
  return (
    <div id="share-infographic" ref={ref}>
      <div className="share-header">
        <h1>PIXEL JUMBLE</h1>
        <span>How Well Do You Know Your Album Cover Art?</span>
      </div>
      <div className="share-main">
        <div className="share-album-art">
          <img src={gameData?.coverUrl} alt={gameData?.albumName} />
        </div>
        <div className="share-stats">
          <div className="stat-item">
            <span className="stat-value">{totalScore}</span>
            <span className="stat-label">Total Score</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{winStreak}</span>
            <span className="stat-label">Longest Streak</span>
          </div>
        </div>
      </div>
      <div className="share-footer">
        <h3>Recently Guessed Albums</h3>
        <ul>
          {recentGuesses.slice(0, 5).map((album, index) => (
            <li key={index}>{album.name}</li>
          ))}
        </ul>
        <span className="share-url">pixel-jumble.vercel.app</span>
      </div>
    </div>
  );
});

export default ShareCard;