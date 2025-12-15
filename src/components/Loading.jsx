import React from "react";
import "./Loading.css";

export default function Loading() {
    return (
        <div className="loading-container">
            <div className="spinner-box">
                <div className="circle-border outer-ring"></div>
                <div className="circle-border middle-ring"></div>
                <div className="inner-core"></div>
            </div>
            <div className="loading-text-style">Loading</div>
        </div>
    );
}
