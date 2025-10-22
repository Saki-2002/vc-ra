import { useState } from 'react'
import { useEffect } from 'react'
import './index.css'
import Main_View from "./main-view/main-view.jsx"
import Starting_View from './main-view/starting-view.jsx'
import {BrowserRouter as Router, Routes, Route} from "react-router-dom"
import { Navigate } from 'react-router-dom'

function App() {

  return (
    <Router>
      <Routes>
        <Route 
          path="/"
          element={<Starting_View/>}
        />
        <Route
          path="/room/:roomId"
          element={<Main_View/>}
        />
        <Route 
          path="*"
          element= {<Navigate to ="/" replace />}
        />
      </Routes>
    </Router>
  )
}

export default App
