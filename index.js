const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// --- Middleware Setup ---
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- In-Memory Data Storage ---
let userDatabase = [];
let idCounter = 1;

// --- Routes ---

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// API Endpoint: Create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const newUserData = {
    username: username,
    _id: idCounter.toString(),
    log: []
  };

  userDatabase.push(newUserData);
  idCounter++; // Increment for the next user

  res.json({ username: newUserData.username, _id: newUserData._id });
});

// API Endpoint: Get a list of all users
app.get('/api/users', (req, res) => {
  const userListResponse = userDatabase.map(person => ({
    username: person.username,
    _id: person._id
  }));
  res.json(userListResponse);
});

// API Endpoint: Add an exercise for a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const foundUser = userDatabase.find(user => user._id === userId);
  if (!foundUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Handle date: use provided date or default to now
  const exerciseDate = date ? new Date(date) : new Date();

  const newExercise = {
    description: String(description),
    duration: parseInt(duration),
    date: exerciseDate // Store the full Date object
  };

  foundUser.log.push(newExercise);

  // This is the critical part for passing the date test
  const formattedDateString = new Date(exerciseDate.toISOString().split('T')[0]).toDateString();

  res.json({
    username: foundUser.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: formattedDateString,
    _id: foundUser._id
  });
});

// API Endpoint: Get a user's exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const foundUser = userDatabase.find(user => user._id === userId);
  if (!foundUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  let exerciseLog = [...foundUser.log];

  // Apply optional query filters
  if (from) {
    const fromDate = new Date(from);
    exerciseLog = exerciseLog.filter(exercise => new Date(exercise.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    exerciseLog = exerciseLog.filter(exercise => new Date(exercise.date) <= toDate);
  }
  if (limit) {
    exerciseLog = exerciseLog.slice(0, parseInt(limit));
  }

  // Format the log for the response, ensuring the date string is correct
  const formattedLog = exerciseLog.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    // This is the critical part for passing the date test in the log array
    date: new Date(new Date(exercise.date).toISOString().split('T')[0]).toDateString()
  }));

  res.json({
    _id: foundUser._id,
    username: foundUser.username,
    count: formattedLog.length,
    log: formattedLog
  });
});

// --- Start Server ---
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});