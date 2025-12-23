// src/components/ProfileDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./ProfileDropdown.css";

export default function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const initials =
    user?.name
      ?.split(" ")
      ?.map((w) => w[0])
      ?.join("")
      ?.toUpperCase() || "GU";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Navigate immediately without fade delay
  const handleViewProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="profile-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="profile-toggle-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {user?.image ? (
          <img
            src={user.image}
            alt="avatar"
            className="avatar"
            onError={(e) => (e.target.src = "/default-avatar.png")}
          />
        ) : (
          <div className="avatar avatar-text">{initials}</div>
        )}
        <span className="username">{user?.name || "Guest User"}</span>
        <ChevronDown size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="profile-menu"
          >
            <div className="profile-menu-header">
              {user?.image ? (
                <img
                  src={user.image}
                  alt="avatar"
                  className="avatar-lg"
                  onError={(e) => (e.target.src = "/default-avatar.png")}
                />
              ) : (
                <div className="avatar-lg avatar-text-lg">{initials}</div>
              )}
              <div>
                <div className="user-name">{user?.name || "Guest User"}</div>
                <div className="user-id">{user?.usn || "No ID"}</div>
              </div>
            </div>

            <div className="menu-item" onClick={handleViewProfile}>
              👤 View Profile
            </div>
            <div className="menu-item logout" onClick={handleLogout}>
              🚪 Logout
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
