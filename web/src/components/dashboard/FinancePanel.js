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

  const licenseDistribution = useMemo(() => {
    const total = Math.max(1, licenseSummary.totals.activeDevices);
    const colors = {
      gama_baja: "#1d4ed8",
      gama_media: "#14b8a6",
      gama_alta: "#94a3b8",
      gama_ultra: "#cbd5e1",
    };

    const slices = [];
    let cursor = 0;
    for (const tier of licenseSummary.tiers) {
      const count = Number(tier.activeDevices || 0);
      if (count <= 0) continue;
      const portion = (count / total) * 100;
      const next = cursor + portion;
      slices.push(`${colors[tier.key] || "#94a3b8"} ${cursor}% ${next}%`);
      cursor = next;
    }

    if (slices.length === 0) {
      slices.push("#e2e8f0 0% 100%");
    }

    return `conic-gradient(${slices.join(", ")})`;
  }, [licenseSummary]);

  const averagePerDevice = useMemo(() => {
    if (!licenseSummary.totals.activeDevices) return 0;
    return licenseSummary.totals.monthlyTotal / licenseSummary.totals.activeDevices;
  }, [licenseSummary]);

  const activeDistributionText = useMemo(() => {
    const active = licenseSummary.tiers
      .filter((tier) => tier.activeDevices > 0)
      .map((tier) => `${tier.activeDevices} ${tier.label.replace("Gama ", "").toLowerCase()}`);
    return active.length ? active.join(" • ") : "Sin equipos";
  }, [licenseSummary]);

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

      <article style={{ marginTop: 14, border: "1px solid #dbe4ef", borderRadius: 20, padding: 18, background: "#ffffff", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 40 - 22 }}>Licencias activas</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>
              Se contabilizan unicamente equipos vigentes con deuda pendiente.
            </p>
          </div>
          <button type="button" style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 14px", background: "#ffffff", cursor: "pointer" }}>
            Actualizar
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#f8fafc" }}>
            <div style={{ color: "#475569" }}>Equipos activos</div>
            <div style={{ marginTop: 6, fontSize: 38 - 8, fontWeight: 800, color: "#1d4ed8" }}>{licenseSummary.totals.activeDevices}</div>
          </article>
          <article style={{ border: "1px solid #2563eb", borderRadius: 14, padding: 12, color: "#ffffff", background: "linear-gradient(135deg, #1d4ed8, #38bdf8)" }}>
            <div>Total mensual</div>
            <div style={{ marginTop: 6, fontSize: 38 - 8, fontWeight: 800 }}>{formatCurrency(licenseSummary.totals.monthlyTotal)}</div>
          </article>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#f8fafc" }}>
            <div style={{ color: "#475569" }}>Promedio por equipo</div>
            <div style={{ marginTop: 6, fontSize: 38 - 8, fontWeight: 800, color: "#1d4ed8" }}>{formatCurrency(averagePerDevice)}</div>
          </article>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#f8fafc" }}>
            <div style={{ color: "#475569" }}>Distribucion</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: "#1d4ed8" }}>{activeDistributionText}</div>
          </article>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(220px, 320px) 1fr" }}>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
            <h4 style={{ margin: "0 0 10px" }}>Distribucion por gama</h4>
            <div style={{ display: "grid", placeItems: "center" }}>
              <div style={{ width: 180, height: 180, borderRadius: "50%", background: licenseDistribution, position: "relative" }}>
                <div style={{ position: "absolute", inset: 34, background: "#f8fafc", borderRadius: "50%" }} />
              </div>
            </div>
          </article>

          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, overflowX: "auto", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Gama</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Equipos</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Precio unitario</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Subtotal mensual</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {licenseSummary.tiers.map((tier) => (
                  <tr key={`license-row-${tier.key}`}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{tier.label}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{tier.activeDevices} equipos</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(tier.monthly)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(tier.monthlyTotal)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontWeight: 700,
                        background: tier.activeDevices > 0 ? "#dcfce7" : "#e2e8f0",
                        color: tier.activeDevices > 0 ? "#166534" : "#475569",
                      }}>
                        {tier.activeDevices > 0 ? "Activo" : "Sin equipos"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>

        <article style={{ border: "1px solid #c7d2fe", borderRadius: 14, padding: 14, background: "linear-gradient(180deg, #eff6ff, #f8fafc)", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 34 - 8, fontWeight: 700 }}>
            Total licencias: <span style={{ color: "#1d4ed8" }}>{licenseSummary.totals.activeDevices} equipos</span>
          </div>
          <div style={{ fontSize: 42 - 6, fontWeight: 800, color: "#1d4ed8" }}>
            {formatCurrency(licenseSummary.totals.monthlyTotal)} <span style={{ fontSize: 22, color: "#334155" }}>/ mes</span>
          </div>
        </article>
      </article>
    </section>
  );
}
