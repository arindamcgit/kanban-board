const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, required: true },
});

module.exports = mongoose.model('List', listSchema);
