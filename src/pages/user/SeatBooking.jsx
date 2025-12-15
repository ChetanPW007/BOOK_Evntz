
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiGet, apiPost } from "../../utils/api";
import "./SeatBooking.css";

// Helper to parse custom layout
const parseLayout = (layoutJson) => {
    try {
        const { rows: R, cols: C, grid } = JSON.parse(layoutJson);
        const map = [];
        let rowLabelIdx = 0;

        for (let r = 0; r < R; r++) {
            const currentRow = grid[r];
            // Check if row has any valid seats
            const hasSeats = currentRow.some(x => x !== 0);
            if (!hasSeats) {
                // Skip empty rows? Or keep vertical spacing? 
                // Let's keep a spacer row if needed, but for now just skip to condense
                continue;
            }

            const label = String.fromCharCode(65 + rowLabelIdx); // A, B, C...
            rowLabelIdx++;

            const rowItems = [];
            let seatNum = 1;

            for (let c = 0; c < C; c++) {
                const cell = currentRow[c];
                // 0: Gap, 1: Std, 2: VIP, 3: Blocked
                if (cell === 0) {
                    rowItems.push({ id: `gap-${r}-${c}`, type: 0 });
                } else {
                    // Seat
                    const seatId = `${label}${seatNum}`;
                    rowItems.push({ id: seatId, type: cell, label: seatId });
                    seatNum++;
                }
            }
            map.push({ label, seats: rowItems });
        }
        return map;
    } catch (e) {
        console.error("Layout Parse Error", e);
        return [];
    }
};

// Fallback generator
const generateSeatMap = (capacity) => {
    const seatsPerRow = 10;
    const rowsCount = Math.ceil(capacity / seatsPerRow);
    const rows = [];
    for (let i = 0; i < rowsCount; i++) {
        const rowLabel = String.fromCharCode(65 + i);
        const seats = [];
        for (let j = 1; j <= seatsPerRow; j++) {
            if (i * seatsPerRow + j > capacity) break;
            const sId = `${rowLabel}${j}`;
            seats.push({ id: sId, type: 1, label: sId });
        }
        rows.push({ label: rowLabel, seats });
    }
    return rows;
};

