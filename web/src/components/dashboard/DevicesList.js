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
  linkingHexnodeDeviceId,
  onLinkHexnodeDevice,
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
  onLinkAllHexnodeDevices,
  isLinkingAllHexnodeDevices,
}) {
  function getPaymentSignalBadge(status) {
    if (status === "VENCIDO") {
      return {
        text: "Cuota: VENCIDO",
        color: "#9a3412",
        background: "#ffedd5",
        border: "#fb923c",
      };
    }
    if (status === "PENDIENTE") {
      return {
        text: "Cuota: PENDIENTE",
        color: "#1e3a8a",
        background: "#dbeafe",
        border: "#60a5fa",
      };
    }
    return null;
  }

  function getAlertGlowStyle(paymentStatus, deviceStatus) {
    const cuota = String(paymentStatus || "").toUpperCase();
    const estado = String(deviceStatus || "").toUpperCase();

    const shouldGlow =
      (cuota === "PENDIENTE" && estado === "BLOQUEADO") ||
      (cuota === "VENCIDO" && (estado === "ACTIVO" || estado === "PAGO_PENDIENTE"));

    if (!shouldGlow) {
      return null;
    }

    return {
      boxShadow:
        "0 0 0 1px rgba(34, 211, 238, 0.22), 0 0 0 5px rgba(34, 211, 238, 0.1), 0 18px 30px rgba(6, 78, 110, 0.16)",
    };
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
        <button
          type="button"
          onClick={onLinkAllHexnodeDevices}
          disabled={isLinkingAllHexnodeDevices}
          style={{ ...secondaryButtonStyle, minHeight: 38, borderRadius: 8 }}
        >
          {isLinkingAllHexnodeDevices ? "Vinculando..." : "Vincular todos con Hexnode"}
        </button>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {devices.map((device) => {
          const paymentStatus = devicePaymentSignalMap?.get(device.id);
          const paymentSignal = getPaymentSignalBadge(paymentStatus);
          const alertGlowStyle = getAlertGlowStyle(paymentStatus, device.currentStatus);

          return (
            <article
              key={String(device.id)}
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
                ...(alertGlowStyle || {}),
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "flex-start",
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
            <p style={{ margin: "6px 0" }}>Cliente: {device.customer?.fullName}</p>
            <p style={{ margin: "6px 0" }}>IMEI: {device.imei}</p>
            <p style={{ margin: "6px 0" }}>Codigo: {device.installCode}</p>
            <p style={{ margin: "6px 0" }}>Hexnode ID: {device.hexnodeDeviceId || "No vinculado"}</p>
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
            <button
              type="button"
              onClick={() => onLinkHexnodeDevice(device.id)}
              style={{
                ...secondaryButtonStyle,
                minHeight: 42,
                borderRadius: 10,
                marginTop: 8,
              }}
              disabled={linkingHexnodeDeviceId === device.id}
            >
              {linkingHexnodeDeviceId === device.id ? "Vinculando..." : "Vincular con Hexnode"}
            </button>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(String(device.id), status)}
                  style={{ ...buttonStyle, minHeight: 42 }}
                  type="button"
                  disabled={String(updatingDeviceId) === String(device.id)}
                >
                  {String(updatingDeviceId) === String(device.id) ? "Actualizando..." : status}
                </button>
              ))}
            </div>
            </article>
          );
        })}
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
