// src/pages/user/UserHome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../../components/EventCard";
import FeaturedSlider from "../../components/FeaturedSlider";
import "./UserHome.css";
import Loading from "../../components/Loading";
import DeveloperSection from "../../components/DeveloperSection";
import { apiGet } from "../../utils/api";

// Convert "A, B, C" → ["A", "B", "C"]
const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

// Normalize event object from Google Sheet
const normalizeEvent = (ev, i) => ({
  id: String(ev.ID || ev.id || `EV${i + 1}`),
  name: String(ev.Name || ev.name || "Untitled Event"),
  auditorium: String(ev.Auditorium || ev.auditorium || ""),
  date: String(ev.Date || ev.date || ""),
  time: String(ev.Time || ev.time || ""),
  college: String(ev.College || ev.college || ""),
  capacity: String(ev.Capacity || ev.capacity || ""),
  poster:
    ev.Poster && ev.Poster.trim() !== "" ? ev.Poster : "/assets/default.jpg",

  speakers: toArray(ev.Speakers || ev.speakers),
  coordinators: toArray(ev.Coordinators || ev.coordinators),

  // Feature Flag
  isFeatured: (String(ev.Featured).toLowerCase() === "true" || ev.isFeatured === true),

  // Raw Data for logic
  Schedules: ev.Schedules,
  Visibility: ev.Visibility
});

