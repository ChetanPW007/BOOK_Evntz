import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [loginRole, setLoginRole] = useState("user");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const backendURL = "http://localhost:5000/api/users";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    branch: "",
    sem: "",
    college: "",
    usn: "",
    password: "",
  });

  useEffect(() => {
    setLoginRole("user");
    setIsNewUser(false);
  }, []);

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

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // -------------------------
  // LOGIN FUNCTION
  // -------------------------
  async function handleLogin() {
    const { phone, usn, password } = form;

    // Validation
    if (loginRole === "admin" && (!usn || !password)) {
      showToast("error", "Enter Admin ID and Password");
      return;
    }
    if (loginRole === "user" && (!phone || !password)) {
      showToast("error", "Enter Phone Number and Password");
      return;
    }

    setLoading(true);

    try {
      // Build request body
      const body =
        loginRole === "admin"
          ? { role: "admin", loginId: usn, password } // backend expects "loginId" for admin
          : { role: "user", loginId: phone, password }; // backend expects "loginId" for user

      const res = await fetch(`${backendURL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.status !== "success") {
        showToast("error", data?.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      const user = data.user || {};

      const userData = {
        name: user.Name || user.name || "User",
        email: user.Email || user.email || "",
        phone: user.Phone || user.phone || "",
        usn: user.USN || user.usn || "",
        branch: user.Branch || user.branch || "",
        sem: user.Sem || user.sem || "",
        college: user.College || user.college || "",
        role: (user.Role || user.role || "user").toLowerCase(),
      };

      localStorage.setItem("currentUser", JSON.stringify(userData));

      showToast("success", `Welcome ${userData.name}!`);
      setLoading(false);

      // Navigate based on role
      if (userData.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/home");
      }
    } catch (err) {
      console.error("Login error:", err);
      showToast("error", "Server unreachable");
      setLoading(false);
    }
  }

  // -------------------------
  // REGISTER FUNCTION
  // -------------------------
  async function handleRegister() {
    const { name, email, usn, password, branch, sem, phone, college } = form;

    if (!name || !email || !usn || !password) {
      showToast("error", "Fill required fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${backendURL}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          usn,
          branch,
          sem,
          phone,
          college,
          password,
          role: "user", // force role as user
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        showToast("success", "Registration successful! Please login.");
        setIsNewUser(false);
      } else {
        showToast("error", data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
      showToast("error", "Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      {/* Toast Messages */}
      <div className="gmu-toast-wrapper">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>

      <img src="/assets/logo.png" className="login-logo" alt="GM University" />

      <h2>{isNewUser ? "Register New Account" : "Secure Login"}</h2>

      {!isNewUser && (
        <div className="role-toggle">
          <button
            className={loginRole === "user" ? "active" : ""}
            onClick={() => setLoginRole("user")}
          >
            User
          </button>
          <button
            className={loginRole === "admin" ? "active" : ""}
            onClick={() => setLoginRole("admin")}
          >
            Admin
          </button>
        </div>
      )}

      <div className="form-box">
        {isNewUser ? (
          <>
            <input name="name" placeholder="Full Name" onChange={handleChange} />
            <input name="email" placeholder="Email" onChange={handleChange} />
            <input name="phone" placeholder="Phone Number" onChange={handleChange} />
            <input name="branch" placeholder="Branch" onChange={handleChange} />
            <input name="sem" placeholder="Semester" onChange={handleChange} />
            <input name="college" placeholder="College Name" onChange={handleChange} />
            <input name="usn" placeholder="USN" onChange={handleChange} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
            />

            <button className="secure-login-btn" onClick={handleRegister} disabled={loading}>
              {loading ? <span className="btn-loader" /> : "REGISTER"}
            </button>
          </>
        ) : (
          <>
            {loginRole === "admin" ? (
              <input
                name="usn"
                placeholder="Admin ID (USN)"
                onChange={handleChange}
                disabled={loading}
              />
            ) : (
              <input
                name="phone"
                placeholder="Phone Number"
                onChange={handleChange}
                disabled={loading}
              />
            )}

            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              disabled={loading}
            />

            <button className="secure-login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-loader" /> Logging in...
                </>
              ) : loginRole === "admin" ? (
                "ADMIN LOGIN"
              ) : (
                "SECURE LOGIN"
              )}
            </button>
          </>
        )}
      </div>

      <p className="toggle-link" onClick={() => setIsNewUser(!isNewUser)}>
        {isNewUser ? "Already have an account? Login" : "New user? Register here"}
      </p>
    </div>
  );
}
