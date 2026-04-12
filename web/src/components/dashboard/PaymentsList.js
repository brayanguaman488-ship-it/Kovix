import { useMemo, useState } from "react";

import {
  buttonStyle,
  cardStyle,
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

export default function PaymentsList({
  payments,
  onMarkPaid,
  onMarkOverdue,
  onMarkPending,
  markingPaymentId,
}) {
  const now = new Date();
  const [activeTab, setActiveTab] = useState("monthly");
  const [selectedClient, setSelectedClient] = useState("all");
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

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

  const pendingPayments = clientFilteredPayments.filter((payment) => payment.status === "PENDIENTE");
  const overduePayments = clientFilteredPayments.filter((payment) => payment.status === "VENCIDO");
  const paidPayments = clientFilteredPayments.filter((payment) => payment.status === "PAGADO");

  const activeList =
    activeTab === "pending"
      ? pendingPayments
      : activeTab === "overdue"
        ? overduePayments
        : activeTab === "paid"
          ? paidPayments
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
      return null;
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { key: "monthly", label: "Activos del mes", count: monthlyPayments.length },
            { key: "pending", label: "Pendientes", count: pendingPayments.length },
            { key: "overdue", label: "Vencidos", count: overduePayments.length },
            { key: "paid", label: "Pagados", count: paidPayments.length },
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
        {activeList.map((payment) => (
          <article key={payment.id} style={listItemStyle}>
            <strong>
              {payment.customer?.fullName} - ${Number(payment.amount).toFixed(2)}
            </strong>
            <p style={{ margin: "6px 0" }}>Vence: {new Date(payment.dueDate).toLocaleDateString()}</p>
            <p style={{ margin: "6px 0" }}>Estado: {payment.status}</p>
            {renderActions(payment)}
          </article>
        ))}
        {activeList.length === 0 && (
          <p style={{ margin: 0 }}>
            No hay pagos en esta vista para el periodo/cliente seleccionado.
          </p>
        )}
      </div>
    </section>
  );
}
