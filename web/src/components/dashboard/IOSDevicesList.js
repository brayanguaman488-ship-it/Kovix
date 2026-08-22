import { buttonStyle, cardStyle, listItemStyle, secondaryButtonStyle, sectionTitleStyle } from "./styles";

export default function IOSDevicesList({ devices, onAction, onModeChange, pendingDeviceId, pendingModeDeviceId }) {
  const activeCount = devices.filter((device) => String(device.currentStatus).toUpperCase() !== "BLOQUEADO").length;
  const blockedCount = devices.length - activeCount;

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ ...sectionTitleStyle, marginBottom: 4 }}>iPhone</h2>
          <p style={{ margin: 0, color: "var(--text-soft)", fontSize: 14 }}>Dispositivos iOS administrados por el portal exclusivo de Hexnode.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
        <article style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 12, background: "#f8fbff" }}>
          <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Total</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a" }}>{devices.length}</div>
        </article>
        <article style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 12, background: "#f7fff9" }}>
          <div style={{ color: "#16a34a", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Activos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#166534" }}>{activeCount}</div>
        </article>
        <article style={{ border: "1px solid #fecaca", borderRadius: 14, padding: 12, background: "#fff6f6" }}>
          <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Bloqueados</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#b91c1c" }}>{blockedCount}</div>
        </article>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {devices.map((device) => {
          const blocked = String(device.currentStatus).toUpperCase() === "BLOQUEADO";
          const pending = String(pendingDeviceId) === String(device.id);
          const modePending = String(pendingModeDeviceId) === String(device.id);
          const manual = Boolean(device.manualStatusOverride);
          return (
            <article key={device.id} style={{ ...listItemStyle, borderRadius: 16, padding: 14, background: blocked ? "linear-gradient(180deg, rgba(254,242,242,.9), #fff)" : "#fff", border: blocked ? "1px solid rgba(185,28,28,.34)" : listItemStyle.border }}>
              <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 30, lineHeight: 1.05, color: "#0f172a" }}>{device.brand} {device.model}</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
                <p style={{ margin: "6px 0" }}>Cliente: <strong>{device.customer?.fullName || "Sin cliente"}</strong></p>
                <p style={{ margin: "6px 0" }}>IMEI: <strong>{device.imei || "—"}</strong></p>
                <p style={{ margin: "6px 0" }}>Número de serie: {device.serialNumber || "No registrado"}</p>
                <p style={{ margin: "6px 0" }}>Código: <strong>{device.installCode}</strong></p>
                <p style={{ margin: "6px 0" }}>
                  Hexnode ID: {device.hexnodeDeviceId || "No vinculado"}{" "}
                  {device.hexnodeDeviceId ? (
                    <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#065f46", background: "#d1fae5", border: "1px solid #34d399" }}>
                      Vinculado
                    </span>
                  ) : null}
                </p>
                <p style={{ margin: "6px 0" }}>Estado: <strong style={{ color: blocked ? "#b91c1c" : "#15803d" }}>{blocked ? "BLOQUEADO" : "ACTIVO"}</strong></p>
                <div style={{ margin: "2px 0", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>Modo:</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={manual}
                    disabled={modePending || pending}
                    onClick={() => onModeChange(device, manual ? "AUTOMATICO" : "MANUAL")}
                    style={{ position: "relative", width: 132, height: 36, borderRadius: 999, border: manual ? "1px solid #2563eb" : "1px solid #94a3b8", background: manual ? "#dbeafe" : "#f1f5f9", color: manual ? "#1e40af" : "#334155", fontWeight: 800, cursor: modePending || pending ? "wait" : "pointer", paddingLeft: manual ? 12 : 38, paddingRight: manual ? 38 : 12, transition: "all .18s ease" }}
                  >
                    {modePending ? "CAMBIANDO" : manual ? "MANUAL" : "AUTOMÁTICO"}
                    <span aria-hidden="true" style={{ position: "absolute", top: 4, left: manual ? 98 : 4, width: 26, height: 26, borderRadius: "50%", background: manual ? "#2563eb" : "#64748b", transition: "left .18s ease" }} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" disabled={pending || modePending || !manual} title={!manual ? "Activa el modo MANUAL para usar este boton" : ""} style={{ ...buttonStyle, minWidth: 128, opacity: manual ? 1 : 0.5, cursor: manual ? "pointer" : "not-allowed" }} onClick={() => onAction(device, "block")}>
                  {pending ? "Procesando..." : "BLOQUEAR"}
                </button>
                <button type="button" disabled={pending || modePending || !manual} title={!manual ? "Activa el modo MANUAL para usar este boton" : ""} style={{ ...secondaryButtonStyle, minWidth: 128, opacity: manual ? 1 : 0.5, cursor: manual ? "pointer" : "not-allowed" }} onClick={() => onAction(device, "unblock")}>
                  {pending ? "Procesando..." : "DESBLOQUEAR"}
                </button>
              </div>
            </article>
          );
        })}
        {devices.length === 0 && <p style={{ color: "var(--text-soft)", padding: 12 }}>No hay iPhone registrados.</p>}
      </div>
    </section>
  );
}
