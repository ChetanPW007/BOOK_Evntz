// src/components/VolunteerScanner.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import QrScanner from "qr-scanner";
import { apiGet, apiPost } from "../utils/api";
import "./VolunteerScanner.css";

export default function VolunteerScanner() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);

    // Mode: 'scan' | 'manual'
    const [mode, setMode] = useState('scan');
    const [manualInput, setManualInput] = useState("");

    // Scanning state
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null); // { type: "success"|"error", message: "..." }
    const videoRef = useRef(null);
    const scannerRef = useRef(null);

    // User Check
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const role = (user.role || user.Role || "").toLowerCase();
    const isAuthorized = role === "volunteer" || role === "admin";

    // Page check - hide on landing and login pages
    const currentPath = location.pathname;
    const hideOnPages = ["/", "/login", "/register"]; // Hide on home page too if you want, but user asked for float
    const shouldHide = hideOnPages.includes(currentPath);

    useEffect(() => {
        if (isOpen && isAuthorized) {
            loadEvents();
        }
    }, [isOpen, isAuthorized]);

    // Clean up scanner on unmount or close
    useEffect(() => {
        return () => stopScanner();
    }, [isOpen, mode]);

    // Hide scanner button on landing/login pages or if not authorized
    if (!isAuthorized || shouldHide) return null;

    async function loadEvents() {
        try {
            const res = await apiGet("/events/");
            if (res.events) {
                // Today's date string in "YYYY-MM-DD" or similar format
                // The Google Sheets date format is usually YYYY-MM-DD
                const todayStr = new Date().toISOString().split('T')[0];

                // Filter for events happening today
                const todayEvents = res.events.filter(ev => {
                    if (!ev.Date) return false;
                    // Standardize both to YYYY-MM-DD for comparison
                    try {
                        const evDate = new Date(ev.Date).toISOString().split('T')[0];
                        return evDate === todayStr;
                    } catch {
                        return false;
                    }
                });
                setEvents(todayEvents);
            }
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
                usn: identifier, // The backend seems to expect 'usn' or 'bookingId' - simplifying to generic identifier
                eventId: selectedEvent.id || selectedEvent.ID
            });

            if (res.status === "success" || res.success) {
                setScanResult({ type: "success", message: "Check-in Approved", details: res.data || { id: identifier } });
            } else {
                setScanResult({ type: "error", message: res.message || "Check-in Failed" });
            }
        } catch (err) {
            console.error(err);
            setScanResult({ type: "error", message: "Network Error or server unreachable." });
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setManualInput("");
        if (mode === 'scan' && scannerRef.current) {
            scannerRef.current.start();
        }
    };

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
                    <button className="close-btn" onClick={() => { stopScanner(); setIsOpen(false); }}>✕</button>
                </div>

                {/* STEP 1: Select Event */}
                {!selectedEvent && (
                    <div className="scanner-step">
                        <p className="muted" style={{ marginBottom: '10px' }}>Select active event:</p>
                        <div className="v-event-list">
                            {events.map(ev => (
                                <div key={ev.ID || ev.id} className="v-event-item" onClick={() => setSelectedEvent(ev)}>
                                    <strong>{ev.Name || ev.name}</strong>
                                    <span>{ev.Date || ev.date}</span>
                                </div>
                            ))}
                            {events.length === 0 && <p className="muted">No events found</p>}
                        </div>
                    </div>
                )}

                {/* STEP 2: Main Scanner UI */}
                {selectedEvent && !scanResult && (
                    <>
                        <div style={{ padding: '15px 24px 0' }}>
                            <div className="scanner-info" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{selectedEvent.Name || selectedEvent.name}</span>
                                <button className="text-btn" onClick={() => { stopScanner(); setSelectedEvent(null); }}>Switch Event</button>
                            </div>
                        </div>

                        <div className="scanner-tabs">
                            <button className={`tab-btn ${mode === 'scan' ? 'active' : ''}`} onClick={() => setMode('scan')}>
                                Camera Scan
                            </button>
                            <button className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
                                Manual Entry
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

                {/* STEP 3: Result */}
                {scanResult && (
                    <div className="scanner-step">
                        <div className={`scan-result ${scanResult.type}`}>
                            <div className="result-icon">
                                {scanResult.type === "success" ? "✅" : "❌"}
                            </div>
                            <h4>{scanResult.type === "success" ? "ACCESS GRANTED" : "ACCESS DENIED"}</h4>
                            <p style={{ color: '#ccc' }}>{scanResult.message}</p>

                            {scanResult.details && (
                                <div className="scan-details">
                                    <p><strong>ID:</strong> {scanResult.details.id || scanResult.details.usn || "N/A"}</p>
                                    <p><strong>Status:</strong> Checked In</p>
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
