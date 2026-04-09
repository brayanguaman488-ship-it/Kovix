import { cardStyle, sectionTitleStyle } from "./styles";

export default function SummaryCards({ customersCount, devicesCount, paymentsCount }) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Resumen</h2>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div style={{ padding: 12, borderRadius: 10, background: "#eff6ff" }}>Clientes: {customersCount}</div>
        <div style={{ padding: 12, borderRadius: 10, background: "#f0fdf4" }}>Dispositivos: {devicesCount}</div>
        <div style={{ padding: 12, borderRadius: 10, background: "#fff7ed" }}>Pagos: {paymentsCount}</div>
      </div>
    </section>
  );
}
