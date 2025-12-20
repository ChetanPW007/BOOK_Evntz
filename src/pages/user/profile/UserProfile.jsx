import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./UserProfile.css";
import { apiGet } from "../../../utils/api";

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    let timeoutId;

    const fetchUserData = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("currentUser"));
        if (!storedUser || !storedUser.usn) {
          setError("No user found. Please log in again.");
          setLoading(false);
          return;
        }

        // Use centralized apiGet
        const data = await apiGet(`/users/${storedUser.usn}`);

        if (data.status === "success" && data.user) {
          setUser(data.user);
        } else {
          setError("User not found in database. Showing local data.");
          setUser(storedUser);
        }
      } catch (err) {
        console.warn("⚠️ Using local user data:", err.message);
        const storedUser = JSON.parse(localStorage.getItem("currentUser"));
        setUser(storedUser);
        setError("Server offline. Showing local data.");
      } finally {
        // Add slight delay to allow smooth fade-in transition
        timeoutId = setTimeout(() => {
          setLoading(false);
          setFadeIn(true);
        }, 250);
      }
    };

    fetchUserData();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-card shimmer">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-card fade-in">
          <p style={{ color: "red" }}>User data not found</p>
        </div>
      </div>
    );
  }

  // Helper to safely get property (case-insensitive fallback)
  const getVal = (key) => user[key] || user[key.toLowerCase()] || user[key.charAt(0).toUpperCase() + key.slice(1)] || "—";

  return (
    <div className={`profile-container ${fadeIn ? "fade-in" : ""}`}>
      <div className="profile-card">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="arrow-icon" />
          <span>Back</span>
        </button>

        <img
          src={user.image || "/images/profile.png"}
          alt="Profile"
          className="profile-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/images/profile.png";
          }}
        />

        <h2 className="profile-name">{getVal("Name")}</h2>
        {error && <p className="error-text">{error}</p>}

        <div className="details-box">
          <p><span>Name:</span> {getVal("Name")}</p>
          <p><span>Email:</span> {getVal("Email")}</p>
          <p><span>USN:</span> {user.usn || user.USN || getVal("USN")}</p>
          <p><span>College:</span> {getVal("College")}</p>
          <p><span>Branch:</span> {getVal("Branch")}</p>
          <p><span>Semester:</span> {getVal("Sem") || getVal("Semester")}</p>
          <p><span>Phone:</span> {getVal("Phone")}</p>
          <p><span>Password:</span> ********</p>
        </div>

        <button type="button" className="btn-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
