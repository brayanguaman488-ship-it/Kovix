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
          borderRadius: 20,
          background:
            "radial-gradient(circle at 18% 16%, rgba(56,189,248,0.35), rgba(30,58,138,0.95) 54%, rgba(15,23,42,1) 100%)",
          border: "1px solid rgba(125, 211, 252, 0.44)",
          boxShadow: "0 18px 32px rgba(15, 23, 42, 0.46), inset 0 0 0 1px rgba(255,255,255,0.08)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="76%"
          height="76%"
          aria-hidden="true"
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id="novaStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="55%" stopColor="#a5f3fc" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>
          <path
            d="M26 16 L26 84"
            stroke="url(#novaStroke)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M29 50 L76 16"
            stroke="url(#novaStroke)"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M41 50 L76 84"
            stroke="url(#novaStroke)"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M14 74 C28 84, 44 89, 66 89"
            stroke="rgba(219, 234, 254, 0.65)"
            strokeWidth="4"
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
