import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ApplicationDetail } from './pages/ApplicationDetail'
import { Activity } from './pages/Activity'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/applications/:id/activity" element={<Activity />} />
      </Routes>
    </BrowserRouter>
  )
}