const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3007;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-Memory Store ────────────────────────────────────────────────────────
let movies = [
  {
    id: uuidv4(),
    title: 'Inception',
    genre: 'Sci-Fi',
    rating: 5,
    recommendation: 'Yes',
    imageUrl: '/images/inception.png'
  },
  {
    id: uuidv4(),
    title: 'The Dark Knight',
    genre: 'Action',
    rating: 5,
    recommendation: 'Yes',
    imageUrl: '/images/dark_knight.png'
  },
  {
    id: uuidv4(),
    title: 'Interstellar',
    genre: 'Sci-Fi',
    rating: 4,
    recommendation: 'Yes',
    imageUrl: '/images/interstellar.png'
  },
  {
    id: uuidv4(),
    title: 'The Room',
    genre: 'Drama',
    rating: 1,
    recommendation: 'No',
    imageUrl: '/images/the_room.png'
  },
  {
    id: uuidv4(),
    title: 'Avengers: Endgame',
    genre: 'Action',
    rating: 4,
    recommendation: 'Yes',
    imageUrl: '/images/avengers_endgame.png'
  },
  {
    id: uuidv4(),
    title: 'Morbius',
    genre: 'Action',
    rating: 2,
    recommendation: 'No',
    imageUrl: '/images/morbius.png'
  },
];

// ─── Validation Helper ───────────────────────────────────────────────────────
function validateMovie(body) {
  const errors = [];
  if (!body.title || typeof body.title !== 'string' || !body.title.trim())
    errors.push('title is required and must be a non-empty string.');
  if (!body.genre || typeof body.genre !== 'string' || !body.genre.trim())
    errors.push('genre is required and must be a non-empty string.');
  if (body.rating === undefined || body.rating === null)
    errors.push('rating is required.');
  const rating = Number(body.rating);
  if (isNaN(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating))
    errors.push('rating must be an integer between 1 and 5.');
  if (!body.recommendation)
    errors.push('recommendation is required.');
  const rec = String(body.recommendation).toLowerCase();
  if (rec !== 'yes' && rec !== 'no')
    errors.push('recommendation must be "Yes" or "No".');
  if (body.imageUrl !== undefined && typeof body.imageUrl !== 'string')
    errors.push('imageUrl must be a string.');
  return errors;
}

// ─── GET /movies ─────────────────────────────────────────────────────────────
app.get('/movies', (req, res) => {
  const { rating } = req.query;
  let result = movies;

  if (rating !== undefined) {
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5 || !Number.isInteger(r)) {
      return res.status(400).json({ error: 'rating filter must be an integer between 1 and 5.' });
    }
    result = movies.filter((m) => m.rating === r);
  }

  res.json({ count: result.length, movies: result });
});

// ─── POST /movies ─────────────────────────────────────────────────────────────
app.post('/movies', (req, res) => {
  const errors = validateMovie(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });

  const movie = {
    id: uuidv4(),
    title: req.body.title.trim(),
    genre: req.body.genre.trim(),
    rating: Number(req.body.rating),
    recommendation: req.body.recommendation.charAt(0).toUpperCase() + req.body.recommendation.slice(1).toLowerCase(),
    imageUrl: req.body.imageUrl ? String(req.body.imageUrl).trim() : '',
  };
  movies.push(movie);
  res.status(201).json(movie);
});

// ─── PATCH /movies/:id ────────────────────────────────────────────────────────
app.patch('/movies/:id', (req, res) => {
  const movie = movies.find((m) => m.id === req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found.' });

  const { title, genre, rating, recommendation } = req.body;
  const errors = [];

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) errors.push('title must be a non-empty string.');
    else movie.title = title.trim();
  }
  if (genre !== undefined) {
    if (typeof genre !== 'string' || !genre.trim()) errors.push('genre must be a non-empty string.');
    else movie.genre = genre.trim();
  }
  if (rating !== undefined) {
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5 || !Number.isInteger(r)) errors.push('rating must be an integer between 1 and 5.');
    else movie.rating = r;
  }
  if (recommendation !== undefined) {
    const rec = String(recommendation).toLowerCase();
    if (rec !== 'yes' && rec !== 'no') errors.push('recommendation must be "Yes" or "No".');
    else movie.recommendation = rec.charAt(0).toUpperCase() + rec.slice(1);
  }
  if (req.body.imageUrl !== undefined) {
    if (typeof req.body.imageUrl !== 'string') errors.push('imageUrl must be a string.');
    else movie.imageUrl = req.body.imageUrl.trim();
  }

  if (errors.length > 0) return res.status(400).json({ errors });
  res.json(movie);
});

// ─── DELETE /movies/:id ───────────────────────────────────────────────────────
app.delete('/movies/:id', (req, res) => {
  const idx = movies.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Movie not found.' });
  const deleted = movies.splice(idx, 1)[0];
  res.json({ message: 'Movie deleted successfully.', movie: deleted });
});

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.listen(PORT, () => {
  console.log(`🎬 Movie Recommendations API running at http://localhost:${PORT}`);
});
