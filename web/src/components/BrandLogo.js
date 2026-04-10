import { useState } from "react";

const variants = {
  full: "/brand/kovix-logo-full.png",
  shield: "/brand/kovix-logo-shield.png",
};

export default function BrandLogo({
  variant = "nova",
  alt = "KOVIX Shield",
  height = 62,
  maxWidth = 62,
}) {
  if (variant === "nova") {
    return (
      <div
        aria-label={alt}
        role="img"
        style={{
          height,
          width: height,
          maxWidth,
          borderRadius: 0,
          background: "transparent",
          boxShadow: "0 16px 30px rgba(15, 23, 42, 0.34)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          aria-hidden="true"
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id="novaShield" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="55%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="novaStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eef2ff" />
              <stop offset="55%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#ccfbf1" />
            </linearGradient>
          </defs>
          <path
            d="M50 7 C35 8, 23 13, 16 17 V47 C16 67, 30 83, 50 93 C70 83, 84 67, 84 47 V17 C77 13, 65 8, 50 7 Z"
            fill="url(#novaShield)"
            opacity="0.94"
          />
          <path
            d="M35 22 L35 74"
            stroke="url(#novaStroke)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M37 47 L70 22"
            stroke="url(#novaStroke)"
            strokeWidth="9.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M45 47 L70 72"
            stroke="url(#novaStroke)"
            strokeWidth="9.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M22 66 C34 75, 48 79, 66 78"
            stroke="rgba(219, 234, 254, 0.58)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  const [hasError, setHasError] = useState(false);
  const src = variants[variant] || variants.full;

  if (hasError) {
    return (
      <div
        style={{
          height,
          width: height,
          borderRadius: 16,
          background: "linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 100%)",
          color: "#ffffff",
          display: "grid",
          placeItems: "center",
          fontSize: 30,
          fontWeight: 800,
          boxShadow: "0 16px 30px rgba(14, 165, 233, 0.32)",
        }}
      >
        K
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      style={{
        height,
        width: "auto",
        maxWidth,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
