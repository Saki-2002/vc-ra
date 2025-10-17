import React, { useEffect, useState, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import socket from "../logic/connection";
import ConsoleOutput from "./console-output";

function CodeEditor({ roomId }) {
  const [code, setCode] = useState("");
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    // Escuchar cambios de código desde el servidor
    const handler = ({ roomId: r, code: newCode }) => {
      if (r === roomId) {
        isRemoteUpdate.current = true;
        setCode(newCode);
      }
    };
    socket.on("code-update", handler);
    return () => {
      socket.off("code-update", handler);
    };
  }, [roomId]);

  const handleCodeChange = (value) => {
    setCode(value);
    if (!isRemoteUpdate.current) {
      socket.emit("code-update", { roomId, code: value });
    }
    isRemoteUpdate.current = false;
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

  return (
    <div style={{ width: "100%", height: "80vh", margin: "auto" }}>
      <CodeMirror
        value={code}
        height="80vh"
        extensions={[python()]}
        theme="dark"
        onChange={handleCodeChange}
      />
      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-800"
        onClick={runCode}
      >
        Ejecutar código
      </button>
      <ConsoleOutput output={output} />
    </div>
  );
}

export default CodeEditor;
