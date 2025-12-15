// src/routes/AdminRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function AdminRoute({ children }) {
  const location = useLocation();
  const stored = localStorage.getItem("currentUser");

  // No user → redirect
  if (!stored) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  let user;
  try {
    user = JSON.parse(stored);
  } catch (err) {
    console.error("Corrupted currentUser in storage — resetting");
    localStorage.removeItem("currentUser");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If no role OR role invalid
  if (!user || !user.role || typeof user.role !== "string") {
    console.warn("Invalid role — redirecting");
    localStorage.removeItem("currentUser");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user.role.trim().toLowerCase();

  // Allow admin OR volunteer
  if (role !== "admin" && role !== "volunteer") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
