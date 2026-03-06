//======================
//		IMPORTS
//======================
import PropTypes from "prop-types"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { EditorView } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import EditorToolbar from "./editor-toolbar"
import { commentField } from "./code-decorations"
import useCodeEditor from "../hooks/useCodeEditor"

//======================
//  FUNCION PRINCIPAL
//======================
function CodeEditor({ roomId, isHost, username, code, setCode, editorRef, onCommentDataChange, setSelection}) {

    const {
        handleChange,
        handleSelectionChange,
        executeCode,
        isExecuting
    } = useCodeEditor({
        roomId,
        isHost,
        code,
        setCode,
        setSelection
    })


    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0 rounded-2xl">
            <div className="flex flex-1 flex-col overflow-hidden">
                <EditorToolbar isExecuting={isExecuting} onExecute={executeCode} />
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

CodeEditor.propTypes = {
    roomId: PropTypes.string.isRequired,
    isHost: PropTypes.bool.isRequired,
    username: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    setCode: PropTypes.func.isRequired,
    editorRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({ current: PropTypes.any })
    ]),
    onCommentDataChange: PropTypes.func,
    setSelection: PropTypes.func.isRequired
}

CodeEditor.defaultProps = {
    onCommentDataChange: () => {},
    editorRef: null
}


export default CodeEditor