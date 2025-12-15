import { useEffect } from "react";
import { useAdminStore } from "../../store/adminStore";
import Loader from "../../components/Loader";

export default function AdminDashboard() {
  const { fetchAll, events, users, bookings, loading } = useAdminStore();

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading && events.length === 0) return <Loader />;

  // Stats
  const totalEvents = events.length;
  const activeUsers = users.length;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.Status === 'CONFIRMED').length;

  // Upcoming (Next 5)
  const upcomingEvents = [...events]
    .filter(e => new Date(e.Date) >= new Date())
    .sort((a, b) => new Date(a.Date) - new Date(b.Date))
    .slice(0, 5);

  // Role Breakdown
  const admins = users.filter(u => u.Role === 'admin').length;
  const volunteers = users.filter(u => u.Role === 'volunteer').length;
  const regular = users.filter(u => !u.Role || u.Role === 'user').length;
  const totalU = users.length || 1;

  return (
    <div className="fade-in">
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-sub">Overview of system performance</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-box">
          <span>Total Events</span>
          <strong>{totalEvents}</strong>
        </div>
        <div className="stat-box">
          <span>Active Users</span>
          <strong>{activeUsers}</strong>
        </div>
        <div className="stat-box">
          <span>Total Bookings</span>
          <strong>{totalBookings}</strong>
        </div>
        <div className="stat-box">
          <span>Confirmed</span>
          <strong>{confirmedBookings}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

        {/* UPCOMING EVENTS */}
        <div className="table-container">
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--admin-border)' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Upcoming Events</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingEvents.map(ev => (
                <tr key={ev.ID || ev.Name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={ev.Poster} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                      <span>{ev.Name}</span>
                    </div>
                  </td>
                  <td>{ev.Date}</td>
                  <td>
                    {ev.Visibility !== 'hidden' ?
                      <span className="status-badge green">Visible</span> :
                      <span className="status-badge red">Hidden</span>
                    }
                  </td>
                </tr>
              ))}
              {upcomingEvents.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: '#555' }}>No upcoming events</td></tr>}
            </tbody>
          </table>
        </div>

        {/* ROLE BREAKDOWN */}
        <div className="stat-box" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#fff' }}>User Distribution</h3>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', firstName: '13px', color: '#aaa' }}>
              <span>Users</span>
              <span>{Math.round((regular / totalU) * 100)}%</span>
            </div>
            <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(regular / totalU) * 100}%`, height: '100%', background: '#f9d56e' }}></div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>
              <span>Volunteers</span>
              <span>{Math.round((volunteers / totalU) * 100)}%</span>
            </div>
            <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(volunteers / totalU) * 100}%`, height: '100%', background: '#3498db' }}></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>
              <span>Admins</span>
              <span>{Math.round((admins / totalU) * 100)}%</span>
            </div>
            <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(admins / totalU) * 100}%`, height: '100%', background: '#e74c3c' }}></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
