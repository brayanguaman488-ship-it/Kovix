import { buttonStyle, cardStyle, inputStyle, sectionTitleStyle } from "./styles";

export default function PaymentForm({ form, customers, devices, onChange, onSubmit, isSubmitting }) {
  const sortedCustomers = [...customers].sort((a, b) =>
    String(a.fullName || "").localeCompare(String(b.fullName || ""))
  );
  const sortedDevices = [...devices].sort((a, b) =>
    String(a.installCode || "").localeCompare(String(b.installCode || ""))
  );

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Programar pago</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <select
          value={form.customerId}
          onChange={(event) => onChange({ ...form, customerId: event.target.value })}
          style={inputStyle}
        >
          <option value="">Selecciona cliente</option>
          {sortedCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.fullName}
            </option>
          ))}
        </select>
        <select
          value={form.deviceId}
          onChange={(event) => onChange({ ...form, deviceId: event.target.value })}
          style={inputStyle}
        >
          <option value="">Selecciona dispositivo</option>
          {sortedDevices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.brand} {device.model} - {device.installCode}
            </option>
          ))}
        </select>
        <input
          placeholder="Monto"
          type="number"
          step="0.01"
          value={form.amount}
          onChange={(event) => onChange({ ...form, amount: event.target.value })}
          style={inputStyle}
        />
        <input
          type="date"
          value={form.dueDate}
          onChange={(event) => onChange({ ...form, dueDate: event.target.value })}
          style={inputStyle}
        />
        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          style={{ ...inputStyle, minHeight: 78 }}
        />
        <button type="submit" style={buttonStyle} disabled={isSubmitting}>
          {isSubmitting ? "Guardando pago..." : "Guardar pago"}
        </button>
      </form>
    </section>
  );
}
