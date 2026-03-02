//======================
//       IMPORTS
//======================
import { useRef } from "react"
import "../App.css"
import LocalVideo from "../components/local-video"
import RemoteVideo from "../components/remote-video"
import CodeEditor from "../components/code-editor"
import { useLocation, useParams } from "react-router-dom"
import LoadingScreen from "./loading-screen"
import ConsoleOutput from "../components/console-output"
import CommentsPanel from "../components/comments-panel"
import Reactions from "../components/reactions"
import useReactions from "../hooks/useReactions"
import useRoom from "../hooks/useRoom"
import useComments from "../hooks/useComments"

//======================
//  FUNCION PRINCIPAL
//======================
function MainView() {

    //======================
    //      CONSTANTES
    //======================
    const { roomId } = useParams()
    const { state } = useLocation()
    const username = state?.username
    const isHost = state?.isHost

    const editorRef = useRef(null)

    const {
        cargando,
        remoteStreams,
        remotePeers,
        code,
        setCode,
        comments,
        setComments,
        handleCommentDataChange,
        commentData
    } = useRoom(roomId)

    const {
        selection,
        setSelection,
        selectedTag,
        setSelectedTag,
        handleAddComment,
        handleDeleteComment
    } = useComments({
        roomId,
        username,
        comments,
        setComments
    })
    const {
        floatingEmojis,
        handleReaction
     } = useReactions(roomId)

    //======================
    //  VISTA HTML / CSS
    //======================
    return (
        <>
            {cargando ?
                <LoadingScreen /> :
                <>
                    <div className=" bg-cyan-700 h-screen flex flex-col md:flex-row gap-4 items-stretch p-4">
                        <div className="bg-teal-900 md:w-3/5 w-full flex flex-col gap-4 p-4 rounded-2xl overflow-hidden">
                            <div className="h-3/4 min-h-[100px] overflow-hidden flex flex-col">
                                <CodeEditor
                                    roomId={roomId}
                                    isHost={isHost}
                                    username={username}
                                    code={code}
                                    setCode={setCode}
                                    onCommentDataChange={handleCommentDataChange}
                                    editorRef={editorRef}
                                    setSelection={setSelection}
                                />
                            </div>
                            <div className="h-1/3 min-h-[50px]">
                                <ConsoleOutput roomId={roomId} />
                            </div>
                        </div>
                        <div className="bg-teal-900 md:w-2/5 rounded-2xl p-4 w-full overflow-y-auto">
                            <CommentsPanel
                                roomId={roomId}
                                username={username}
                                comments={comments}
                                commentText={commentData.commentText}
                                selectedTag={selectedTag}
                                setSelectedTag={setSelectedTag}
                                setCommentText={commentData.setCommentText}
                                handleAddComment={handleAddComment}
                                handleDeleteComment={handleDeleteComment}
                                handleReaction={handleReaction}
                                focusOnComment={commentData.focusOnComment}
                                isHost={isHost}
                                editorRef={editorRef}
                                selection={selection}
                            />
                        </div>
                        <div className="bg-teal-900 w-2/5 rounded-2xl p-4">
                            <div className="flex flex-wrap gap-2 h-1/6">
                                {Array.from(remotePeers.entries()).map(([socketId, peerInfo]) => {
                                    //Crear MediaStream por cada peer
                                    const tracks = remoteStreams.get(socketId) || {}
                                    const stream = new MediaStream()
                                    if (tracks.audioTrack) stream.addTrack(tracks.audioTrack);
                                    if (tracks.videoTrack) stream.addTrack(tracks.videoTrack);

                                    const username = peerInfo?.username || `Peer-${String(socketId).slice(0, 6)}`
                                    return (
                                        <RemoteVideo
                                            key={socketId}
                                            stream={stream}
                                            videoEnabled={!!tracks.videoTrack}
                                            audioEnabled={!!tracks.audioTrack}
                                            username={username}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <Reactions items={floatingEmojis} />

                    <div className="fixed inset-0 pointer-events-none">
                        <LocalVideo />
                    </div>
                    {isHost && (
                        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
                            <div className="bg-teal-900 text-white px-4 py-2 rounded-lg shadow-lg font-bold">
                                Usted es usuario HOST
                            </div>
                        </div>
                    )}
                </>
            }

        </>

    )
}
export default MainView