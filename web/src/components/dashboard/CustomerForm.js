import { buttonStyle, cardStyle, inputStyle, sectionTitleStyle } from "./styles";

export default function CustomerForm({ form, customers, onChange, onSubmit, isSubmitting }) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Registrar cliente</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="Nombre completo"
          value={form.fullName}
          onChange={(event) => onChange({ ...form, fullName: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Cedula o documento"
          value={form.nationalId}
          onChange={(event) => onChange({ ...form, nationalId: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Telefono"
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Direccion"
          value={form.address}
          onChange={(event) => onChange({ ...form, address: event.target.value })}
          style={inputStyle}
        />
        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          style={{ ...inputStyle, minHeight: 78 }}
        />
        <button type="submit" style={buttonStyle} disabled={isSubmitting}>
          {isSubmitting ? "Guardando cliente..." : "Guardar cliente"}
        </button>
      </form>
      <p style={{ marginTop: 10, marginBottom: 0, color: "var(--text-soft)" }}>
        Clientes registrados: {customers}
      </p>
    </section>
  );
}
