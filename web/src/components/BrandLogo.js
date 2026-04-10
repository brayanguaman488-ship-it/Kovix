import { useState } from "react";

const variants = {
  full: "/brand/kovix-logo-full.png",
  shield: "/brand/kovix-logo-shield.png",
};

export default function BrandLogo({
  variant = "full",
  alt = "KOVIX",
  height = 56,
  maxWidth = 260,
}) {
  const [hasError, setHasError] = useState(false);
  const src = variants[variant] || variants.full;

  if (hasError) {
    return (
      <span
        style={{
          display: "inline-block",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 1.4,
          color: "#1e3a8a",
        }}
      >
        KOVIX
      </span>
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
