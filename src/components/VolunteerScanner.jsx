// src/components/VolunteerScanner.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import QrScanner from "qr-scanner";
import { apiGet, apiPost } from "../utils/api";
import "./VolunteerScanner.css";

export default function VolunteerScanner() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAuditorium, setSelectedAuditorium] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [auditoriums, setAuditoriums] = useState([]);
    const [events, setEvents] = useState([]);

    // Mode: 'scan' | 'manual'
    const [mode, setMode] = useState('scan');
    const [manualInput, setManualInput] = useState("");

    // Scanning state
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null); // { type: "success"|"error"|"duplicate", message: "..." }
    const videoRef = useRef(null);
    const scannerRef = useRef(null);

    // User Check
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const role = (user.role || user.Role || "").toLowerCase();
    const isAuthorized = role === "volunteer" || role === "admin";

    // Page check - hide on landing and login pages
    const currentPath = location.pathname;
    const hideOnPages = ["/", "/login", "/register"];
    const shouldHide = hideOnPages.includes(currentPath);

    useEffect(() => {
        if (isOpen && isAuthorized) {
            loadTodayEvents();
        }
    }, [isOpen, isAuthorized]);

    // Clean up scanner on unmount or close
    useEffect(() => {
        return () => stopScanner();
    }, [isOpen, mode]);

    // Hide scanner button on landing/login pages or if not authorized
    if (!isAuthorized || shouldHide) return null;

    async function loadTodayEvents() {
        try {
            const res = await apiGet("/events/");
            const allEvents = res.events || [];
            const today = new Date().toISOString().split("T")[0];
            const todaySlots = [];

            allEvents.forEach(ev => {
                let schedules = [];

                // Parse schedules
                if (ev.Schedules) {
                    try {
                        const parsed = typeof ev.Schedules === 'string' ? JSON.parse(ev.Schedules) : ev.Schedules;
                        if (Array.isArray(parsed)) {
                            schedules = parsed.map(s => {
                                if (s.Date && s.Time) return `${s.Date}T${s.Time}:00`;
                                return null;
                            }).filter(Boolean);
                        }
                    } catch (e) { console.warn("Schedules parse error", e); }
                }

                // Fallback if no schedules
                if (schedules.length === 0 && ev.Date) {
                    schedules.push(`${ev.Date}T${ev.Time || "00:00"}:00`);
                }

                // Filter for TODAY
                schedules.forEach(s => {
                    const scheduleDate = s.split("T")[0];
                    if (scheduleDate === today) {
                        const timeLabel = new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                        const audiList = (ev.Auditorium || "Main Auditorium").split(',').map(a => a.trim()).filter(Boolean);

                        audiList.forEach(audi => {
                            todaySlots.push({
                                eventId: ev.ID,
                                eventName: ev.Name,
                                auditorium: audi,
                                schedule: s,
                                label: `${ev.Name} @ ${audi} (${timeLabel})`,
                                key: `${ev.ID}_${s}_${audi}`
                            });
                        });
                    }
                });
            });

            setEvents(todaySlots);

            // Extract unique Auditoriums
            const uniqueAudis = [...new Set(todaySlots.map(s => s.auditorium))].sort();
            setAuditoriums(uniqueAudis);

        } catch (e) {
            console.error("Failed to load events", e);
        }
    }

    function startScanner() {
        if (!videoRef.current) return;
        setScanning(true);
        setScanResult(null);

        scannerRef.current = new QrScanner(
            videoRef.current,
            (result) => handleScan(result),
            {
                returnDetailedScanResult: true,
                highlightScanRegion: true,
                highlightCodeOutline: true,
            }
        );
        scannerRef.current.start();
    }

    function stopScanner() {
        if (scannerRef.current) {
            scannerRef.current.stop();
            scannerRef.current.destroy();
            scannerRef.current = null;
        }
        setScanning(false);
    }

    const handleScan = async (result) => {
        if (!result || !result.data) return;
        if (scannerRef.current) scannerRef.current.pause();

        let payloadId = result.data;
        // Try parsing if it's JSON
        try {
            const parsed = JSON.parse(result.data);
            if (parsed.bookingId) payloadId = parsed.bookingId;
            else if (parsed.usn) payloadId = parsed.usn;
        } catch {
            // It's likely a raw string(USN or BookingID)
        }

        await processCheckIn(payloadId);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        await processCheckIn(manualInput.trim());
    };

    const processCheckIn = async (identifier) => {
        try {
            const res = await apiPost("/attendance/mark", {
                usn: identifier,
                eventId: selectedEvent.eventId,
                auditorium: selectedEvent.auditorium,
                schedule: selectedEvent.schedule
            });

            if (res.status === "success" || res.success) {
                setScanResult({ type: "success", message: "✅ Check-in Approved", details: res.data || { id: identifier } });
            } else if (res.status === "duplicate") {
                setScanResult({ type: "duplicate", message: "⛔ ALREADY ENTERED", details: { message: res.message } });
            } else {
                setScanResult({ type: "error", message: res.message || "❌ Check-in Failed" });
            }
        } catch (err) {
            console.error(err);
            if (err.response?.status === 409) {
                setScanResult({ type: "duplicate", message: "⛔ ALREADY ENTERED", details: { message: "This ticket was already scanned" } });
            } else {
                setScanResult({ type: "error", message: "Network Error or server unreachable." });
            }
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setManualInput("");
        if (mode === 'scan' && scannerRef.current) {
            scannerRef.current.start();
        }
    };

    // Filter events for selected auditorium
    const availableEvents = selectedAuditorium
        ? events.filter(e => e.auditorium === selectedAuditorium)
        : [];

    // --- RENDER ---

    if (!isOpen) {
        return (
            <button
                className="volunteer-float-btn"
                onClick={() => setIsOpen(true)}
                title="Open VIP Scanner"
            >
                📷 Scanner
            </button>
        );
    }

    return (
        <div className="scanner-overlay">
            <div className="scanner-box">
                <div className="scanner-header">
                    <h3>🎫 VIP Access Control</h3>
                    <button className="close-btn" onClick={() => { stopScanner(); setIsOpen(false); setSelectedAuditorium(null); setSelectedEvent(null); }}>✕</button>
                </div>

                {/* STEP 1: Select Auditorium */}
                {!selectedAuditorium && (
                    <div className="scanner-step">
                        <p className="muted" style={{ marginBottom: '10px' }}>1. Select Auditorium (Today):</p>
                        <div className="v-event-list">
                            {auditoriums.map(audi => (
                                <div key={audi} className="v-event-item" onClick={() => setSelectedAuditorium(audi)}>
                                    <strong>🏛️ {audi}</strong>
                                </div>
                            ))}
                            {auditoriums.length === 0 && <p className="muted">No auditoriums have events today</p>}
                        </div>
                    </div>
                )}

                {/* STEP 2: Select Event */}
                {selectedAuditorium && !selectedEvent && (
                    <div className="scanner-step">
                        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p className="muted">2. Select Event at <strong>{selectedAuditorium}</strong>:</p>
                            <button className="text-btn" onClick={() => setSelectedAuditorium(null)}>← Back</button>
                        </div>
                        <div className="v-event-list">
                            {availableEvents.map(ev => (
                                <div key={ev.key} className="v-event-item" onClick={() => setSelectedEvent(ev)}>
                                    <strong>{ev.label}</strong>
                                </div>
                            ))}
                            {availableEvents.length === 0 && <p className="muted">No events at this auditorium today</p>}
                        </div>
                    </div>
                )}

                {/* STEP 3: Main Scanner UI */}
                {selectedEvent && !scanResult && (
                    <>
                        <div style={{ padding: '15px 24px 0' }}>
                            <div className="scanner-info" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ color: '#fff', fontWeight: 600, display: 'block' }}>{selectedEvent.eventName}</span>
                                    <small style={{ color: '#888' }}>@ {selectedEvent.auditorium}</small>
                                </div>
                                <button className="text-btn" onClick={() => { stopScanner(); setSelectedEvent(null); }}>← Back</button>
                            </div>
                        </div>

                        <div className="scanner-tabs">
                            <button className={`tab-btn ${mode === 'scan' ? 'active' : ''}`} onClick={() => setMode('scan')}>
                                📷 Camera Scan
                            </button>
                            <button className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
                                ✍️ Manual Entry
                            </button>
                        </div>

                        <div className="scanner-step" style={{ paddingTop: 0 }}>

                            {mode === 'scan' && (
                                <div className="video-wrapper">
                                    <div className="scan-line"></div>
                                    {!scanning && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5
                                        }}>
                                            <button className="submit-btn" onClick={startScanner}>Start Camera</button>
                                        </div>
                                    )}
                                    <video ref={videoRef} className="scanner-video"></video>
                                </div>
                            )}

                            {mode === 'manual' && (
                                <form onSubmit={handleManualSubmit} className="manual-entry-form">
                                    <input
                                        type="text"
                                        className="manual-input"
                                        placeholder="Enter Booking ID or USN"
                                        value={manualInput}
                                        onChange={e => setManualInput(e.target.value)}
                                        autoFocus
                                    />
                                    <button type="submit" className="submit-btn" disabled={!manualInput}>
                                        Verify Ticket
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                )}

                {/* STEP 4: Result */}
                {scanResult && (
                    <div className="scanner-step">
                        <div className={`scan-result ${scanResult.type}`}>
                            <div className="result-icon">
                                {scanResult.type === "success" && "✅"}
                                {scanResult.type === "duplicate" && "⛔"}
                                {scanResult.type === "error" && "❌"}
                            </div>
                            <h4 style={{
                                color: scanResult.type === "success" ? "#4caf50" : scanResult.type === "duplicate" ? "#ff4444" : "#ff9800"
                            }}>
                                {scanResult.type === "success" && "ACCESS GRANTED"}
                                {scanResult.type === "duplicate" && "ALREADY ENTERED"}
                                {scanResult.type === "error" && "ACCESS DENIED"}
                            </h4>
                            <p style={{ color: '#ccc' }}>{scanResult.message}</p>

                            {scanResult.details && (
                                <div className="scan-details">
                                    {scanResult.details.id && <p><strong>ID:</strong> {scanResult.details.id}</p>}
                                    {scanResult.details.message && <p>{scanResult.details.message}</p>}
                                </div>
                            )}

                            <button className="next-btn" onClick={resetScan}>
                                {mode === 'scan' ? 'Scan Next Ticket' : 'Check Next Entry'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
