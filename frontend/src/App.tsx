import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ApplicationDetail } from './pages/ApplicationDetail'
import { Activity } from './pages/Activity'
import { Profile } from './pages/Profile'
import { Profiles } from './pages/Profiles'
import { Setup } from './pages/Setup'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/applications/:id/activity" element={<Activity />} />
      </Routes>
    </BrowserRouter>
  )
}