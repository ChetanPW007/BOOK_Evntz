import { useEffect, useState } from "react";
import { apiGet, apiPut, apiDelete, apiPost } from "../../utils/api";
import Loader from "../../components/Loader";

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  async function load() {
    const res = await apiGet("/users/");
    setUsers(res.users || res || []);
  }

  useEffect(() => { load() }, []);

  async function setRole(usn, role) {
    if (!role) return;
    if (!confirm(`Change role to ${role}?`)) return;
    // Backend expects POST to /users/role with { usn, role }
    await apiPost("/users/role", { usn, role });
    load();
  }

  async function suspend(usn, isSuspended) {
    const endpoint = isSuspended ? "unsuspend" : "suspend";
    // Backend expects POST with { usn }
    await apiPost(`/users/${endpoint}`, { usn });
    load();
  }

  async function remove(usn) {
    if (!confirm("Delete user? This will also remove their bookings.")) return;
    // Backend expects POST to /users/delete with { usn }
    await apiPost("/users/delete", { usn });
    load();
  }

  if (users === null) return <Loader />;

  // Stats
  const countAdmin = users.filter(u => u.Role === 'admin').length;
  const countVol = users.filter(u => u.Role === 'volunteer').length;
  const countUser = users.filter(u => !u.Role || u.Role === 'user').length;

  // Filter
  const filtered = users.filter(u => {
    const matchSearch = (u.Name?.toLowerCase().includes(search.toLowerCase())) ||
      (u.USN?.toLowerCase().includes(search.toLowerCase())) ||
      (u.Email?.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter === "All" || (u.Role || 'user') === roleFilter; // handle missing role as user
    return matchSearch && matchRole;
  });

  return (
    <div className="fade-in">
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <span className="admin-page-sub">Manage system access and roles</span>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #2c3e50, #000)' }}>
          <span>Admins</span>
          <strong style={{ color: '#e74c3c' }}>{countAdmin}</strong>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #1e3a5f, #000)' }}>
          <span>Volunteers</span>
          <strong style={{ color: '#3498db' }}>{countVol}</strong>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #27ae60, #000)' }}>
          <span>Regular Users</span>
          <strong style={{ color: '#2ecc71' }}>{countUser}</strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className="admin-actions">
        <input
          placeholder="Search Name, Email, USN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '300px' }}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="All">All Roles</option>
          <option value="admin">Admin</option>
          <option value="volunteer">Volunteer</option>
          <option value="user">User</option>
        </select>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User Info</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isSuspended = u.Suspended === "yes";
              const currentRole = u.Role || 'user';
              return (
                <tr key={u.USN || u.usn}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.Name}</div>
                    <div className="admin-muted" style={{ fontSize: '12px' }}>{u.USN}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{u.Email}</div>
                    <div className="admin-muted" style={{ fontSize: '12px' }}>{u.Phone || "—"}</div>
                  </td>
                  <td>
                    <select
                      value={currentRole}
                      onChange={(e) => setRole(u.USN, e.target.value)}
                      className="admin-actions select"
                      style={{ padding: '6px', fontSize: '13px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: '#fff' }}
                    >
                      <option value="user">User</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    {isSuspended ? (
                      <span className="badge red">Suspended</span>
                    ) : (
                      <span className="badge green">Active</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="admin-action-btn orange"
                        onClick={() => suspend(u.USN, isSuspended)}
                        style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'none', border: '1px solid #f39c12', color: '#f39c12', cursor: 'pointer' }}
                      >
                        {isSuspended ? "Unsuspend" : "Suspend"}
                      </button>
                      <button
                        className="action-icon-btn delete"
                        onClick={() => remove(u.USN)}
                        title="Delete User"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No users match filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
