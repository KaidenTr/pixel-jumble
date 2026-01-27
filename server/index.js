// /server/index.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
// IMPORTANT: For deployment, change this to your Vercel URL
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://localhost:3000'; 
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/callback';

app.use(cors());

// =================== AUTHENTICATION ROUTES ===================
app.get('/login', (req, res) => {
  const scope = 'user-top-read';
  const authUrl = 'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }).toString();
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  try {
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')),
      },
    });
    const { access_token, refresh_token } = response.data;
    res.redirect(`${FRONTEND_URI}/?access_token=${access_token}`);
  } catch (error) {
    console.error("Error in /callback:", error.response ? error.response.data : error.message);
    res.redirect(`${FRONTEND_URI}/?error=auth_failed`);
  }
});

// =================== GAME LOGIC ROUTE ===================
app.get('/game-data', async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(400).json({ error: 'Access token not provided' });
  }

  try {
    // 1. Get user's top 50 tracks from the last 6 months
    const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { 'Authorization': `Bearer ${access_token}` },
      params: { time_range: 'medium_term', limit: 50 }
    });
    const topTracks = topTracksResponse.data.items;

    if (topTracks.length === 0) {
      return res.status(404).json({ error: "No top tracks found to generate a game." });
    }

    // 2. Pick a random track to be the answer
    const answerTrack = topTracks[Math.floor(Math.random() * topTracks.length)];
    const answerAlbum = answerTrack.album;
    const answerArtist = answerTrack.artists[0];

    // 3. (Hint) Calculate how many songs from this album are in the user's top 50
    const songsFromAlbumCount = topTracks.filter(track => track.album.id === answerAlbum.id).length;
    const playCountHint = `You have ${songsFromAlbumCount} song${songsFromAlbumCount > 1 ? 's' : ''} from this album in your recent top tracks.`;

    // 4. (Hint) Get artist birth date from MusicBrainz API
    let artistBirthDate = null;
    try {
      const mbArtistResponse = await axios.get(`https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(answerArtist.name)}&fmt=json`);
      const mbArtist = mbArtistResponse.data.artists.find(artist => artist.name.toLowerCase() === answerArtist.name.toLowerCase());
      if (mbArtist && mbArtist['life-span'] && mbArtist['life-span'].begin) {
        artistBirthDate = new Date(mbArtist['life-span'].begin).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    } catch (mbError) {
      console.error("Could not fetch from MusicBrainz:", mbError.message);
    }

    // 5. Send the complete game packet
    res.json({
      albumName: answerAlbum.name,
      artistName: answerArtist.name,
      coverUrl: answerAlbum.images[0].url, // Use the highest resolution image
      releaseDate: answerAlbum.release_date,
      playCountHint: playCountHint,
      artistBirthDate: artistBirthDate,
    });

  } catch (error) {
    console.error("Error in /game-data:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to generate game data.' });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server listening on port ${port}`);
});