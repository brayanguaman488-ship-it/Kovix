import { useEffect, useMemo, useState } from "react";

import {
  buttonStyle,
  cardStyle,
  inputStyle,
  listItemStyle,
  sectionTitleStyle,
} from "./styles";

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MONTH_OPTIONS = [
  { value: "all", label: "Todos los meses" },
  ...MONTH_LABELS.map((label, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label,
  })),
];

function resolvePaymentStatus(payment) {
  const status = String(payment?.status || "").toUpperCase();
  if (status !== "PENDIENTE") {
    return status;
  }

  const dueDate = new Date(payment?.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return status;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDate < todayStart ? "VENCIDO" : "PENDIENTE";
}

export default function PaymentsList({
  payments,
  searchValue,
  onSearchChange,
  onMarkPaid,
  onMarkOverdue,
  onMarkPending,
  markingPaymentId,
  onDeletePayment,
  deletingPaymentId,
}) {
  const now = new Date();
  const [activeTab, setActiveTab] = useState("monthly");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedPaidMonth, setSelectedPaidMonth] = useState("all");
  const [selectedPaidYear, setSelectedPaidYear] = useState("all");
  const [reopenedPaymentIds, setReopenedPaymentIds] = useState([]);
  const [optionsPaymentId, setOptionsPaymentId] = useState("");
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const reopenedStorageKey = "kovix_reopened_payments_v1";

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(reopenedStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setReopenedPaymentIds(parsed.filter((id) => typeof id === "string"));
      }
    } catch (error) {
      console.warn("No se pudo leer historial local de cuotas reabiertas", error);
    }
  }, []);

  function rememberReopenedPayment(paymentId) {
    const normalizedId = String(paymentId || "");
    if (!normalizedId) return;

    setReopenedPaymentIds((prev) => {
      const next = prev.includes(normalizedId) ? prev : [...prev, normalizedId];
      try {
        window.localStorage.setItem(reopenedStorageKey, JSON.stringify(next));
      } catch (error) {
        console.warn("No se pudo guardar historial local de cuotas reabiertas", error);
      }
      return next;
    });
  }

  const yearOptions = useMemo(() => {
    const set = new Set(
      payments
        .map((payment) => {
          const date = new Date(payment.dueDate);
          return Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
        })
        .filter(Boolean)
    );
    set.add(String(currentYear));
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [payments, currentYear]);

  const clientOptions = useMemo(() => {
    const set = new Set(
      payments
        .map((payment) => String(payment.customer?.fullName || "").trim())
        .filter(Boolean)
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const clientFilteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const clientName = String(payment.customer?.fullName || "").trim();
        return selectedClient === "all" || clientName === selectedClient;
      }),
    [payments, selectedClient]
  );

  const monthlyPayments = useMemo(
    () =>
      clientFilteredPayments.filter((payment) => {
        const dueDate = new Date(payment.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
          return false;
        }

        const monthMatch = dueDate.getMonth() === currentMonth;
        const yearMatch = dueDate.getFullYear() === currentYear;
        const statusMatch = payment.status === "PENDIENTE";

        return monthMatch && yearMatch && statusMatch;
      }),
    [clientFilteredPayments, currentMonth, currentYear]
  );

  const pendingPayments = clientFilteredPayments.filter((payment) => resolvePaymentStatus(payment) === "PENDIENTE");
  const overduePayments = clientFilteredPayments.filter((payment) => resolvePaymentStatus(payment) === "VENCIDO");
  const paidPayments = clientFilteredPayments.filter((payment) => resolvePaymentStatus(payment) === "PAGADO");
  const paidPaymentsFiltered = paidPayments.filter((payment) => {
    const dueDate = new Date(payment.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    const monthMatch =
      selectedPaidMonth === "all" || String(dueDate.getMonth() + 1).padStart(2, "0") === selectedPaidMonth;
    const yearMatch = selectedPaidYear === "all" || String(dueDate.getFullYear()) === selectedPaidYear;
    return monthMatch && yearMatch;
  });

  const activeList =
    activeTab === "pending"
      ? pendingPayments
      : activeTab === "overdue"
        ? overduePayments
        : activeTab === "paid"
          ? paidPaymentsFiltered
        : monthlyPayments;

  const activeLabel =
    activeTab === "pending"
      ? "Pendientes"
      : activeTab === "overdue"
        ? "Vencidos"
        : activeTab === "paid"
          ? "Pagados"
        : "Activos del mes";

  async function handleMarkPendingFromOverdue(paymentId) {
    await onMarkPending(paymentId);
    setActiveTab("pending");
  }

  async function handleMarkOverdueFromPending(paymentId) {
    await onMarkOverdue(paymentId);
    setActiveTab("overdue");
  }

  async function handleMarkOverdueFromPaid(paymentId) {
    await onMarkOverdue(paymentId);
    rememberReopenedPayment(paymentId);
    setActiveTab("overdue");
  }

  async function handleMarkPendingFromPaid(paymentId) {
    await onMarkPending(paymentId);
    rememberReopenedPayment(paymentId);
    setActiveTab("pending");
  }

  function toggleOptions(paymentId) {
    const normalized = String(paymentId || "");
    setOptionsPaymentId((value) => (value === normalized ? "" : normalized));
  }

  function renderActions(payment) {
    if (activeTab === "pending") {
      return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button
            type="button"
            onClick={() => onMarkPaid(payment.id)}
            style={buttonStyle}
            disabled={markingPaymentId === payment.id}
          >
            {markingPaymentId === payment.id ? "Guardando..." : "Marcar pagado"}
          </button>
          <button
            type="button"
            onClick={() => handleMarkOverdueFromPending(payment.id)}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
              border: "1px solid #b45309",
            }}
            disabled={markingPaymentId === payment.id}
          >
            {markingPaymentId === payment.id ? "Guardando..." : "Marcar vencido"}
          </button>
        </div>
      );
    }

    if (activeTab === "overdue") {
      return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button
            type="button"
            onClick={() => onMarkPaid(payment.id)}
            style={buttonStyle}
            disabled={markingPaymentId === payment.id}
          >
            {markingPaymentId === payment.id ? "Guardando..." : "Marcar pagado"}
          </button>
          <button
            type="button"
            onClick={() => handleMarkPendingFromOverdue(payment.id)}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
              border: "1px solid #334155",
            }}
            disabled={markingPaymentId === payment.id}
          >
            {markingPaymentId === payment.id ? "Guardando..." : "Pasar a pendiente"}
          </button>
        </div>
      );
    }

    if (activeTab === "paid") {
      return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button
            type="button"
            onClick={() => handleMarkOverdueFromPaid(payment.id)}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
              border: "1px solid #b45309",
            }}
            disabled={markingPaymentId === payment.id}
          >
            {markingPaymentId === payment.id ? "Guardando..." : "Regresar a vencido"}
          </button>
          <button
            type="button"
            onClick={() => handleMarkPendingFromPaid(payment.id)}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
              border: "1px solid #334155",
            }}
            disabled={markingPaymentId === payment.id}
          >
            {markingPaymentId === payment.id ? "Guardando..." : "Regresar a pendiente"}
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onMarkPaid(payment.id)}
          style={buttonStyle}
          disabled={markingPaymentId === payment.id || payment.status === "PAGADO"}
        >
          {markingPaymentId === payment.id ? "Guardando..." : "Marcar pagado"}
        </button>
        <button
          type="button"
          onClick={() => onMarkOverdue(payment.id)}
          style={{
            ...buttonStyle,
            background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
            border: "1px solid #b45309",
          }}
          disabled={markingPaymentId === payment.id || payment.status === "VENCIDO"}
        >
          {markingPaymentId === payment.id ? "Guardando..." : "Marcar vencido"}
        </button>
        <button
          type="button"
          onClick={() => onMarkPending(payment.id)}
          style={{
            ...buttonStyle,
            background: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
            border: "1px solid #334155",
          }}
          disabled={markingPaymentId === payment.id || payment.status === "PENDIENTE"}
        >
          {markingPaymentId === payment.id ? "Guardando..." : "Marcar pendiente"}
        </button>
      </div>
    );
  }

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Pagos</h2>
      <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <input
          value={searchValue || ""}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder="Buscar pagos por nombre o cedula"
          style={{ ...inputStyle, maxWidth: 360 }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { key: "monthly", label: "Activos del mes", count: monthlyPayments.length },
            { key: "pending", label: "Pendientes", count: pendingPayments.length },
            { key: "overdue", label: "Vencidos", count: overduePayments.length },
            { key: "paid", label: "Pagados", count: paidPaymentsFiltered.length },
          ].map((entry) => {
            const isActive = activeTab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setActiveTab(entry.key)}
                style={{
                  minHeight: 42,
                  padding: "8px 14px",
                  borderRadius: 11,
                  border: isActive ? "1px solid #1d4ed8" : "1px solid var(--line)",
                  background: isActive
                    ? "linear-gradient(135deg, #1e40af 0%, #0284c7 100%)"
                    : "linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.9))",
                  color: isActive ? "#f8fafc" : "var(--text-main)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {entry.label} ({entry.count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-soft)", fontWeight: 600 }}>Filtros:</span>
          {activeTab === "monthly" && (
            <span
              style={{
                border: "1px solid var(--line-soft)",
                borderRadius: 9,
                padding: "8px 10px",
                background: "rgba(248,250,252,0.94)",
                color: "var(--text-main)",
                fontWeight: 600,
              }}
            >
              {MONTH_LABELS[currentMonth]} {currentYear}
            </span>
          )}
          {activeTab === "paid" && (
            <>
              <select
                value={selectedPaidMonth}
                onChange={(event) => setSelectedPaidMonth(event.target.value)}
                style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px" }}
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedPaidYear}
                onChange={(event) => setSelectedPaidYear(event.target.value)}
                style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px" }}
              >
                <option value="all">Todos los anos</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </>
          )}
          <select
            value={selectedClient}
            onChange={(event) => setSelectedClient(event.target.value)}
            style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px", minWidth: 220 }}
          >
            <option value="all">Todos los clientes</option>
            {clientOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ margin: "0 0 10px", color: "var(--text-soft)" }}>
        Mostrando <strong>{activeLabel}</strong>: {activeList.length}
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {activeList.map((payment) => {
          const paymentId = String(payment.id || "");
          const effectiveStatus = resolvePaymentStatus(payment);
          const isReopenedFromPaid =
            reopenedPaymentIds.includes(paymentId) &&
            (effectiveStatus === "PENDIENTE" || effectiveStatus === "VENCIDO");

          return (
          <article
            key={payment.id}
            style={{
              ...listItemStyle,
              ...(isReopenedFromPaid
                ? {
                    border: "1px solid rgba(14, 116, 144, 0.36)",
                    background:
                      "linear-gradient(180deg, rgba(236, 254, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)",
                    boxShadow: "inset 0 0 0 1px rgba(34, 211, 238, 0.22)",
                  }
                : {}),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <strong>
                {payment.customer?.fullName} - ${Number(payment.amount).toFixed(2)}
              </strong>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => toggleOptions(payment.id)}
                  style={{
                    minHeight: 34,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--line-soft)",
                    background: "rgba(255,255,255,0.95)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Opciones
                </button>
                {optionsPaymentId === String(payment.id) && (
                  <div
                    style={{
                      position: "absolute",
                      top: 38,
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
                        setOptionsPaymentId("");
                        onDeletePayment(payment);
                      }}
                      disabled={deletingPaymentId === payment.id}
                      style={{
                        border: "none",
                        background: "#fff7ed",
                        padding: "10px 12px",
                        textAlign: "left",
                        cursor: deletingPaymentId === payment.id ? "not-allowed" : "pointer",
                        color: "#9a3412",
                        fontWeight: 700,
                      }}
                    >
                      {deletingPaymentId === payment.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p style={{ margin: "6px 0" }}>Vence: {new Date(payment.dueDate).toLocaleDateString()}</p>
            <p style={{ margin: "6px 0" }}>Estado: {effectiveStatus}</p>
            {isReopenedFromPaid && (
              <p
                style={{
                  margin: "6px 0",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0e7490",
                }}
              >
                Reabierta desde pagados
              </p>
            )}
            {payment.device && (
              <p style={{ margin: "6px 0", color: "var(--text-soft)" }}>
                Equipo: {payment.device.brand} {payment.device.model} ({payment.device.installCode})
              </p>
            )}
            {renderActions(payment)}
          </article>
        )})}
        {activeList.length === 0 && (
          <p style={{ margin: 0 }}>
            No hay pagos en esta vista para el periodo/cliente seleccionado.
          </p>
        )}
      </div>
    </section>
  );
}

