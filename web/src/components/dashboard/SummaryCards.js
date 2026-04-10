import { cardStyle, sectionTitleStyle } from "./styles";

export default function SummaryCards({ customersCount, devicesCount, paymentsCount }) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Resumen</h2>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div style={{ padding: 12, borderRadius: 12, background: "#dbeafe", color: "#1e3a8a" }}>
          Clientes: {customersCount}
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "#dcfce7", color: "#166534" }}>
          Dispositivos: {devicesCount}
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "#fef3c7", color: "#92400e" }}>
          Pagos: {paymentsCount}
        </div>
      </div>
    </section>
  );
}
