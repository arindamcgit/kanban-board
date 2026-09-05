const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const PORT = process.env.PORT || 5000;

const listsRouter = require('./routes/lists');
const cardsRouter = require('./routes/cards');


const app = express();

app.use(cors());          // allow requests from other origins (our React app)
app.use(express.json());  // parse incoming JSON request bodies into req.body
app.use('/api/lists', listsRouter);
app.use('/api/cards', cardsRouter);


mongoose.connect(process.env.MONGO_URI)
  .then(() => {console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});