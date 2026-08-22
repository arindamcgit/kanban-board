import { useState } from 'react';
import Card from './Card';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

function List({ list, cards, onDeleteList, onDeleteCard, onAddCard }) {
  const [newCardTitle, setNewCardTitle] = useState('');
  const { setNodeRef } = useDroppable({ id: list._id });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    onAddCard(list._id, newCardTitle);
    setNewCardTitle('');
  };

  return (
    <div className="list">
      <h3>
        {list.title}
        <button onClick={() => onDeleteList(list._id)}>Delete List</button>
      </h3>
      <div ref={setNodeRef} className="card-drop-zone">
      <SortableContext items={cards.map((c) => c._id)} strategy={verticalListSortingStrategy}>
        {cards.length === 0 && <p className="empty-message">No cards yet</p>}
        {cards.map((card) => (
          <Card key={card._id} card={card} onDelete={onDeleteCard} />
        ))}
      </SortableContext>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          placeholder="New card title"
        />
        <button type="submit">Add Card</button>
      </form>
    </div>
  );
}

export default List;
