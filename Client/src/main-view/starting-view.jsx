import { useRef, useState, useEffect } from "react"
import Draggable from "react-draggable"
import PopUp_Entrar_Sala from "./popup-entrar-sala"



function Starting_View() {

    const nodeRef = useRef(null)
    const [renderPopUp, setRenderPopUp] = useState(false)
    const [showPopUp, setShowPopUp] = useState(false)
    const popUpRef = useRef(null)
    const [idSala, setIdSala] = useState("")

    const openPopUp = () => {
        setRenderPopUp(true)
        setTimeout(()=>setShowPopUp(true),10)
    }
    const closePopUp = () => {
        setShowPopUp(false)
        setTimeout(()=>setRenderPopUp(false),100)
    }
    const onMouseDown = () => {
        console.log("test")
    }
    return (
        <>
            <title>VC-AF</title>
            <div className="flex flex-col items-center static w-screen h-screen bg-yellow-200">
                <div className="py-10 align-middle place-items-center border-black ">
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-full py-2 px-4"
                        onClick={openPopUp}
                    >
                        Ingresar a una sala especifica
                    </button>
                </div>
                {renderPopUp &&
                    <PopUp_Entrar_Sala
                        ref={popUpRef}
                        showPopUp={showPopUp}
                        onMouseDown={onMouseDown}
                        closePopUp={closePopUp}
                        onIngresarSala={(valor) => setIdSala(valor)}
                    />
                }

            </div>

        </>
    )


}


export default Starting_View