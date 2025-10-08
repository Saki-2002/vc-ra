import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror"
import {python} from "@codemirror/lang-python"

function TextEditor({ value, onChange }) {
  return (
    <div className="w-full h-[500px] border border-gray-400 rounded-md overflow-hidden">
      <CodeMirror
        value={value}
        height="500px"
        width="500px"
        extensions={[python()]}
        theme="dark"
        onChange={(val) => onChange(val)}
      />
    </div>
  );
}

export default TextEditor;
