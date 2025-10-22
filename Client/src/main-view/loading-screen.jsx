import { useEffect } from "react"
import { useState } from "react"


function LoadingScreen () {

    const [dots, setDots] = useState("")
    
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length < 3 ? prev + "." : ""))
        }, 300)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-gray-900 flex w-full min-h-screen justify-center items-center z-50">
            <h1 className="text-white font-bold z-50 text-6xl">
                Cargando{dots}
            </h1>
        </div>
    )

}

export default LoadingScreen