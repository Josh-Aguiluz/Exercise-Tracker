require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const user = await newUser.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.log(err);
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select('_id username');
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) return res.send("Could not find user");

    // --- Start of the fix ---
    let dateObj;
    if (!date) {
      dateObj = new Date();
    } else {
      dateObj = new Date(date);
    }
    // --- End of the fix ---

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: dateObj,
    });
    const exercise = await newExercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    console.log(err);
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  try {
    const user = await User.findById(id);
    if (!user) return res.send("Could not find user");

    let dateObj = {};
    if (from) dateObj['$gte'] = new Date(from);
    if (to) dateObj['$lte'] = new Date(to);
    let filter = { userId: id };
    if (from || to) filter.date = dateObj;

    const exercises = await Exercise.find(filter).limit(+limit ?? 500);
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    console.log(err);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});