export default function UserHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [auditoriums, setAuditoriums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [auditorium, setAuditorium] = useState("All");
  const [category, setCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  // Pagination for mobile
  const [visibleCards, setVisibleCards] = useState(6); // Show 6 initially (3 rows × 2)



  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem("currentUser");
      if (!stored) {
        navigate("/login");
        return;
      }

      try {
        const u = JSON.parse(stored);
        if (u.role === "admin") {
          // STRICT RBAC: Admins cannot view User Home
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        setUser(u);
      } catch (e) {
        console.error("Session Error:", e);
        navigate("/login");
      }
    };
    checkUser();
  }, [navigate]);



  // Session handling merged above

  // ✔ Fetch events and auditoriums from backend
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // Fetch Events
        const dataEvents = await apiGet("/events/");

        if (dataEvents.status === "success") {
          const visibleEvents = dataEvents.events.filter(
            (ev) =>
              !ev.Visibility || // Assume visible if missing
              ev.Visibility.toLowerCase() === "visible" ||
              ev.Visibility.toLowerCase() === "true"
          );

          // Filter out past events
          const now = new Date();
          const futureEvents = visibleEvents.filter(ev => {
            if (!ev.Date) return true; // Keep if no date
            try {
              // Parse "YYYY-MM-DD" + "HH:mm"
              const evDate = new Date(`${ev.Date}T${ev.Time || "23:59"}`);
              // If invalid date, keep it visible just in case
              if (isNaN(evDate.getTime())) return true;
              return evDate >= now;
            } catch { return true; }
          });

          const normalized = futureEvents.map((ev, i) => normalizeEvent(ev, i));
          setEvents(normalized);
          localStorage.setItem("cachedEvents", JSON.stringify(normalized));
        }

        // Fetch Auditoriums
        const dataAudi = await apiGet("/auditoriums/");

        if (dataAudi.status === "success") {
          // Show all Active Auditoriums (Compatible Mode)
          const activeAuditoriums = dataAudi.data.filter(audi =>
            audi.Status?.toLowerCase() === "active"
          );

          setAuditoriums(activeAuditoriums);
        }

        // --- NEW: Fetch User Bookings to show "Already Booked" status ---
        const userStored = localStorage.getItem("currentUser");
        if (userStored) {
          const u = JSON.parse(userStored);
          const bookingsRes = await apiGet(`/bookings/user/${u.usn || u.USN}`);
          if (bookingsRes.status === "success" && Array.isArray(bookingsRes.data)) {
            const bookedIds = new Set(bookingsRes.data.map(b => String(b.EventID || b.eventId)));

            // Re-map events with booked status
            setEvents(prev => prev.map(ev => ({
              ...ev,
              booked: bookedIds.has(String(ev.id))
            })));
          }
        }
      } catch (err) {
        console.warn("API failed → using cache");

        const cached = localStorage.getItem("cachedEvents");
        if (cached) {
          setEvents(JSON.parse(cached));
          setError("Loaded offline cached events");
        } else {
          setError("Unable to load events");
        }
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  // ✔ Filtering logic
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name?.toLowerCase().includes(searchInput.toLowerCase()) ||
      event.auditorium?.toLowerCase().includes(searchInput.toLowerCase());

    const matchesAuditorium =
      auditorium === "All" || event.auditorium === auditorium;

    const matchesCategory =
      category === "All" ||
      event.name?.toLowerCase().includes(category.toLowerCase());

    const matchesDate =
      dateFilter === "All"
        ? true
        : dateFilter === "Today"
          ? new Date(event.date).toDateString() === new Date().toDateString()
          : dateFilter === "This Week"
            ? (() => {
              const now = new Date();
              const weekLater = new Date();
              weekLater.setDate(now.getDate() + 7);
              const eventDate = new Date(event.date);
              return eventDate >= now && eventDate <= weekLater;
            })()
            : dateFilter === "This Month"
              ? new Date(event.date).getMonth() === new Date().getMonth()
              : true;

    return (
      matchesSearch &&
      matchesAuditorium &&
      matchesCategory &&
      matchesDate
    );
  });

  if (!user) return null;

  // Slider Logic
  const featuredEvents = events.filter(e => e.isFeatured);
  const sliderEvents = featuredEvents.length > 0 ? featuredEvents : events.slice(0, 5);

  return (
    <div className="user-home-container fade-in">
      <div className="welcome-box">
        <h2>Welcome, {user.name || "User"} 👋</h2>
        <p>Discover and book events seamlessly!</p>
      </div>

      {/* Featured Slider */}
      {!loading && sliderEvents.length > 0 && (
        <FeaturedSlider events={sliderEvents} />
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search events…"
            className="search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="search-btn">🔍</button>
        </div>

        <div className="category-filters">
          {["All", "Cultural", "Technical", "Official", "Entertainment"].map(
            (cat) => (
              <button
                key={cat}
                className={`filter-chip ${category === cat ? "active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            )
          )}
        </div>

        <div className="dropdown-filters">
          <select
            className="filter-select"
            value={auditorium}
            onChange={(e) => setAuditorium(e.target.value)}
          >
            <option value="All">All Auditoriums</option>
            {[...new Set(events.map((e) => e.auditorium))].map((audi, i) => (
              <option key={i} value={audi}>
                {audi}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="All">All Dates</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
          </select>

          <button
            className="reset-btn"
            onClick={() => {
              setSearchInput("");
              setAuditorium("All");
              setCategory("All");
              setDateFilter("All");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Event list */}
      <section className="event-section">
        <h3 className="event-title">Upcoming Events</h3>

        {loading ? (
          <Loading />
        ) : error ? (
          <p className="error">{error}</p>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="event-grid">
              {filteredEvents.slice(0, visibleCards).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Load More Button (mobile only) */}
            {filteredEvents.length > visibleCards && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleCards(prev => prev + 4)} // Add 2 more rows (4 cards)
                >
                  <span className="load-more-text">Load More</span>
                  <span className="load-more-icon">↓</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="no-results">No events found.</p>
        )}
      </section>

      {/* Auditorium Showcase Section */}
      {auditoriums.length > 0 && (
        <section className="auditorium-section">
          <h3 className="section-title">Our Auditoriums</h3>
          <div className="auditorium-grid">
            {auditoriums.map((audi, idx) => (
              <div
                key={idx}
                className="auditorium-card"
                onClick={() => navigate(`/user/auditorium/${encodeURIComponent(audi.Name)}`)}
              >
                <div className="audi-card-content">
                  <h4 className="audi-card-name">{audi.Name}</h4>
                  <p className="audi-card-capacity">
                    <span className="capacity-icon">🪑</span>
                    {audi.Capacity || "N/A"} Seats
                  </p>
                  {audi.Description && (
                    <p className="audi-card-desc">{audi.Description}</p>
                  )}
                </div>
                <div className="audi-card-cta">View Events →</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Developer Team Section */}
      <DeveloperSection />
    </div>
  );
}
