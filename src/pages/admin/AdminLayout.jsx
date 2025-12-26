import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Admin.css";
import { assets } from "../../data/appData";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const validRoles = ["admin", "volunteer"];
    const stored = localStorage.getItem("currentUser");

    if (!stored) {
      navigate("/login");
      return;
    }

    try {
      const u = JSON.parse(stored);
      if (!validRoles.includes(u.role)) {
        // STRICT RBAC: Users cannot view Admin Panel
        navigate("/user/home", { replace: true });
        return;
      }
      setUser(u);
    } catch (e) {
      console.error(e);
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const role = user?.role || "user";

  return (
    <div className="admin-shell">
      {/* Mobile Header Strip */}
      <div className="admin-mobile-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={assets.logo || "/logo.png"} alt="Logo" style={{ width: 28 }} />
          <span className="admin-brand" style={{ fontSize: 18 }}>GMU Admin</span>
        </div>
        <button
          className={`admin-mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <aside className={`admin-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="admin-logo-block">
          <img src={assets.logo || "/logo.png"} alt="GMU" style={{ width: 32 }} />
          <h2 className="admin-brand">GMU Admin</h2>

          {/* Close Button for Mobile (reusing toggle style) */}
          <button
            className="admin-mobile-toggle open"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="admin-nav">
          <NavLink to="/admin/dashboard" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
            Dashboard
          </NavLink>

          <NavLink to="/admin/events" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
            Events
          </NavLink>

          <NavLink to="/admin/bookings" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
            Bookings
          </NavLink>

          <NavLink to="/admin/auditoriums" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
            Auditoriums
          </NavLink>

          <NavLink to="/admin/speakers" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
            Speakers
          </NavLink>

          <NavLink to="/admin/coordinators" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
            Coordinators
          </NavLink>

          {role === 'admin' && (
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
              Users
            </NavLink>
          )}

          {(role === 'admin' || role === 'volunteer') && (
            <NavLink to="/admin/scanner" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={closeMobileMenu}>
              Scanner
            </NavLink>
          )}
        </div>

        <div className="admin-footer">
          <div className="admin-user-badge">
            <div className="admin-user-info">
              <h4>{user?.name?.split(' ')[0]}</h4>
              <span>{user?.role}</span>
            </div>
            <button onClick={handleLogout} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
