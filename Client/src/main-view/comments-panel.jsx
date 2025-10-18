import React, { useState } from "react";

function CommentsPanel({ comments, onAddComment, onSelectComment }) {
  const [text, setText] = useState("");

  return (
    <div className="w-full h-[30vh] bg-white border border-gray-400 rounded p-2 overflow-y-auto">
      <h2 className="font-bold mb-2">Comentarios</h2>
      <ul className="mb-2">
        {comments.map((c, idx) => (
          <li key={idx} className="mb-1">
            <button
              className="text-blue-600 underline"
              onClick={() => onSelectComment(c)}
            >
              [Líneas {c.fromLine}-{c.toLine}] {c.text}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border px-2 py-1 rounded"
          placeholder="Escribe un comentario..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button
          className="bg-green-500 text-white px-3 py-1 rounded font-bold"
          onClick={() => {
            if (text.trim()) {
              onAddComment(text);
              setText("");
            }
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

export default CommentsPanel;
