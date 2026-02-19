import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";

// Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";

// User Pages
import UserHome from "./pages/user/UserHome";
import EventDetails from "./pages/user/EventDetails";
import Events from "./pages/user/Events";
import History from "./pages/user/History";
import UserProfile from "./pages/user/profile/UserProfile";
import AuditoriumEvents from "./pages/user/AuditoriumEvents";
import AuditoriumList from "./pages/user/AuditoriumList";

// Ticket / Booking Pages
import MyTickets from "./pages/user/MyTickets";
import TicketPage from "./pages/user/TicketPage";
import SeatBooking from "./pages/user/SeatBooking"; // Seat booking component
import BookingConfirmation from "./pages/user/BookingConfirmation"; // Venue Confirmation

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminUsers from "./pages/admin/AdminUsers";
import VolunteerScanner from "./pages/admin/VolunteerScanner";
import AdminSpeakers from "./pages/admin/AdminSpeakers";
import AdminCoordinators from "./pages/admin/AdminCoordinators";
import AdminAuditoriums from "./pages/admin/AdminAuditoriums";

// Route Guards
import AdminRoute from "./routes/AdminRoute";
import VolunteerOverlay from "./components/VolunteerScanner";

/* Layout wrapper to conditionally hide header/footer */
function LayoutWrapper({ children }) {
  const location = useLocation();
  const path = location.pathname;

  // Pages where header/footer should be hidden
  const hideHeaderFooter =
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    path.startsWith("/admin");

  return (
    <>
      {!hideHeaderFooter && <Header />}

      <main
        key={location.pathname}
        style={{
          paddingTop: hideHeaderFooter ? "0" : "96px",
          paddingBottom: hideHeaderFooter ? "0" : "80px",
          minHeight: "100vh",
          backgroundColor: hideHeaderFooter ? "#050505" : "transparent",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </main>

      {!hideHeaderFooter && <Footer />}

      {/* Volunteer Scanner Overlay */}
      <VolunteerOverlay />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LayoutWrapper>
        <Routes>
          {/* PUBLIC PAGES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* USER PAGES */}
          <Route path="/user/home" element={<UserHome />} />
          <Route path="/user/events" element={<Events />} />
          <Route path="/user/auditorium/:name" element={<AuditoriumEvents />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<UserProfile />} />

          {/* EVENT DETAILS + BOOKING */}
          <Route path="/event/:eventId/auditoriums" element={<AuditoriumList />} />
          <Route path="/event/:eventId" element={<EventDetails />} />
          <Route path="/event/:eventId/booking" element={<SeatBooking />} />
          <Route path="/booking-confirmation" element={<BookingConfirmation />} />

          {/* USER TICKETS */}
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/ticket/:ticketId" element={<TicketPage />} />

          {/* ADMIN PAGES WITH GUARD */}
          {/* ADMIN PAGES (Layout + Guard) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="scanner" element={<VolunteerScanner />} />
            <Route path="speakers" element={<AdminSpeakers />} />
            <Route path="coordinators" element={<AdminCoordinators />} />
            <Route path="auditoriums" element={<AdminAuditoriums />} />
          </Route>

          {/* FALLBACK: Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  );
}

export default App;
