//======================
//		IMPORTS
//======================
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { useEffect, useRef, useState, useCallback } from "react"
import * as handleConnection from "../logic/connectionCodeEditor"
import { EditorView, Decoration } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"
import { EditorState } from "@codemirror/state"
import expressions from "../auxiliar/expressions"
import CommentPopUp from "./comment-popup"
import CommentBox from "./comment-box"
import reactions from "./reactions"
import EditorToolbar from "./editor-toolbar"
import { commentField, addCommentMark, removeCommentMark } from "./code-decorations"
import useCodeEditor from "../hooks/useCodeEditor"

//======================
//  FUNCION PRINCIPAL
//======================
function CodeEditor({ roomId, isHost, username, onCommentDataChange }) {

    const {
        code,
        isExecuting,
        editorRef,
        handleChange,
        handleSelectionChange,
        executeCode
    } = useCodeEditor({roomId, isHost, username, onCommentDataChange})

    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0 rounded-2xl">
            <div className="flex flex-1 flex-col overflow-hidden">
                <EditorToolbar isExecuting={isExecuting} onExecute={executeCode}/>
                <CodeMirror
                    className="h-full text-[16px] overflow-y-auto"
                    ref={editorRef}
                    value={code}
                    height="100%"
                    extensions={[
                        python(),
                        commentField,
                        EditorView.updateListener.of(handleSelectionChange),
                        ...(isHost ? [] : [
                            EditorView.editable.of(false),
                            EditorState.readOnly.of(true)
                        ])
                    ]}
                    onChange={handleChange}
                    basicSetup={{
                        lineNumbers: true,
                        highlightActiveLineGutter: true,
                        highlightSpecialChars: true,
                        foldGutter: true,
                        drawSelection: true,
                        dropCursor: true,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: true,
                        crosshairCursor: true,
                        highlightActiveLine: true,
                        highlightSelectionMatches: false,
                        closeBracketsKeymap: true,
                        searchKeymap: true,
                        foldKeymap: true,
                        completionKeymap: true,
                        lintKeymap: true
                    }}
                />
            </div>
        </div>
    )



}


export default CodeEditor