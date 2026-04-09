import { buttonStyle, cardStyle, sectionTitleStyle } from "./styles";

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
        <span>Total: {totalItems}</span>
        <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
          <option value="updated_desc">Actualizados reciente</option>
          <option value="updated_asc">Actualizados antiguo</option>
          <option value="status_asc">Estado A-Z</option>
          <option value="status_desc">Estado Z-A</option>
          <option value="brand_asc">Marca A-Z</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {devices.map((device) => (
          <article key={device.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
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
              style={buttonStyle}
              disabled={rotatingSecretDeviceId === device.id}
            >
              {rotatingSecretDeviceId === device.id ? "Rotando..." : "Rotar secret"}
            </button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(device.id, status)}
                  style={buttonStyle}
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
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <button type="button" onClick={onPrevPage} disabled={page <= 1}>
          Anterior
        </button>
        <span>
          Pagina {page} de {totalPages}
        </span>
        <button type="button" onClick={onNextPage} disabled={page >= totalPages}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
