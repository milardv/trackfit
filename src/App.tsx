import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
    const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  return (
      <div className="min-h-screen bg-background-dark text-text-primary font-display">
          {currentScreen === "home" && <HomeScreen />}
          {currentScreen === "workout" && <WorkoutScreen />}
          {currentScreen === "stats" && <StatsScreen />}
          {currentScreen === "progress" && <ProgressScreen />}

          <BottomNav
              currentScreen={currentScreen}
              setCurrentScreen={setCurrentScreen}
          />
      </div>
  )
}

export default App
