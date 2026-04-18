import { cardStyle, sectionTitleStyle } from "./styles";

export default function SummaryCards({
  customersCount,
  devicesCount,
  paymentsCount,
  activeSection,
  onSelectSection,
}) {
  const items = [
    {
      key: "customers",
      label: "Clientes",
      value: customersCount,
      style: {
        border: "1px solid rgba(59, 130, 246, 0.28)",
        background: "#ffffff",
        color: "#1e3a8a",
      },
    },
    {
      key: "devices",
      label: "Dispositivos",
      value: devicesCount,
      style: {
        border: "1px solid rgba(34, 197, 94, 0.28)",
        background: "#ffffff",
        color: "#166534",
      },
    },
    {
      key: "payments",
      label: "Pagos",
      value: paymentsCount,
      style: {
        border: "1px solid rgba(245, 158, 11, 0.35)",
        background: "#ffffff",
        color: "#92400e",
      },
    },
  ];

  return (
    <section style={{ ...cardStyle, borderRadius: 28 }}>
      <h2 style={sectionTitleStyle}>Resumen</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectSection?.(item.key)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderRadius: 20,
              padding: "16px 16px",
              boxShadow: "0 5px 14px rgba(15, 23, 42, 0.05)",
              transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
              transform: activeSection === item.key ? "translateY(-1px)" : "none",
              borderColor: activeSection === item.key ? "rgba(37, 99, 235, 0.6)" : undefined,
              boxSizing: "border-box",
              ...item.style,
            }}
          >
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, opacity: 0.8 }}>
              {item.label}
            </div>
            <div style={{ marginTop: 4, fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
