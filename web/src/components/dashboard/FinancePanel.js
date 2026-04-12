import { useMemo, useState } from "react";

import { cardStyle, sectionTitleStyle } from "./styles";

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

function formatCurrency(value) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function FinancePanel({ payments }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const yearOptions = useMemo(() => {
    const set = new Set(
      payments
        .map((payment) => {
          const dueDate = new Date(payment?.dueDate);
          return Number.isNaN(dueDate.getTime()) ? null : String(dueDate.getFullYear());
        })
        .filter(Boolean)
    );

    set.add(String(now.getFullYear()));
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [payments, now]);

  const scopedPayments = useMemo(() => {
    return payments.filter((payment) => {
      const dueDate = new Date(payment?.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return false;
      }

      const yearMatch = String(dueDate.getFullYear()) === selectedYear;
      const monthMatch = String(dueDate.getMonth() + 1).padStart(2, "0") === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [payments, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    const summary = {
      pendingAmount: 0,
      overdueAmount: 0,
      paidAmount: 0,
      totalAmount: 0,
      pendingCount: 0,
      overdueCount: 0,
      paidCount: 0,
      totalCount: 0,
    };

    for (const payment of scopedPayments) {
      const amount = Number(payment?.amount || 0);
      const status = resolvePaymentStatus(payment);
      summary.totalAmount += amount;
      summary.totalCount += 1;

      if (status === "VENCIDO") {
        summary.overdueAmount += amount;
        summary.overdueCount += 1;
        continue;
      }

      if (status === "PAGADO") {
        summary.paidAmount += amount;
        summary.paidCount += 1;
        continue;
      }

      if (status === "PENDIENTE") {
        summary.pendingAmount += amount;
        summary.pendingCount += 1;
      }
    }

    return summary;
  }, [scopedPayments]);

  const monthLabel = MONTH_LABELS[Number(selectedMonth) - 1] || "Mes";

  function handleShiftMonth(step) {
    const next = new Date(Number(selectedYear), Number(selectedMonth) - 1 + step, 1);
    setSelectedYear(String(next.getFullYear()));
    setSelectedMonth(String(next.getMonth() + 1).padStart(2, "0"));
  }

  const cards = [
    {
      key: "pending",
      label: "Pendiente por cobrar",
      amount: totals.pendingAmount,
      count: totals.pendingCount,
      style: {
        border: "1px solid rgba(30, 64, 175, 0.25)",
        background: "linear-gradient(180deg, rgba(219, 234, 254, 0.84), rgba(239, 246, 255, 0.92))",
        color: "#1e3a8a",
      },
    },
    {
      key: "overdue",
      label: "Vencido por cobrar",
      amount: totals.overdueAmount,
      count: totals.overdueCount,
      style: {
        border: "1px solid rgba(180, 83, 9, 0.24)",
        background: "linear-gradient(180deg, rgba(255, 237, 213, 0.86), rgba(255, 247, 237, 0.93))",
        color: "#9a3412",
      },
    },
    {
      key: "paid",
      label: "Pagado",
      amount: totals.paidAmount,
      count: totals.paidCount,
      style: {
        border: "1px solid rgba(5, 150, 105, 0.24)",
        background: "linear-gradient(180deg, rgba(209, 250, 229, 0.84), rgba(236, 253, 245, 0.93))",
        color: "#065f46",
      },
    },
    {
      key: "total",
      label: "Total del mes",
      amount: totals.totalAmount,
      count: totals.totalCount,
      style: {
        border: "1px solid rgba(51, 65, 85, 0.24)",
        background: "linear-gradient(180deg, rgba(226, 232, 240, 0.88), rgba(241, 245, 249, 0.93))",
        color: "#0f172a",
      },
    },
  ];

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={sectionTitleStyle}>Finanzas</h2>
          <p style={{ margin: "-6px 0 0", color: "var(--text-soft)" }}>
            Cuando una cuota supera su fecha, pasa de pendiente a vencido automaticamente.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleShiftMonth(-1)}
            style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}
          >
            Mes anterior
          </button>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px" }}
          >
            {MONTH_LABELS.map((label, index) => {
              const value = String(index + 1).padStart(2, "0");
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px" }}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleShiftMonth(1)}
            style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}
          >
            Mes siguiente
          </button>
        </div>
      </div>

      <p style={{ margin: "0 0 12px", color: "var(--text-soft)" }}>
        Periodo seleccionado: <strong>{monthLabel} {selectedYear}</strong>
      </p>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {cards.map((card) => (
          <article
            key={card.key}
            style={{
              borderRadius: 14,
              padding: "12px 14px",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.36)",
              ...card.style,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase", opacity: 0.85 }}>
              {card.label}
            </div>
            <div style={{ marginTop: 5, fontSize: 24, fontWeight: 800 }}>{formatCurrency(card.amount)}</div>
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.88 }}>Cuotas: {card.count}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
