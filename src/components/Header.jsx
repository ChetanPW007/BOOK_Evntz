// src/components/Header.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { assets } from "../data/appData";
import ProfileDropdown from "../components/ProfileDropdown";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Hide header on landing/login/register pages
  if (["/", "/login", "/register"].includes(location.pathname)) return null;

  const user = JSON.parse(localStorage.getItem("currentUser")) || {
    name: "Guest User",
    usn: "N/A",
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="header-container">
      <div className="header-inner">
        {/* ---------- LEFT ---------- */}
        <div
          className="header-left"
          onClick={() => {
            navigate("/user/home");
            closeMenu();
          }}
          style={{ cursor: "pointer" }}
        >
          <img src={assets.logo} alt="Logo" className="header-logo" />
          <h2 className="header-title">GM University</h2>
        </div>

        {/* ---------- CENTER NAV ---------- */}
        <nav className={`header-nav ${mobileMenuOpen ? "nav-open" : ""}`}>
          <Link
            to="/user/home"
            className={`nav-item ${location.pathname === "/user/home" ? "active" : ""
              }`}
            onClick={closeMenu}
          >
            HOME
          </Link>
          <Link
            to="/user/events"
            className={`nav-item ${location.pathname === "/user/events" ? "active" : ""
              }`}
            onClick={closeMenu}
          >
            EVENTS
          </Link>
          <Link
            to="/history"
            className={`nav-item ${location.pathname === "/history" ? "active" : ""
              }`}
            onClick={closeMenu}
          >
            HISTORY
          </Link>
        </nav>

        {/* ---------- RIGHT ---------- */}
        <div className="header-right">
          <ProfileDropdown user={user} />

          {/* Mobile Menu Toggle */}
          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
