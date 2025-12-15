import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./BackButton.css";

export default function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-hide on main pages
  const hiddenPaths = ["/", "/login", "/user/home"];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <button
      className="floating-back-btn"
      onClick={() => navigate(-1)}
      aria-label="Go back"
    >
      <ArrowLeft className="back-arrow-icon" />
    </button>
  );
}
