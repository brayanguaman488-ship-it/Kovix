import { useState } from "react";

import {
  cardStyle,
  inputStyle,
  listItemStyle,
  paginationRowStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
} from "./styles";

export default function CustomersList({
  customers,
  totalItems,
  page,
  totalPages,
  sortValue,
  onSortChange,
  onPrevPage,
  onNextPage,
  onDeleteCustomer,
  deletingCustomerId,
  customerSegment,
  onCustomerSegmentChange,
  segmentCounts,
  searchValue,
  onSearchChange,
}) {
  const [expandedCustomerId, setExpandedCustomerId] = useState("");
  const [optionsCustomerId, setOptionsCustomerId] = useState("");

  function toggleOptions(customerId) {
    const normalized = String(customerId || "");
    setOptionsCustomerId((value) => (value === normalized ? "" : normalized));
  }

  function getCustomerCreditState(customer) {
    const contracts = (customer?.devices || [])
      .map((device) => device.creditContract)
      .filter(Boolean);

    if (contracts.length === 0) {
      return "SIN_CONTRATO";
    }

    const hasDebt = contracts.some((contract) =>
      (contract?.installments || []).some(
        (installment) => installment.status !== "PAGADO" && installment.status !== "CANCELADO"
      )
    );

    return hasDebt ? "ACTIVO" : "PAGADO";
  }

  function renderContractTable(device) {
    const contract = device?.creditContract;
    if (!contract) {
      return (
        <div
          style={{
            padding: 10,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#f8fafc",
            color: "#334155",
          }}
        >
          Este equipo no tiene contrato de credito.
        </div>
      );
    }

    const installments = contract.installments || [];
    const paidCount = installments.filter((entry) => entry.status === "PAGADO").length;
    const pendingCount = installments.filter((entry) => entry.status === "PENDIENTE").length;
    const overdueCount = installments.filter((entry) => entry.status === "VENCIDO").length;
    const reportedCount = installments.filter((entry) => entry.status === "REPORTADO").length;

    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gap: 4,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1e3a8a",
          }}
        >
          <div>Equipo: <strong>{device.brand} {device.model}</strong> ({device.installCode})</div>
          <div>Cuotas: {paidCount} pagadas, {pendingCount} pendientes, {overdueCount} vencidas, {reportedCount} reportadas</div>
          <div>Estado cliente/equipo: {device.currentStatus}</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Cuota</th>
                <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Vence</th>
                <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Monto</th>
                <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((installment) => (
                <tr key={installment.id}>
                  <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>#{installment.sequence}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                    {new Date(installment.dueDate).toLocaleDateString()}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                    ${Number(installment.amount || 0).toFixed(2)}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{installment.status}</td>
                </tr>
              ))}
              {installments.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                    Sin cuotas registradas en este contrato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Clientes</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-soft)" }}>Total: {totalItems}</span>
        <input
          value={searchValue || ""}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder="Buscar cliente por nombre o cedula"
          style={{ ...inputStyle, width: 320, minWidth: 220, flex: "0 1 320px" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onCustomerSegmentChange("all")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background: customerSegment === "all" ? "rgba(59,130,246,0.14)" : secondaryButtonStyle.background,
              border: customerSegment === "all" ? "1px solid #3b82f6" : secondaryButtonStyle.border,
            }}
          >
            Todos ({segmentCounts?.all || 0})
          </button>
          <button
            type="button"
            onClick={() => onCustomerSegmentChange("active")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background: customerSegment === "active" ? "rgba(16,185,129,0.14)" : secondaryButtonStyle.background,
              border: customerSegment === "active" ? "1px solid #10b981" : secondaryButtonStyle.border,
            }}
          >
            Activos ({segmentCounts?.active || 0})
          </button>
          <button
            type="button"
            onClick={() => onCustomerSegmentChange("paid")}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              background: customerSegment === "paid" ? "rgba(34,197,94,0.14)" : secondaryButtonStyle.background,
              border: customerSegment === "paid" ? "1px solid #22c55e" : secondaryButtonStyle.border,
            }}
          >
            Pagados ({segmentCounts?.paid || 0})
          </button>
        </div>
        <select
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 8px" }}
        >
          <option value="name_asc">Nombre A-Z</option>
          <option value="name_desc">Nombre Z-A</option>
          <option value="created_desc">Mas nuevos</option>
          <option value="created_asc">Mas antiguos</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {customers.map((customer) => (
          <article key={customer.id} style={listItemStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <strong>{customer.fullName}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCustomerId((value) => (value === customer.id ? "" : customer.id))
                  }
                  style={{ ...secondaryButtonStyle, minHeight: 36 }}
                >
                  {expandedCustomerId === customer.id ? "Ocultar tabla general" : "Revisar tabla general"}
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => toggleOptions(customer.id)}
                    style={{ ...secondaryButtonStyle, minHeight: 36, padding: "6px 10px", borderRadius: 8 }}
                  >
                    Opciones
                  </button>
                  {optionsCustomerId === String(customer.id) && (
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
                        onClick={() => {
                          setOptionsCustomerId("");
                          onDeleteCustomer(customer);
                        }}
                        disabled={deletingCustomerId === customer.id}
                        style={{
                          border: "none",
                          background: "#fff7ed",
                          padding: "10px 12px",
                          textAlign: "left",
                          cursor: deletingCustomerId === customer.id ? "not-allowed" : "pointer",
                          color: "#9a3412",
                        }}
                      >
                        {deletingCustomerId === customer.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p style={{ margin: "6px 0" }}>Documento: {customer.nationalId}</p>
            <p style={{ margin: "6px 0" }}>Telefono: {customer.phone}</p>
            <p style={{ margin: "6px 0" }}>Dispositivos: {customer.devices.length}</p>
            <p style={{ margin: "6px 0" }}>
              Estado cartera: <strong>{getCustomerCreditState(customer)}</strong>
            </p>

            {expandedCustomerId === customer.id && (
              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                {(customer.devices || []).map((device) => (
                  <article
                    key={device.id}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      background: "#ffffff",
                      padding: 10,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {renderContractTable(device)}
                  </article>
                ))}
                {(customer.devices || []).length === 0 && (
                  <p style={{ margin: 0, color: "#475569" }}>Este cliente aun no tiene dispositivos registrados.</p>
                )}
              </div>
            )}
          </article>
        ))}
        {customers.length === 0 && <p style={{ margin: 0 }}>No hay clientes en este apartado.</p>}
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
