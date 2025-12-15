// src/components/Toast.jsx
import React, { useEffect } from "react";
import "./Toast.css";

export default function Toast({ id, type = "info", message = "", onClose, duration = 3500 }) {
  useEffect(() => {
    const t = setTimeout(() => onClose && onClose(id), duration);
    return () => clearTimeout(t);
  }, [id, duration, onClose]);

  return (
    <div className={`gmu-toast gmu-toast-${type}`} role="status" aria-live="polite">
      <div className="gmu-toast-body">
        <div className="gmu-toast-icon">
          {type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}
        </div>
        <div className="gmu-toast-text">{message}</div>
        <button className="gmu-toast-close" onClick={() => onClose && onClose(id)} aria-label="Close">
          ×
        </button>
      </div>
    </div>

    
  );
}
