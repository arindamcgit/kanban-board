const express = require('express');
const router = express.Router();
const List = require('../models/List');
const Card = require('../models/Card');

// GET all lists, sorted by their order
router.get('/', async (req, res) => {
  try {
    const lists = await List.find().sort('order');
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new list
router.post('/', async (req, res) => {
  try {
    const list = await List.create(req.body);
    res.status(201).json(list);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update a list (rename, change order, etc.)
router.put('/:id', async (req, res) => {
  try {
    const list = await List.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a list
router.delete('/:id', async (req, res) => {
  try {
    await Card.deleteMany({ listId: req.params.id });
    await List.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
