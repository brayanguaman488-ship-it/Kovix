import { buttonStyle, cardStyle, secondaryButtonStyle, sectionTitleStyle } from "./styles";

export default function IOSDevicesList({ devices, onAction, pendingDeviceId }) {
  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ ...sectionTitleStyle, marginBottom: 4 }}>iPhone</h2>
          <p style={{ margin: 0, color: "var(--text-soft)", fontSize: 14 }}>Dispositivos iOS administrados por el portal exclusivo de Hexnode.</p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--text-soft)", fontSize: 12 }}><th style={{ padding: 10 }}>Cliente</th><th style={{ padding: 10 }}>Modelo</th><th style={{ padding: 10 }}>IMEI</th><th style={{ padding: 10 }}>Serie</th><th style={{ padding: 10 }}>Hexnode ID</th><th style={{ padding: 10 }}>Estado</th><th style={{ padding: 10 }}>Acción</th></tr></thead>
          <tbody>{devices.map((device) => {
            const blocked = String(device.currentStatus).toUpperCase() === "BLOQUEADO";
            const pending = String(pendingDeviceId) === String(device.id);
            return <tr key={device.id} style={{ borderTop: "1px solid #eef2f7" }}>
              <td style={{ padding: 10 }}>{device.customer?.fullName || "—"}</td><td style={{ padding: 10 }}> {device.brand} {device.model}</td><td style={{ padding: 10 }}>{device.imei || "—"}</td><td style={{ padding: 10 }}>{device.serialNumber || "—"}</td><td style={{ padding: 10 }}>{device.hexnodeDeviceId || "—"}</td>
              <td style={{ padding: 10 }}><span style={{ display: "inline-flex", padding: "5px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800, color: blocked ? "#991b1b" : "#166534", background: blocked ? "#fee2e2" : "#dcfce7" }}>{blocked ? "BLOQUEADO" : "ACTIVO"}</span></td>
              <td style={{ padding: 10 }}><button type="button" disabled={pending} style={blocked ? buttonStyle : secondaryButtonStyle} onClick={() => onAction(device, blocked ? "unblock" : "block")}>{pending ? "Procesando..." : blocked ? "Desbloquear" : "Bloquear"}</button></td>
            </tr>;
          })}</tbody>
        </table>
        {devices.length === 0 && <p style={{ color: "var(--text-soft)", padding: 12 }}>No hay iPhone registrados.</p>}
      </div>
    </section>
  );
}
