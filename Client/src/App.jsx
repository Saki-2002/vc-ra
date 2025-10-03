import { useState } from 'react'
import { useEffect } from 'react'
import './App.css'
import Main_Component from "./main-view/main-view.jsx"

function App() {

  return (
    <>
    <div className= "w-full h-screen">
      <Main_Component roomId= {"123"}/>
    </div>
    </>
  )
}

export default App
