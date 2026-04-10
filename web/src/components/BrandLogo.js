import { useState } from "react";

const variants = {
  full: "/brand/kovix-logo-full.png",
  shield: "/brand/kovix-logo-shield.png",
};

export default function BrandLogo({
  variant = "shield",
  alt = "KOVIX Shield",
  height = 62,
  maxWidth = 62,
}) {
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
