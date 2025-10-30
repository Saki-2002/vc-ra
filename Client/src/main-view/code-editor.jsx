import React, { useEffect, useState, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorView, Decoration } from "@codemirror/view";
import ConsoleOutput from "./console-output";
import CommentsPanel from "./comments-panel";
import { useMemo } from "react";

function CodeEditor({ roomId }) {
  const [code, setCode] = useState("");
  const isRemoteUpdate = useRef(false);
  const [comments, setComments] = useState([]);
  const [selectedRange, setSelectedRange] = useState(null);

  // Estado para las decoraciones
  const [decorations, setDecorations] = useState(Decoration.none);

  useEffect(() => {
    if (!selectedRange || !code.trim()) {
      setDecorations(Decoration.none);
      return;
    }
    const lines = code.split("\n");
    const totalLines = lines.length;
    if (
      selectedRange.fromLine < 1 ||
      selectedRange.toLine > totalLines ||
      selectedRange.fromLine > selectedRange.toLine ||
      totalLines === 0
    ) {
      setDecorations(Decoration.none);
      return;
    }
    const decos = [];
    let pos = 0;
    for (let i = 0; i < totalLines; i++) {
      if (i + 1 >= selectedRange.fromLine && i + 1 <= selectedRange.toLine) {
        decos.push(Decoration.line({ class: "bg-yellow-200" }).range(pos));
      }
      pos += lines[i].length + 1;
    }
    setDecorations(Decoration.set(decos));
  }, [selectedRange, code]);

  // Extensión fija para CodeMirror
  const highlightSelection = EditorView.decorations.of(decorations);

  useEffect(() => {
    // Escuchar cambios de código desde el servidor
    const handler = ({ roomId: r, code: newCode }) => {
      if (r === roomId) {
        isRemoteUpdate.current = true;
        setCode(newCode);
      }
    };
    socket.on("code-update", handler);
    // Escuchar comentarios colaborativos
    socket.on("comment-update", ({ roomId: r, comments: newComments }) => {
      if (r === roomId) setComments(newComments);
    });
    return () => {
      socket.off("code-update", handler);
      socket.off("comment-update");
    };
  }, [roomId]);

  const handleCodeChange = (value) => {
    setCode(value);
    if (!isRemoteUpdate.current) {
      socket.emit("code-update", { roomId, code: value });
    }
    isRemoteUpdate.current = false;
  };

  // Detectar selección de líneas en CodeMirror
  const handleSelection = (editor) => {
    const sel = editor.state.selection.main;
    if (!sel.empty) {
      const fromLine = editor.state.doc.lineAt(sel.from).number;
      const toLine = editor.state.doc.lineAt(sel.to).number;
      setSelectedRange({ fromLine, toLine });
    } else {
      setSelectedRange(null);
    }
  };

  const [output, setOutput] = useState("");

  // Ejecutar código Python en el backend
  const runCode = () => {
    setOutput("Ejecutando...");
    fetch("/api/run-python", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
      .then(res => res.json())
      .then(data => {
        setOutput(data.output || data.error || "Sin salida");
      })
      .catch(err => setOutput("Error al ejecutar: " + err.message));
  };

  // Agregar comentario colaborativo
  const handleAddComment = (text) => {
    if (!selectedRange) return;
    const newComment = {
      fromLine: selectedRange.fromLine,
      toLine: selectedRange.toLine,
      text,
      author: socket.id,
      timestamp: Date.now()
    };
    const updated = [...comments, newComment];
    setComments(updated);
    socket.emit("comment-update", { roomId, comments: updated });
  };

  // Seleccionar comentario y resaltar rango
  const handleSelectComment = (comment) => {
    setSelectedRange({ fromLine: comment.fromLine, toLine: comment.toLine });
  };

  // Validar extensiones para CodeMirror
  const extensions = [];
  if (typeof python === "function") {
    extensions.push(python());
  }
  if (highlightSelection) {
    extensions.push(highlightSelection);
  }

  return (
    <div className="w-full h-[80vh] flex gap-4">
      <div className="flex-1 h-full flex flex-col">
        <CodeMirror
          value={code}
          height="60vh"
          extensions={extensions}
          theme="dark"
          onChange={handleCodeChange}
          onUpdate={(viewUpdate) => {
            const sel = viewUpdate.state.selection.main;
            if (!sel.empty) {
              const fromLine = viewUpdate.state.doc.lineAt(sel.from).number;
              const toLine = viewUpdate.state.doc.lineAt(sel.to).number;
              setSelectedRange({ fromLine, toLine });
            } else {
              setSelectedRange(null);
            }
          }}
        />
        <button
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-800"
          onClick={runCode}
        >
          Ejecutar código
        </button>
        <ConsoleOutput output={output} />
      </div>
      <div className="w-[350px]">
        <CommentsPanel
          comments={comments}
          onAddComment={handleAddComment}
          onSelectComment={handleSelectComment}
        />
        {selectedRange && (
          <div className="mt-2 text-xs text-gray-600">Seleccionado: líneas {selectedRange.fromLine} - {selectedRange.toLine}</div>
        )}
      </div>
    </div>
  );
}

export default CodeEditor;
