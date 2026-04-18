import { useState } from "react";

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
  onToggleHexnodeDeviceLink,
  totalItems,
  page,
  totalPages,
  sortValue,
  onSortChange,
  onPrevPage,
  onNextPage,
  customerFilter,
  onCustomerFilterChange,
  deviceSegment,
  onDeviceSegmentChange,
  segmentCounts,
  customerOptions,
  searchValue,
  onSearchChange,
  devicePaymentSignalMap,
  onLinkAllHexnodeDevices,
  isLinkingAllHexnodeDevices,
  onDeleteDevice,
  deletingDeviceId,
  onUpdateDeviceIdentity,
  updatingDeviceIdentityId,
  onClearManualStatus,
  clearingManualStatusDeviceId,
}) {
  const [editingDeviceId, setEditingDeviceId] = useState("");
  const [optionsDeviceId, setOptionsDeviceId] = useState("");
  const [editImei, setEditImei] = useState("");
  const [editImei2, setEditImei2] = useState("");

  function beginEditIdentity(device) {
    setEditingDeviceId(String(device.id));
    setOptionsDeviceId("");
    setEditImei(String(device.imei || ""));
    setEditImei2(String(device.imei2 || ""));
  }

  function cancelEditIdentity() {
    setEditingDeviceId("");
    setEditImei("");
    setEditImei2("");
  }

  async function saveEditIdentity(device) {
    if (!onUpdateDeviceIdentity) {
      return;
    }

    await onUpdateDeviceIdentity(String(device.id), {
      imei: editImei,
      imei2: editImei2,
    });
    cancelEditIdentity();
  }

  function toggleOptions(deviceId) {
    const normalizedId = String(deviceId);
    setOptionsDeviceId((current) => (current === normalizedId ? "" : normalizedId));
  }

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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onDeviceSegmentChange("all")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background: deviceSegment === "all" ? "rgba(59,130,246,0.14)" : secondaryButtonStyle.background,
              border: deviceSegment === "all" ? "1px solid #3b82f6" : secondaryButtonStyle.border,
            }}
          >
            Todos ({segmentCounts?.all || 0})
          </button>
          <button
            type="button"
            onClick={() => onDeviceSegmentChange("active_pending")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background:
                deviceSegment === "active_pending" ? "rgba(16,185,129,0.14)" : secondaryButtonStyle.background,
              border: deviceSegment === "active_pending" ? "1px solid #10b981" : secondaryButtonStyle.border,
            }}
          >
            Activos + Pendientes ({segmentCounts?.active_pending || 0})
          </button>
          <button
            type="button"
            onClick={() => onDeviceSegmentChange("calls_only")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background: deviceSegment === "calls_only" ? "rgba(245,158,11,0.15)" : secondaryButtonStyle.background,
              border: deviceSegment === "calls_only" ? "1px solid #f59e0b" : secondaryButtonStyle.border,
            }}
          >
            Solo llamadas ({segmentCounts?.calls_only || 0})
          </button>
          <button
            type="button"
            onClick={() => onDeviceSegmentChange("blocked")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background: deviceSegment === "blocked" ? "rgba(239,68,68,0.14)" : secondaryButtonStyle.background,
              border: deviceSegment === "blocked" ? "1px solid #ef4444" : secondaryButtonStyle.border,
            }}
          >
            Bloqueados ({segmentCounts?.blocked || 0})
          </button>
        </div>
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
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
                <div style={{ position: "relative", marginLeft: "auto" }}>
                  <button
                    type="button"
                    onClick={() => toggleOptions(device.id)}
                    style={{ ...secondaryButtonStyle, minHeight: 36, padding: "6px 10px", borderRadius: 8 }}
                  >
                    Opciones
                  </button>
                  {optionsDeviceId === String(device.id) && (
                    <div
                      style={{
                        position: "absolute",
                        top: 40,
                        right: 0,
                        zIndex: 20,
                        minWidth: 170,
                        borderRadius: 10,
                        border: "1px solid var(--line-soft)",
                        background: "#ffffff",
                        boxShadow: "0 16px 24px rgba(15, 23, 42, 0.18)",
                        display: "grid",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => beginEditIdentity(device)}
                        style={{
                          border: "none",
                          borderBottom: "1px solid var(--line-soft)",
                          background: "#ffffff",
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "#0f172a",
                        }}
                      >
                        Editar IMEI
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOptionsDeviceId("");
                          onDeleteDevice(device);
                        }}
                        disabled={deletingDeviceId === device.id}
                        style={{
                          border: "none",
                          background: "#fff7ed",
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: deletingDeviceId === device.id ? "not-allowed" : "pointer",
                          color: "#9a3412",
                        }}
                      >
                        {deletingDeviceId === device.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            <p style={{ margin: "6px 0" }}>Cliente: {device.customer?.fullName}</p>
            <p style={{ margin: "6px 0" }}>IMEI 1: {device.imei}</p>
            <p style={{ margin: "6px 0" }}>IMEI 2: {device.imei2 || "No aplica / vacio"}</p>
            {editingDeviceId === String(device.id) ? (
              <div style={{ display: "grid", gap: 8, margin: "8px 0" }}>
                <input
                  value={editImei}
                  onChange={(event) => setEditImei(event.target.value)}
                  placeholder="IMEI 1"
                  style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 10px" }}
                />
                <input
                  value={editImei2}
                  onChange={(event) => setEditImei2(event.target.value)}
                  placeholder="IMEI 2 (opcional)"
                  style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 10px" }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => saveEditIdentity(device)}
                    disabled={updatingDeviceIdentityId === String(device.id)}
                    style={{ ...buttonStyle, minHeight: 40 }}
                  >
                    {updatingDeviceIdentityId === String(device.id) ? "Guardando IMEI..." : "Guardar IMEI"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditIdentity}
                    disabled={updatingDeviceIdentityId === String(device.id)}
                    style={{ ...secondaryButtonStyle, minHeight: 40 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
            <p style={{ margin: "6px 0" }}>Codigo: {device.installCode}</p>
            <p style={{ margin: "6px 0" }}>
              Hexnode ID: {device.hexnodeDeviceId || "No vinculado"}{" "}
              {device.hexnodeDeviceId ? (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#065f46",
                    background: "#d1fae5",
                    border: "1px solid #34d399",
                  }}
                >
                  Vinculado
                </span>
              ) : null}
            </p>
            <p style={{ margin: "6px 0" }}>Secreto del cliente: {device.clientSecret}</p>
            <p style={{ margin: "6px 0" }}>Estado: {device.currentStatus}</p>
            <p style={{ margin: "6px 0" }}>
              Modo: {device.manualStatusOverride ? "MANUAL" : "AUTOMATICO"}
            </p>
            {device.manualStatusOverride && (
              <button
                type="button"
                onClick={() => onClearManualStatus(String(device.id))}
                disabled={clearingManualStatusDeviceId === String(device.id)}
                style={{ ...secondaryButtonStyle, minHeight: 40, marginBottom: 6 }}
              >
                {clearingManualStatusDeviceId === String(device.id)
                  ? "Activando automatico..."
                  : "Volver a automatico"}
              </button>
            )}
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
              onClick={() => onToggleHexnodeDeviceLink(device)}
              style={{
                ...secondaryButtonStyle,
                minHeight: 42,
                borderRadius: 10,
                marginTop: 8,
              }}
              disabled={linkingHexnodeDeviceId === device.id}
            >
              {linkingHexnodeDeviceId === device.id
                ? (device.hexnodeDeviceId ? "Desvinculando..." : "Vinculando...")
                : (device.hexnodeDeviceId ? "Desvincular de Hexnode" : "Vincular con Hexnode")}
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

