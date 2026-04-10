export default function StatusMessage({ message, type = "info" }) {
  if (!message) {
    return null;
  }

  const paletteByType = {
    info: {
      border: "1px solid #bae6fd",
      background: "#f0f9ff",
      color: "#0c4a6e",
    },
    success: {
      border: "1px solid #86efac",
      background: "#f0fdf4",
      color: "#166534",
    },
    error: {
      border: "1px solid #fca5a5",
      background: "#fef2f2",
      color: "#991b1b",
    },
  };

  const palette = paletteByType[type] || paletteByType.info;

  return (
    <section
      style={{
        padding: 13,
        borderRadius: 12,
        border: palette.border,
        background: palette.background,
        color: palette.color,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
      }}
    >
      {message}
    </section>
  );
}
