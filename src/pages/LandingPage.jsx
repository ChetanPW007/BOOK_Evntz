import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="landing-container cinematic-entrance"
      style={{ backgroundImage: "url('/assets/image.jpg')" }}
    >
      <div className="overlay"></div>

      <div className="content-wrapper">
        {/* Logo blurred circle */}
        <div className="logo-circle landing-logo">
          <img src="/assets/logo.png" alt="GMU Logo" className="logo-img" />
        </div>

        <h1 className="title fade-up">
          Welcome to GM University Venue Registration
        </h1>

        <button className="btn-gmu fade-up" onClick={() => navigate("/register")}>
          LET'S GO
        </button>

      </div>
    </div>
  );
}
