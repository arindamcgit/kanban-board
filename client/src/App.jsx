import { useState, useEffect } from 'react';
import './App.css';
import List from './components/List';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/lists`).then((res) => res.json()),
      fetch(`${API_URL}/api/cards`).then((res) => res.json()),
    ])
      .then(([listsData, cardsData]) => {
        setLists(listsData);
        setCards(cardsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findListIdForCard = (cardId, cardsArr) => cardsArr.find((c) => c._id === cardId)?.listId;

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeListId = findListIdForCard(active.id, cards);
    const overCard = cards.find((c) => c._id === over.id);
    const overListId = overCard ? overCard.listId : over.id; // over.id is a List's id when hovering empty space

    if (!activeListId || !overListId || activeListId === overListId) return;

    setCards((prev) =>
      prev.map((c) => (c._id === active.id ? { ...c, listId: overListId } : c))
    );
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const listId = findListIdForCard(active.id, cards); // reflects any list change onDragOver already made
    if (!listId) return;

    const listCards = cards.filter((c) => c.listId === listId).sort((a, b) => a.order - b.order);
    const oldIndex = listCards.findIndex((c) => c._id === active.id);
    if (oldIndex === -1) return;

    const overCard = cards.find((c) => c._id === over.id);
    const newIndex = overCard && overCard.listId === listId
      ? listCards.findIndex((c) => c._id === over.id)
      : listCards.length - 1;

    const reordered = arrayMove(listCards, oldIndex, newIndex).map((c, idx) => ({ ...c, order: idx }));

    setCards((prev) => prev.map((c) => reordered.find((r) => r._id === c._id) || c));

    reordered.forEach((c) => {
      fetch(`${API_URL}/api/cards/${c._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: c.order, listId: c.listId }),
      });
    });
  };


  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const res = await fetch(`${API_URL}/api/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newListTitle, order: lists.length }),
    });
    const newList = await res.json();
    setLists([...lists, newList]);
    setNewListTitle('');
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list and all its cards?')) return;
    await fetch(`${API_URL}/api/lists/${listId}`, { method: 'DELETE' });
    setLists(lists.filter((l) => l._id !== listId));
    setCards(cards.filter((c) => c.listId !== listId));
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Delete this card?')) return;
    await fetch(`${API_URL}/api/cards/${cardId}`, { method: 'DELETE' });
    setCards(cards.filter((c) => c._id !== cardId));
  };

  const handleAddCard = async (listId, title) => {
    const listCards = cards.filter((c) => c.listId === listId);

    const res = await fetch(`${API_URL}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, order: listCards.length, listId }),
    });
    const newCard = await res.json();
    setCards([...cards, newCard]);
  };




  if (isLoading) return <div className="status">Loading board...</div>;
  if (error) return <div className="status error">Failed to load board: {error}</div>;

  return (
    <div>
      <h1>Kanban Board</h1>
      <form onSubmit={handleAddList}>
        <input
          value={newListTitle}
          onChange={(e) => setNewListTitle(e.target.value)}
          placeholder="New list title"
        />
        <button type="submit">Add List</button>
      </form>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <div className="lists">
          {lists.map((list) => (
            <List
              key={list._id}
              list={list}
              cards={cards.filter((card) => card.listId === list._id).sort((a, b) => a.order - b.order)}
              onDeleteList={handleDeleteList}
              onDeleteCard={handleDeleteCard}
              onAddCard={handleAddCard}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

export default App;
