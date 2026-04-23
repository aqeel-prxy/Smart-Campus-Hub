import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import FacilitiesPage from './pages/FacilitiesPage';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import TicketsPage from './pages/TicketsPage';
import ResourceMobileView from './pages/ResourceMobileView';
import ThemeToggle from './components/ThemeToggle'; 

function App() {
  return (
    <Router>
      {/* NEW: The ThemeToggle sits outside the <Routes> block. 
        This makes it a global floating button that appears on every single page! 
      */}
      <ThemeToggle />

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} /> 
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/resource/view/:id" element={<ResourceMobileView />} />
        
        {/* Catch-all route should always be the absolute last route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;