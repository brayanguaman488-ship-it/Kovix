import { buttonStyle, cardStyle, inputStyle, sectionTitleStyle } from "./styles";

export default function CustomerForm({ form, customers, onChange, onSubmit, isSubmitting }) {
  const countryCodeOptions = [
    { code: "+593", iso2: "ec", label: "Ecuador (+593)" },
    { code: "+1", iso2: "us", label: "Estados Unidos (+1)" },
    { code: "+52", iso2: "mx", label: "México (+52)" },
    { code: "+51", iso2: "pe", label: "Perú (+51)" },
    { code: "+57", iso2: "co", label: "Colombia (+57)" },
    { code: "+56", iso2: "cl", label: "Chile (+56)" },
    { code: "+34", iso2: "es", label: "España (+34)" },
  ];

  function getOptionByCode(code) {
    return countryCodeOptions.find((entry) => entry.code === code) || countryCodeOptions[0];
  }

  function renderCountrySelector(value, onChangeHandler, id) {
    const selected = getOptionByCode(value || "+593");
    return (
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "center", gap: 8 }}>
        <img
          src={`https://flagcdn.com/w40/${selected.iso2}.png`}
          alt={selected.label}
          width={24}
          height={18}
          style={{ borderRadius: 3, border: "1px solid rgba(148,163,184,0.45)", objectFit: "cover" }}
        />
        <select
          id={id}
          value={selected.code}
          onChange={onChangeHandler}
          style={inputStyle}
        >
          {countryCodeOptions.map((entry) => (
            <option key={`${id}-${entry.code}`} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

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
            {renderCountrySelector(
              form.referencePersonalPhone1CountryCode || "+593",
              (event) => onChange({ ...form, referencePersonalPhone1CountryCode: event.target.value }),
              "country-code-rp1"
            )}
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
            {renderCountrySelector(
              form.referencePersonalPhone2CountryCode || "+593",
              (event) => onChange({ ...form, referencePersonalPhone2CountryCode: event.target.value }),
              "country-code-rp2"
            )}
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
            {renderCountrySelector(
              form.referenceWorkPhoneCountryCode || "+593",
              (event) => onChange({ ...form, referenceWorkPhoneCountryCode: event.target.value }),
              "country-code-rw"
            )}
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
