const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const List = require('../models/List')

// GET all cards, sorted by their order
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find().sort('order');
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new Card
router.post('/', async (req, res) => {
  try {
    const list = await List.findById(req.body.listId);
    if(!list){
      return res.status(404).json({ error: 'listId does not refer to an existing List'})
    }
    const card = await Card.create(req.body);
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update a Card (rename, change order, etc.)
router.put('/:id', async (req, res) => {
  try {
    if (req.body.listId) {
      const list = await List.findById(req.body.listId);
      if (!list) {
        return res.status(404).json({ error: 'listId does not refer to an existing List' });
      }
    }
    const card = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// DELETE a Card
router.delete('/:id', async (req, res) => {
  try {
    await Card.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
