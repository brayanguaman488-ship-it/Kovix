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

export default function FinancePanel({ payments, devices = [] }) {
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

  const licenseSummary = useMemo(() => {
    const tiers = [
      { key: "gama_baja", label: "Gama baja", min: 0, max: 400, monthly: 10 },
      { key: "gama_media", label: "Gama media", min: 401, max: 850, monthly: 15 },
      { key: "gama_alta", label: "Gama alta", min: 851, max: 1500, monthly: 25 },
      { key: "gama_ultra", label: "Gama ultra", min: 1501, max: Number.POSITIVE_INFINITY, monthly: 30 },
    ];

    const byTier = Object.fromEntries(
      tiers.map((tier) => [tier.key, { ...tier, activeDevices: 0, monthlyTotal: 0 }])
    );

    const totals = {
      activeDevices: 0,
      monthlyTotal: 0,
    };

    for (const device of devices || []) {
      const contract = device?.creditContract;
      if (!contract) {
        continue;
      }

      const installments = Array.isArray(contract?.installments) ? contract.installments : [];
      const hasPendingDebt = installments.some((entry) => {
        const status = String(entry?.status || "").toUpperCase();
        return status !== "PAGADO" && status !== "CANCELADO";
      });

      if (!hasPendingDebt) continue;

      const totalCredit = Number(contract?.principalAmount || 0);
      const selectedTier = tiers.find((tier) => totalCredit >= tier.min && totalCredit <= tier.max) || tiers[0];

      byTier[selectedTier.key].activeDevices += 1;
      byTier[selectedTier.key].monthlyTotal += selectedTier.monthly;
      totals.activeDevices += 1;
      totals.monthlyTotal += selectedTier.monthly;
    }

    return {
      tiers: Object.values(byTier),
      totals,
    };
  }, [devices]);

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

      <article
        style={{
          marginTop: 14,
          border: "1px solid rgba(15, 23, 42, 0.14)",
          borderRadius: 14,
          padding: "12px 14px",
          background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.98))",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Licencias</h3>
        <p style={{ margin: "0 0 10px", color: "var(--text-soft)" }}>
          Se contabilizan solo celulares vigentes (con deuda pendiente).
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {licenseSummary.tiers.map((tier) => (
            <div
              key={tier.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 10,
                alignItems: "center",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: 10,
                padding: "8px 10px",
                background: "#ffffff",
              }}
            >
              <strong>{tier.label}</strong>
              <span>{tier.activeDevices} equipos</span>
              <span>{formatCurrency(tier.monthlyTotal)}/mes</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontWeight: 700 }}>
          Total licencias: {licenseSummary.totals.activeDevices} equipos | {formatCurrency(licenseSummary.totals.monthlyTotal)}/mes
        </div>
      </article>
    </section>
  );
}
