import { buttonStyle, cardStyle, inputStyle, sectionTitleStyle } from "./styles";

export default function CustomerForm({ form, customers, onChange, onSubmit, isSubmitting }) {
  const countryCodeOptions = [
    { code: "+593", label: "🇪🇨 Ecuador (+593)" },
    { code: "+1", label: "🇺🇸 Estados Unidos (+1)" },
    { code: "+52", label: "🇲🇽 México (+52)" },
    { code: "+51", label: "🇵🇪 Perú (+51)" },
    { code: "+57", label: "🇨🇴 Colombia (+57)" },
    { code: "+56", label: "🇨🇱 Chile (+56)" },
    { code: "+34", label: "🇪🇸 España (+34)" },
  ];

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
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 13 }}>Referencia personal 1</strong>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <select
              value={form.referencePersonalPhone1CountryCode || "+593"}
              onChange={(event) => onChange({ ...form, referencePersonalPhone1CountryCode: event.target.value })}
              style={inputStyle}
            >
              {countryCodeOptions.map((entry) => (
                <option key={`country-code-rp1-${entry.code}`} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Numero referencia personal 1"
              value={form.referencePersonalPhone1Number || ""}
              onChange={(event) => onChange({ ...form, referencePersonalPhone1Number: event.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 13 }}>Referencia personal 2</strong>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <select
              value={form.referencePersonalPhone2CountryCode || "+593"}
              onChange={(event) => onChange({ ...form, referencePersonalPhone2CountryCode: event.target.value })}
              style={inputStyle}
            >
              {countryCodeOptions.map((entry) => (
                <option key={`country-code-rp2-${entry.code}`} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Numero referencia personal 2"
              value={form.referencePersonalPhone2Number || ""}
              onChange={(event) => onChange({ ...form, referencePersonalPhone2Number: event.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 13 }}>Referencia de trabajo</strong>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <select
              value={form.referenceWorkPhoneCountryCode || "+593"}
              onChange={(event) => onChange({ ...form, referenceWorkPhoneCountryCode: event.target.value })}
              style={inputStyle}
            >
              {countryCodeOptions.map((entry) => (
                <option key={`country-code-rw-${entry.code}`} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Numero referencia trabajo"
              value={form.referenceWorkPhoneNumber || ""}
              onChange={(event) => onChange({ ...form, referenceWorkPhoneNumber: event.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
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