export default function SeatBooking() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Seat State
    const [bookedSeats, setBookedSeats] = useState([]); // Array of strings "A1", "B2"
    const [userHasBooking, setUserHasBooking] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState(null); // SINGLE SEAT ONLY

    // Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successBookingId, setSuccessBookingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // User
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const usn = currentUser?.usn || "";

    const [auditoriumLayout, setAuditoriumLayout] = useState(null); // Fallback layout from Audi API

    useEffect(() => {
        async function loadData() {
            // Prioritize event from navigation state (preserves selected auditorium)
            const eventFromState = location.state?.event;

            let foundEvent = eventFromState;

            // If no event in state, fetch from API
            if (!foundEvent) {
                const resEvents = await apiGet("/events/");
                foundEvent = (resEvents.events || []).find((e) => e.ID === eventId);
            }

            if (foundEvent) {
                setEvent(foundEvent);
                console.log("Event loaded:", foundEvent.Name, "| Auditorium:", foundEvent.Auditorium);
                console.log("Event SeatLayout exists?", !!foundEvent.SeatLayout);

                // 1b. Smart Fetch: If event has no layout, fetch from Auditorium
                if (!foundEvent.SeatLayout && foundEvent.Auditorium) {
                    console.log("🔍 Event layout missing, fetching auditorium:", foundEvent.Auditorium);
                    try {
                        const resAudi = await apiGet("/auditoriums/");
                        console.log("📊 Auditoriums API response:", resAudi);

                        if (resAudi && resAudi.data) {
                            console.log("Available auditoriums:", resAudi.data.map(a => a.Name));
                            const matchedAudi = resAudi.data.find(a => a.Name === foundEvent.Auditorium);

                            if (matchedAudi) {
                                console.log("✅ Found matching auditorium:", matchedAudi.Name);
                                console.log("Auditorium SeatLayout exists?", !!matchedAudi.SeatLayout);

                                if (matchedAudi.SeatLayout) {
                                    console.log("✨ Using backup layout from auditorium");
                                    setAuditoriumLayout(matchedAudi.SeatLayout);
                                } else {
                                    console.warn("⚠️ Auditorium has no SeatLayout defined");
                                }
                            } else {
                                console.warn("❌ No matching auditorium found for:", foundEvent.Auditorium);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch backup layout", e);
                    }
                } else if (foundEvent.SeatLayout) {
                    console.log("✅ Using event-specific layout");
                }

                // 2. Fetch Bookings for this event
                try {
                    const resBookings = await apiGet(`/bookings/event/${eventId}`);
                    const bookings = resBookings.data || [];

                    // Extract all booked seats
                    const allTaken = [];
                    let userFound = false;

                    bookings.forEach(b => {
                        // Check if current user booked
                        if (String(b.USN).toLowerCase() === String(usn).toLowerCase()) {
                            userFound = true;
                        }

                        // Parse seats
                        const s = String(b.Seats || "").split(",");
                        s.forEach(seat => {
                            if (seat.trim()) allTaken.push(seat.trim());
                        });
                    });

                    setBookedSeats(allTaken);
                    setUserHasBooking(userFound);
                } catch (err) {
                    console.error("Error fetching bookings", err);
                }
            }
            setLoading(false);
        }
        loadData();
    }, [eventId, usn]);

    // LOGIC: Determine active row
    // Determine Map source
    const seatMap = React.useMemo(() => {
        if (!event) return [];

        // Priority 1: Event-specific layout
        if (event.SeatLayout) {
            return parseLayout(event.SeatLayout);
        }
        // Priority 2: Auditorium-linked layout (Smart Fetch)
        if (auditoriumLayout) {
            return parseLayout(auditoriumLayout);
        }

        // Priority 3: Default generator
        return generateSeatMap(parseInt(event.Capacity) || 100);
    }, [event, auditoriumLayout]);

    // LOGIC: Determine Active Row (Universal)
    // Find the first row that is NOT full. Rows after it are locked.
    let activeRowIndex = 0;

    for (let i = 0; i < seatMap.length; i++) {
        const row = seatMap[i];
        // Check if row is full (excluding gaps)
        const isFull = row.seats.every(s => {
            // Gap (0) or Blocked (3) count as "filled" for the purpose of unlocking next row
            if (s.type === 0 || s.type === 3) return true;
            return bookedSeats.includes(s.id);
        });

        if (!isFull) {
            activeRowIndex = i;
            break;
        }
        // If last row full, activeRow is beyond end
        if (i === seatMap.length - 1 && isFull) activeRowIndex = i + 1;
    }

    const handleSeatClick = (seat, rowIndex) => {
        // Validation 1: User already booked?
        if (userHasBooking) return;

        // Validation 2: Seat already booked?
        if (bookedSeats.includes(seat)) return;

        // Validation 3: Row Locked?
        // User can only book in the active row (or previous rows if holes exist? 
        // Requirement: "after 1 row fully booked 2nd row opens" implies strict sequential.
        // However, usually we allow filling gaps in previous rows. 
        // Let's enforce strictly: ONLY allowed in activeRowIndex.
        // BUT what if someone cancels a seat in Row A while B is active? 
        // Standard logic: Allow filling ANY gap up to activeRowIndex.
        // Validation 3: Row Locked?
        // Enforce strict sequential filling.
        // Allow filling holes in previous rows (rowIndex <= activeRowIndex).
        // Block future rows (rowIndex > activeRowIndex).
        const isCustomLayout = !!(event && event.SeatLayout); // kept just for logic referencing if needed, but condition below is universal

        if (rowIndex > activeRowIndex) {
            alert("Please fill the front rows first!");
            return;
        }

        // Toggle selection (Single seat limit)
        if (selectedSeat === seat) {
            setSelectedSeat(null);
        } else {
            setSelectedSeat(seat);
        }
    };

    const handleBook = async () => {
        if (!selectedSeat) return;
        if (!usn) {
            alert("Please login.");
            navigate("/login");
            return;
        }

        setSubmitting(true);
        try {
            const schedule = location.state?.schedule || event.Time || "TBD";
            const payload = {
                USN: usn,
                EventID: eventId,
                Seats: selectedSeat, // Single string
                Schedule: schedule
            };

            const res = await apiPost("/bookings/add", payload);
            if (res && res.status === "success") {
                setSuccessBookingId(res.bookingId);
                setShowSuccessModal(true);
            } else {
                alert("Booking failed: " + (res?.message || "Unknown error"));
            }
        } catch (err) {
            console.error(err);
            alert("Server error.");
        } finally {
            setSubmitting(false);
        }
    };

    // ------------------ ZOOM & PAN STATE ------------------
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const mapRef = React.useRef(null);

    // Desktop Mouse Drag
    const handleMouseDown = (e) => {
        // Only drag if clicking on background, not buttons
        if (e.target.closest('.seat')) return;
        setIsDragging(true);
        setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setTransform((prev) => ({
            ...prev,
            x: e.clientX - startPan.x,
            y: e.clientY - startPan.y,
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Desktop Wheel Zoom
    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey || true) { // Always allow scroll to zoom in map area
            e.preventDefault();
            const scaleAmount = -e.deltaY * 0.001;
            setTransform((prev) => {
                const newScale = Math.min(Math.max(prev.scale + scaleAmount, 0.5), 3);
                return { ...prev, scale: newScale };
            });
        }
    };

    // Touch Handling (Pinch & Pan)
    const [lastTouch, setLastTouch] = useState(null);
    const [initialDist, setInitialDist] = useState(null);

    const getDist = (t1, t2) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            // Pan Start
            const t = e.touches[0];
            setLastTouch({ x: t.clientX, y: t.clientY });
            setIsDragging(true); // Reuse flag for simple pan
        } else if (e.touches.length === 2) {
            // Pinch Start
            setInitialDist(getDist(e.touches[0], e.touches[1]));
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 1 && isDragging && lastTouch) {
            // Pan Action
            const t = e.touches[0];
            const dx = t.clientX - lastTouch.x;
            const dy = t.clientY - lastTouch.y;
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setLastTouch({ x: t.clientX, y: t.clientY });
        } else if (e.touches.length === 2 && initialDist) {
            // Pinch Action
            const dist = getDist(e.touches[0], e.touches[1]);
            const delta = dist - initialDist;
            const scaleFactor = delta * 0.005; // Sensitivity

            setTransform(prev => ({
                ...prev,
                scale: Math.min(Math.max(prev.scale + scaleFactor, 0.5), 3)
            }));
            setInitialDist(dist);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setLastTouch(null);
        setInitialDist(null);
    };

    // Manual Controls
    const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale * 1.2, 3) }));
    const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale / 1.2, 0.5) }));
    const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

    if (loading) return <div className="sb-container"><div className="loader"></div></div>;
    if (!event) return <div className="sb-container"><h2>Event not found</h2></div>;

    return (
        <div className="sb-container">
            {/* SUCCESS MODAL */}
            {showSuccessModal && (
                <div className="modal-overlay">
                    <div className="modal-box premium-glow">
                        <div className="check-icon">✓</div>
                        <h2>Booking Confirmed!</h2>
                        <p>Your seat <strong>{selectedSeat}</strong> has been successfully booked.</p>
                        <div className="modal-actions">
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    const ticketData = {
                                        bookingId: successBookingId,
                                        usn: usn,
                                        eventName: event.Name || event.name || "Event",
                                        seats: [selectedSeat],
                                        schedule: location.state?.schedule || event.Time || event.time || "TBD",
                                        bookedOn: new Date().toLocaleString(),
                                        poster: event.Poster || event.poster || "/assets/default.jpg",
                                        auditorium: event.Auditorium || event.auditorium,
                                    };
                                    navigate(`/ticket/${successBookingId}`, { state: { ticket: ticketData } });
                                }}
                            >
                                View Ticket
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => navigate("/user/events")}
                            >
                                Back to Events
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="sb-layout">
                {/* INFO SIDEBAR */}
                <div className="sb-info-side">
                    <img src={event.Poster || event.poster || "/assets/default.jpg"} alt="Poster" className="sb-poster-large" onError={(e) => { e.target.src = "/assets/default.jpg"; }} />
                    <div className="info-text-block">
                        <h1>{event.Name || event.name || "Event"}</h1>
                        <p className="aud-name">{event.Auditorium || event.auditorium || "Auditorium"}</p>
                        <p className="event-dt">{event.Date || event.date || "TBA"} • {event.Time || event.time || "TBA"}</p>
                    </div>

                    {userHasBooking && (
                        <div className="alert-box">
                            You have already booked this event.
                        </div>
                    )}

                    <div className="legend">
                        <div className="l-item"><span className="dot available"></span> Available</div>
                        <div className="l-item"><span className="dot selected"></span> Selected</div>
                        <div className="l-item"><span className="dot booked"></span> Booked</div>
                        <div className="l-item"><span className="dot locked"></span> Locked</div>
                    </div>

                    <div className="confirm-block">
                        <p className="selection-text">
                            {selectedSeat ? `Selected: ${selectedSeat}` : "Select a seat"}
                        </p>
                        <button
                            className="sb-confirm-btn"
                            disabled={!selectedSeat || submitting || userHasBooking}
                            onClick={handleBook}
                        >
                            {submitting ? "Booking..." : "Confirm Booking"}
                        </button>
                    </div>
                </div>

                {/* MAP SIDE (ZOOMABLE) */}
                <div className="sb-map-side">
                    {/* Controls */}
                    <div className="zoom-controls">
                        <button onClick={zoomIn} title="Zoom In">+</button>
                        <button onClick={zoomOut} title="Zoom Out">-</button>
                        <button onClick={resetZoom} title="Reset">⟲</button>
                    </div>

                    <div className="tip-text">Pinch or Scroll to Zoom • Drag to Move</div>

                    <div
                        className="map-viewport"
                        ref={mapRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div
                            className="zoom-content"
                            style={{
                                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
                            }}
                        >
                            <div className="screen">SCREEN</div>

                            <div className="seat-grid">
                                {seatMap.map((row, rowIndex) => (
                                    <div key={row.label} className="seat-row">
                                        <div className="row-label">{row.label}</div>
                                        {row.seats.map(item => {
                                            if (item.type === 0) {
                                                return <div key={item.id} className="seat-gap" />;
                                            }
                                            const seatId = item.id;
                                            const isPermanentlyBlocked = item.type === 3;
                                            const isBooked = bookedSeats.includes(seatId);
                                            const isSelected = selectedSeat === seatId;
                                            const isLocked = rowIndex > activeRowIndex;

                                            let statusClass = "available";
                                            if (isPermanentlyBlocked) statusClass = "booked";
                                            else if (isBooked) statusClass = "booked";
                                            else if (isSelected) statusClass = "selected";
                                            else if (isLocked) statusClass = "locked";

                                            return (
                                                <button
                                                    key={seatId}
                                                    className={`seat ${statusClass}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // prevent drag start
                                                        !isPermanentlyBlocked && handleSeatClick(seatId, rowIndex);
                                                    }}
                                                    disabled={isPermanentlyBlocked || isBooked || (isLocked && !isBooked) || userHasBooking}
                                                    title={isLocked ? "Row locked" : seatId}
                                                    onTouchEnd={(e) => {
                                                        // Prevent click if we were dragging
                                                        // A simple way is often just rely on onClick, 
                                                        // but separating tap vs pan is better. 
                                                        // For MVP, onClick works if no drag occurred.
                                                    }}
                                                >
                                                    {item.label.substring(1)}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
