// /server/index.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://localhost:3000';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://faf2-2601-646-a088-5690-8889-5f1f-1174-1a5b.ngrok-free.app/callback';

app.use(cors({
  exposedHeaders: ['X-Reset-Guessed-List'], // Allow frontend to read this custom header
}));

// =================== HELPER FUNCTION ===================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const { access_token } = response.data;
    res.redirect(`${FRONTEND_URI}/?access_token=${access_token}`);
  } catch (error) {
    console.error("Error in /callback:", error.response ? error.response.data : error.message);
    res.redirect(`${FRONTEND_URI}/?error=auth_failed`);
  }
});

// =================== GAME LOGIC ROUTE ===================
app.get('/game-data', async (req, res) => {
  // Use 'long_term' as the default time range, but accept others
  const { access_token, exclude, time_range = 'long_term' } = req.query; 
  if (!access_token) {
    return res.status(400).json({ error: 'Access token not provided' });
  }

  try {
    const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { 'Authorization': `Bearer ${access_token}` },
      params: { time_range: time_range, limit: 50 } 
    });
    const topTracks = topTracksResponse.data.items;

    if (topTracks.length === 0) {
      return res.status(404).json({ error: "No top tracks found for this time range." });
    }

    const excludedAlbumIds = exclude ? exclude.split(',') : [];
    const validTracks = topTracks.filter(track => {
      const notExcluded = !excludedAlbumIds.includes(track.album.id);
      const hasSafeChars = /^[a-zA-Z0-9\s-:'&!?,.$"']+$/.test(track.album.name);
      return notExcluded && hasSafeChars;
    });

    let puzzlePool = validTracks;
    if (puzzlePool.length === 0 && topTracks.length > 0) {
      console.log(`Pool empty for ${time_range}, resetting.`);
      puzzlePool = topTracks.filter(track => /^[a-zA-Z0-9\s-:'&!?,.$"']+$/.test(track.album.name));
      res.setHeader('X-Reset-Guessed-List', 'true');
    }

    if (puzzlePool.length === 0) {
      return res.status(404).json({ error: "No suitable albums found for a puzzle." });
    }

    const answerTrack = puzzlePool[Math.floor(Math.random() * puzzlePool.length)];
    const answerAlbum = answerTrack.album;
    const answerArtist = answerTrack.artists[0];

    const simplifyName = (name) => name.toLowerCase().split(/[:(]/)[0].trim();
    const simplifiedAlbumName = simplifyName(answerAlbum.name);

    await sleep(1000); // Respect external API rate limits

    const artistDetailsResponse = await axios.get(`https://api.spotify.com/v1/artists/${answerArtist.id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const artistPopularityHint = `The artist has a Spotify popularity score of ${artistDetailsResponse.data.popularity}/100.`;
    const primaryGenreHint = artistDetailsResponse.data.genres.length > 0 ? `One of the artist's primary genres is: ${artistDetailsResponse.data.genres[0]}` : null;

    let artistBirthDate = null;
    try {
      console.log(`  -> Searching MusicBrainz for artist: ${answerArtist.name}`);
      const mbArtistSearch = await axios.get(`https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(answerArtist.name)}&fmt=json`, {
        headers: { 'User-Agent': 'PixelJumble/1.0 (your-email@example.com)' } // Replace with your email
      });
      const spotifyUrl = `https://open.spotify.com/artist/${answerArtist.id}`;
      let correctMbArtist = mbArtistSearch.data.artists.find(artist => 
        artist.relations && artist.relations.some(rel => rel.url && rel.url.resource === spotifyUrl)
      );
      if (!correctMbArtist && mbArtistSearch.data.artists.length > 0) {
        correctMbArtist = mbArtistSearch.data.artists[0];
      }

      if (correctMbArtist) {
        const wikidataRelation = correctMbArtist.relations?.find(rel => rel.type === 'wikidata');
        if (wikidataRelation) {
          const wikidataId = wikidataRelation.url.resource.split('/').pop();
          await sleep(1000); // Wait before hitting the next API
          const wikidataResponse = await axios.get(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&format=json&props=claims`);
          const claims = wikidataResponse.data.entities[wikidataId].claims;
          const birthDateClaim = claims.P569;
          if (birthDateClaim) {
            const birthDateValue = birthDateClaim[0].mainsnak.datavalue.value.time;
            artistBirthDate = new Date(birthDateValue.slice(1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          }
        }
        if (!artistBirthDate && correctMbArtist['life-span'] && correctMbArtist['life-span'].begin) {
          artistBirthDate = new Date(correctMbArtist['life-span'].begin).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    } catch (e) {
      console.error(`  -> ERROR fetching external artist data: ${e.message}`);
    }
    
    res.json({
      albumId: answerAlbum.id, albumName: answerAlbum.name, simplifiedAlbumName: simplifiedAlbumName,
      artistName: answerArtist.name, coverUrl: answerAlbum.images[0].url, releaseDate: answerAlbum.release_date,
      availableHints: {
        playCount: `You have ${topTracks.filter(t => t.album.id === answerAlbum.id).length} song(s) from this album in your top tracks for this period.`,
        artistPopularity: artistPopularityHint, primaryGenre: primaryGenreHint,
        artistBirthDate: artistBirthDate ? `The artist was born on ${artistBirthDate}` : null,
      }
    });

  } catch (error) {
    console.error("Error in /game-data:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to generate game data.' });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server listening on port ${port}`);
});