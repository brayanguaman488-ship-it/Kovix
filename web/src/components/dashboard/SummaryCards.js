import { cardStyle, sectionTitleStyle } from "./styles";

export default function SummaryCards({ customersCount, devicesCount, paymentsCount }) {
  const items = [
    {
      label: "Clientes",
      value: customersCount,
      style: {
        border: "1px solid rgba(37, 99, 235, 0.18)",
        background: "linear-gradient(180deg, rgba(219, 234, 254, 0.7), rgba(239, 246, 255, 0.78))",
        color: "#1e3a8a",
      },
    },
    {
      label: "Dispositivos",
      value: devicesCount,
      style: {
        border: "1px solid rgba(22, 163, 74, 0.18)",
        background: "linear-gradient(180deg, rgba(220, 252, 231, 0.7), rgba(240, 253, 244, 0.78))",
        color: "#166534",
      },
    },
    {
      label: "Pagos",
      value: paymentsCount,
      style: {
        border: "1px solid rgba(217, 119, 6, 0.2)",
        background: "linear-gradient(180deg, rgba(254, 243, 199, 0.74), rgba(255, 251, 235, 0.8))",
        color: "#92400e",
      },
    },
  ];

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Resumen</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {items.map((item) => (
          <article
            key={item.label}
            style={{
              borderRadius: 14,
              padding: "13px 14px",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)",
              ...item.style,
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.9, opacity: 0.8 }}>
              {item.label}
            </div>
            <div style={{ marginTop: 2, fontSize: 23, fontWeight: 700, lineHeight: 1.2 }}>{item.value}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
