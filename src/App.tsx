import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SectionPage from './pages/SectionPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/:slug" element={<SectionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}