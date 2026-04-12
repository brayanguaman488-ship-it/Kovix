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
  customerFilter,
  onCustomerFilterChange,
  customerOptions,
  searchValue,
  onSearchChange,
  devicePaymentSignalMap,
}) {
  function getPaymentSignalBadge(status) {
    if (status === "VENCIDO") {
      return {
        text: "Accion requerida: VENCIDO",
        color: "#9a3412",
        background: "#ffedd5",
        border: "#fb923c",
      };
    }
    if (status === "PAGADO") {
      return {
        text: "Accion requerida: PAGADO",
        color: "#065f46",
        background: "#d1fae5",
        border: "#34d399",
      };
    }
    if (status === "PENDIENTE") {
      return {
        text: "Accion requerida: PENDIENTE",
        color: "#1e3a8a",
        background: "#dbeafe",
        border: "#60a5fa",
      };
    }
    return null;
  }

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Dispositivos</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-soft)" }}>Total: {totalItems}</span>
        <select
          value={customerFilter}
          onChange={(event) => onCustomerFilterChange(event.target.value)}
          style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 8px", minWidth: 190 }}
        >
          <option value="all">Todos los clientes</option>
          {customerOptions.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar equipo, IMEI o codigo"
          style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 8px", minWidth: 230 }}
        />
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
          <article
            key={device.id}
            style={{
              ...listItemStyle,
              ...(device.currentStatus === "BLOQUEADO"
                ? {
                    border: "1px solid rgba(185, 28, 28, 0.34)",
                    background:
                      "linear-gradient(180deg, rgba(254, 242, 242, 0.9) 0%, rgba(255, 255, 255, 0.98) 100%)",
                    boxShadow: "inset 0 0 0 1px rgba(248, 113, 113, 0.2)",
                  }
                : {}),
            }}
          >
            {(() => {
              const paymentSignal = getPaymentSignalBadge(devicePaymentSignalMap?.get(device.id));
              return (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ marginRight: 10 }}>
                    {device.brand} {device.model}
                  </strong>
                  {paymentSignal && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: paymentSignal.color,
                        background: paymentSignal.background,
                        border: `1px solid ${paymentSignal.border}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {paymentSignal.text}
                    </span>
                  )}
                </div>
              );
            })()}
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
