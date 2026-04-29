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
      icon: "U",
      style: {
        border: "1px solid rgba(59, 130, 246, 0.28)",
        background: "linear-gradient(180deg, #ffffff, #f8fbff)",
        color: "#1e3a8a",
      },
    },
    {
      key: "devices",
      label: "Dispositivos",
      value: devicesCount,
      icon: "M",
      style: {
        border: "1px solid rgba(34, 197, 94, 0.28)",
        background: "linear-gradient(180deg, #ffffff, #f7fff9)",
        color: "#166534",
      },
    },
    {
      key: "payments",
      label: "Pagos",
      value: paymentsCount,
      icon: "$",
      style: {
        border: "1px solid rgba(245, 158, 11, 0.35)",
        background: "linear-gradient(180deg, #ffffff, #fffaf5)",
        color: "#92400e",
      },
    },
  ];

  return (
    <section style={{ ...cardStyle, borderRadius: 28 }}>
      <h2 style={sectionTitleStyle}>Resumen</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectSection?.(item.key)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderRadius: 18,
              padding: "16px 18px",
              boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
              transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
              transform: activeSection === item.key ? "translateY(-1px)" : "none",
              borderColor: activeSection === item.key ? "rgba(37, 99, 235, 0.6)" : undefined,
              boxSizing: "border-box",
              ...item.style,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, opacity: 0.8 }}>
                {item.label}
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                {item.icon}
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{item.value}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
