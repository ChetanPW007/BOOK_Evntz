// src/components/Footer.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import { assets } from "../data/appData";
import "./Footer.css";

export default function Footer() {
  const location = useLocation();

  if (location.pathname === "/" || location.pathname === "/login") return null;

  return (
    <footer className="footer-container">
      <div className="footer-left">
        <img src={assets.logo} alt="GMU Logo" className="footer-logo" />
        <p>GM University - Official Venue Registration</p>
      </div>

      <p className="footer-copy">© 2025 GMU Venue Registration</p>

      <div className="footer-right">
        <p>info@gmu.ac.in</p>
      </div>
    </footer>
  );
}
