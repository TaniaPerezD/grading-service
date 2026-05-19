const express = require('express');
const cors = require('cors');
const gradingRoutes = require('./routes/grading.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/grading', gradingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Grading Service funcionando' });
});

module.exports = app;