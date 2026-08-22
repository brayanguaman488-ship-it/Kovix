import { useState } from "react";
import { buttonStyle, cardStyle, inputStyle, secondaryButtonStyle, sectionTitleStyle } from "./styles";

const initialForm = { customerId: "", brand: "Apple", model: "", imei: "", serialNumber: "", hexnodeDeviceId: "" };

export default function IOSDevicesList({ devices, customers, onCreate, onAction, pendingDeviceId }) {
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate(form);
      setForm(initialForm);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ ...sectionTitleStyle, marginBottom: 4 }}>iPhone</h2>
          <p style={{ margin: 0, color: "var(--text-soft)", fontSize: 14 }}>Dispositivos iOS administrados por el portal exclusivo de Hexnode.</p>
        </div>
        <button type="button" style={buttonStyle} onClick={() => setShowForm((value) => !value)}>{showForm ? "Cancelar" : "+ Registrar iPhone"}</button>
      </div>

      {showForm && <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 14, border: "1px solid #dbeafe", borderRadius: 14, marginBottom: 16, background: "#f8fbff" }}>
        <select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} style={inputStyle}>
          <option value="">Cliente *</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}</option>)}
        </select>
        <input required placeholder="Modelo (ej. iPhone 15)" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} style={inputStyle} />
        <input placeholder="IMEI" value={form.imei} onChange={(event) => setForm({ ...form, imei: event.target.value })} style={inputStyle} />
        <input placeholder="Número de serie" value={form.serialNumber} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} style={inputStyle} />
        <input required inputMode="numeric" placeholder="Hexnode Device ID *" value={form.hexnodeDeviceId} onChange={(event) => setForm({ ...form, hexnodeDeviceId: event.target.value })} style={inputStyle} />
        <button type="submit" disabled={saving} style={buttonStyle}>{saving ? "Guardando..." : "Guardar iPhone"}</button>
      </form>}

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
