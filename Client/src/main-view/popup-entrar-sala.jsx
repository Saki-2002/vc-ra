import { useState, useRef, useEffect, forwardRef } from "react";
import Draggable from "react-draggable";

function PopUp_Entrar_Sala({ onIngresarSala, showPopUp, onMouseDown, closePopUp }, ref) {

    const [sala, setSala] = useState("")

    return (
        <Draggable nodeRef={ref} bounds="parent" handle=".drag-handle">
            <div
                ref={ref}
                className={`relative z-10 justify-center w-[300px] h-[200px] px-2 py-2 bg-white border-black border-4
                            transition-all duration-10 ease-in-out
                            ${showPopUp ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
                onMouseDown={onMouseDown}
            >
                <div
                    className="grid grid-rows-[40px_1fr] h-full">
                    <div className="drag-handle bg-gray-300 flex justify-end items-center cursor-grab">
                        <button
                            className="m-1 w-[60px] h-[30px] top-0 right-0 bg-red-500 hover:bg-red-700 font-bold text-white border-black border"
                            onClick={closePopUp}>
                            X
                        </button>
                    </div>

                    <div
                        className="grid grid-cols-1 items-center justify-center">
                        <input
                            type="text"
                            placeholder="Indique ID de Sala"
                            onChange={(e) => setSala(e.target.value)}
                            className="border border-gray-400 px-3 w-full h-10 relative align-middle justify-center">
                        </input>
                        <button
                            className="relative align-bottom justify-center w-full h-10 my-2 bg-green-400 hover:bg-green-600 text-black font-bold border border-black"
                            onClick={()=>onIngresarSala?.(sala)}
                            >
                                Ingresar a sala
                        </button>
                    </div>
                </div>
            </div>
        </Draggable>
    )

}

export default forwardRef(PopUp_Entrar_Sala);