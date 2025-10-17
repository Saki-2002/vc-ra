import React from "react";

function ConsoleOutput({ output }) {
  return (
    <div className="w-full h-[20vh] bg-black text-green-400 font-mono p-4 overflow-y-auto rounded border border-gray-700 mt-2">
      <pre>{output || "Sin salida aún..."}</pre>
    </div>
  );
}

export default ConsoleOutput;
