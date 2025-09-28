const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('strictQuery', true); // Suppresses a deprecation warning

// --- Database Schemas and Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// --- Middleware Setup ---
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

// --- Routes ---

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// API Endpoint: Create a new user and save to database
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Could not create user' });
  }
});

// API Endpoint: Get a list of all users from database
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await User.find({}).select('username _id');
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve users' });
  }
});

// API Endpoint: Add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const foundUser = await User.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newExercise = new Exercise({
      userId: foundUser._id,
      description: String(description),
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await newExercise.save();

    res.json({
      username: foundUser.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: foundUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not add exercise' });
  }
});

// API Endpoint: Get a user's exercise log from database
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const foundUser = await User.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = { userId: userId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0);

    const formattedLog = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: foundUser._id,
      username: foundUser.username,
      count: exercises.length,
      log: formattedLog
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve logs' });
  }
});

// --- Start Server ---
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});