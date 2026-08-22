const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, required: true },
  listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
});

module.exports = mongoose.model('Card', cardSchema);