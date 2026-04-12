import {
  buttonStyle,
  cardStyle,
  listItemStyle,
  paginationRowStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
} from "./styles";

export default function DevicesList({
  devices,
  statuses,
  onStatusChange,
  updatingDeviceId,
  rotatingSecretDeviceId,
  onRotateSecret,
  totalItems,
  page,
  totalPages,
  sortValue,
  onSortChange,
  onPrevPage,
  onNextPage,
}) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Dispositivos</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-soft)" }}>Total: {totalItems}</span>
        <select
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 8px" }}
        >
          <option value="updated_desc">Actualizados reciente</option>
          <option value="updated_asc">Actualizados antiguo</option>
          <option value="status_asc">Estado A-Z</option>
          <option value="status_desc">Estado Z-A</option>
          <option value="brand_asc">Marca A-Z</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {devices.map((device) => (
          <article key={device.id} style={listItemStyle}>
            <strong>
              {device.brand} {device.model}
            </strong>
            <p style={{ margin: "6px 0" }}>Cliente: {device.customer?.fullName}</p>
            <p style={{ margin: "6px 0" }}>IMEI: {device.imei}</p>
            <p style={{ margin: "6px 0" }}>Codigo: {device.installCode}</p>
            <p style={{ margin: "6px 0" }}>ClientSecret: {device.clientSecret}</p>
            <p style={{ margin: "6px 0" }}>Estado: {device.currentStatus}</p>
            <button
              type="button"
              onClick={() => onRotateSecret(device.id)}
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
                border: "1px solid #92400e",
                boxShadow: "0 10px 22px rgba(180, 83, 9, 0.26)",
                minHeight: 42,
              }}
              disabled={rotatingSecretDeviceId === device.id}
            >
              {rotatingSecretDeviceId === device.id ? "Rotando..." : "Rotar secret"}
            </button>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(device.id, status)}
                  style={{ ...buttonStyle, minHeight: 42 }}
                  type="button"
                  disabled={updatingDeviceId === device.id}
                >
                  {updatingDeviceId === device.id ? "Actualizando..." : status}
                </button>
              ))}
            </div>
          </article>
        ))}
        {devices.length === 0 && <p style={{ margin: 0 }}>No hay dispositivos registrados.</p>}
      </div>
      <div style={paginationRowStyle}>
        <button type="button" onClick={onPrevPage} disabled={page <= 1} style={secondaryButtonStyle}>
          Anterior
        </button>
        <span style={{ color: "var(--text-soft)" }}>
          Pagina {page} de {totalPages}
        </span>
        <button type="button" onClick={onNextPage} disabled={page >= totalPages} style={secondaryButtonStyle}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
