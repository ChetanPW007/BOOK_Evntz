import React, { useState, useCallback } from "react";
import axios from "axios";
import Toast from "../components/Toast";
import "./Register.css";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    usn: "",
    college: "",
    branch: "",
    sem: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const backendURL = "http://127.0.0.1:5000/api/users";

  // -------------------------
  // Toast helpers
  // -------------------------
  function showToast(type, message, duration = 3300) {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((t) => [...t, { id, type, message, duration }]);
  }

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // -------------------------
  // Handle form input
  // -------------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // -------------------------
  // Handle submit
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: required fields
    const requiredFields = ["name", "email", "usn", "college", "branch", "sem", "phone", "password"];
    for (let field of requiredFields) {
      if (!formData[field]) {
        showToast("error", `Please fill ${field}`);
        return;
      }
    }

    setLoading(true);
    console.log("➡️ Sending payload:", formData);

    try {
      const response = await axios.post(`${backendURL}/add`, {
        ...formData,
        role: "user", // force role as user
      });

      if (response.data.status === "success") {
        showToast("success", "Registration successful! Please login.");
        setFormData({
          name: "",
          email: "",
          usn: "",
          college: "",
          branch: "",
          sem: "",
          phone: "",
          password: "",
        });
        // Redirect after 1s
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      } else {
        showToast("error", response.data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      showToast("error", err.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* Toast Messages */}
      <div className="gmu-toast-wrapper">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>

      <form className="register-box" onSubmit={handleSubmit}>
        <h2>Register New Account</h2>

        <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="text" name="usn" placeholder="USN" value={formData.usn} onChange={handleChange} required />
        <input type="text" name="college" placeholder="College" value={formData.college} onChange={handleChange} required />
        <input type="text" name="branch" placeholder="Branch" value={formData.branch} onChange={handleChange} required />
        <input type="number" name="sem" placeholder="Semester" value={formData.sem} onChange={handleChange} required />
        <input type="text" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />

        <button type="submit" className="register-btn" disabled={loading}>
          {loading ? "Registering..." : "REGISTER"}
        </button>

        <p>
          Already have an account? <a href="/login">Login</a>
        </p>
      </form>
    </div>
  );
}
