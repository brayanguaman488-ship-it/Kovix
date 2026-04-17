import { buttonStyle, cardStyle, inputStyle, sectionTitleStyle } from "./styles";

export default function DeviceForm({ form, customers, onChange, onSubmit, isSubmitting }) {
  const sortedCustomers = [...customers].sort((a, b) =>
    String(a.fullName || "").localeCompare(String(b.fullName || ""))
  );

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Registrar dispositivo</h2>
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
        <input
          placeholder="Marca"
          value={form.brand}
          onChange={(event) => onChange({ ...form, brand: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Modelo"
          value={form.model}
          onChange={(event) => onChange({ ...form, model: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Alias"
          value={form.alias}
          onChange={(event) => onChange({ ...form, alias: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="IMEI"
          value={form.imei}
          onChange={(event) => onChange({ ...form, imei: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Hexnode Device ID (opcional)"
          value={form.hexnodeDeviceId}
          onChange={(event) => onChange({ ...form, hexnodeDeviceId: event.target.value })}
          style={inputStyle}
        />
        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          style={{ ...inputStyle, minHeight: 78 }}
        />
        <button type="submit" style={buttonStyle} disabled={isSubmitting}>
          {isSubmitting ? "Guardando dispositivo..." : "Guardar dispositivo"}
        </button>
      </form>
    </section>
  );
}
