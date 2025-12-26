// src/components/FeaturedSlider.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./FeaturedSlider.css";

export default function FeaturedSlider({ events }) {
    const [index, setIndex] = useState(0);
    const navigate = useNavigate();

    // Auto-slide effect
    useEffect(() => {
        if (!events || events.length === 0) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 5000);
        return () => clearInterval(timer);
    }, [index, events]);

    // If no events, don't render slider
    if (!events || events.length === 0) return null;

    const nextSlide = () => {
        setIndex((prev) => (prev + 1) % events.length);
    };

    const prevSlide = () => {
        setIndex((prev) => (prev - 1 + events.length) % events.length);
    };

    const currentEvent = events[index];

    return (
        <div className="featured-slider-container">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentEvent.id ? currentEvent.id : index}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="slider-slide"
                    style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
                >
                    <img
                        src={currentEvent.poster || "/assets/default.jpg"}
                        alt={currentEvent.name}
                        className="slider-image"
                    />
                    <div className="slider-overlay">
                        <div className="slider-content">
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {currentEvent.name}
                            </motion.h2>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {currentEvent.date} • {currentEvent.auditorium}
                            </motion.p>
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="slider-btn"
                                onClick={() => navigate(`/event/${currentEvent.id}`)}
                            >
                                Book Now
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button className="arrow-btn arrow-left" onClick={prevSlide}>❮</button>
            <button className="arrow-btn arrow-right" onClick={nextSlide}>❯</button>

            {/* Dots */}
            <div className="slider-dots">
                {events.map((_, i) => (
                    <div
                        key={i}
                        className={`dot ${i === index ? "active" : ""}`}
                        onClick={() => setIndex(i)}
                    />
                ))}
            </div>
        </div>
    );
}
