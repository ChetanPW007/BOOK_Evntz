
import React, { useState } from "react";
import { FaLinkedin } from "react-icons/fa";
import "./DeveloperSection.css";

export default function DeveloperSection() {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleDoubleClick = () => {
        setIsFlipped(!isFlipped);
    };

    const handleLinkedinClick = (e) => {
        e.stopPropagation();
        window.open(
            "https://www.linkedin.com/in/chetan-prakash-wardi-aa5b92328?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BpxP7ElIOQdyraMkd6%2F2jiA%3D%3D",
            "_blank"
        );
    };

    return (
        <div className="developer-section">
            <h2 className="dev-heading">Meet our Developers Team</h2>

            <div className="dev-card-container">
                <div
                    className={`dev-card ${isFlipped ? "flipped" : ""}`}
                    onDoubleClick={handleDoubleClick}
                    title="Double click to flip!"
                >
                    <div className="dev-card-inner">

                        {/* FRONT FACE */}
                        <div className="dev-card-front radiant-glow">
                            <div className="dev-image-wrapper">
                                <img
                                    src="/assets/developer.png"
                                    alt="Chetan Prakash Wardi"
                                    className="dev-image"
                                />
                            </div>
                            <div className="dev-info">
                                <h3 className="dev-name">Chetan Prakash Wardi</h3>
                                <p className="dev-details">3rd Sem Cyber Security [CSE-CY]</p>
                                <p className="dev-college">GM University</p>
                            </div>
                        </div>

                        {/* BACK FACE */}
                        <div className="dev-card-back radiant-glow">
                            <button className="linkedin-btn" onClick={handleLinkedinClick}>
                                <FaLinkedin size={80} />
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

