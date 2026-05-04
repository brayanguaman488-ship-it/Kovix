import { useMemo, useState } from "react";

import { cardStyle, sectionTitleStyle } from "./styles";
import React from "react";
import { api } from "../../lib/api";

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
  if (status !== "PENDIENTE") return status;

  const dueDate = new Date(payment?.dueDate);
  if (Number.isNaN(dueDate.getTime())) return status;

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

export default function FinancePanel({ payments, devices = [], canManageLicenses = false, ownerUserId = "" }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [licenseData, setLicenseData] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseMarkingUserId, setLicenseMarkingUserId] = useState("");
  const [licenseMessage, setLicenseMessage] = useState("");
  const [licensePricingDraft, setLicensePricingDraft] = useState([]);
  const [licenseScopeUserIds, setLicenseScopeUserIds] = useState([]);

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
      if (Number.isNaN(dueDate.getTime())) return false;
      return (
        String(dueDate.getFullYear()) === selectedYear &&
        String(dueDate.getMonth() + 1).padStart(2, "0") === selectedMonth
      );
    });
  }, [payments, selectedMonth, selectedYear]);

  const contractSuffixMap = useMemo(() => {
    const byCustomer = new Map();
    for (const device of devices || []) {
      const contract = device?.creditContract;
      const customerId = String(device?.customer?.id || device?.customerId || contract?.customerId || "");
      if (!contract?.id || !customerId) continue;

      const entries = byCustomer.get(customerId) || [];
      entries.push({
        id: String(contract.id),
        createdAt: new Date(contract.createdAt || device.createdAt || 0).getTime(),
      });
      byCustomer.set(customerId, entries);
    }

    const suffixMap = new Map();
    for (const entries of byCustomer.values()) {
      entries
        .sort((a, b) => a.createdAt - b.createdAt)
        .forEach((entry, index) => {
          suffixMap.set(entry.id, index === 0 ? "" : String.fromCharCode(64 + index));
        });
    }

    return suffixMap;
  }, [devices]);

  function getPaymentInstallmentLabel(payment) {
    if (!payment?.installment) {
      return "-";
    }

    const sequence = payment?.installment?.sequence;
    if (!sequence) {
      return "-";
    }

    const contractId = String(payment?.installment?.contractId || payment?.installment?.contract?.id || "");
    const suffix = contractSuffixMap.get(contractId) || "";
    return `${sequence}${suffix}`;
  }

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

      summary.pendingAmount += amount;
      summary.pendingCount += 1;
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
    { key: "pending", label: "Pendiente por cobrar", amount: totals.pendingAmount, count: totals.pendingCount, color: "#2563eb", bg: "#eff6ff" },
    { key: "overdue", label: "Vencido por cobrar", amount: totals.overdueAmount, count: totals.overdueCount, color: "#c2410c", bg: "#fff7ed" },
    { key: "paid", label: "Pagado", amount: totals.paidAmount, count: totals.paidCount, color: "#15803d", bg: "#ecfdf5" },
    { key: "total", label: "Total del mes", amount: totals.totalAmount, count: totals.totalCount, color: "#4338ca", bg: "#eef2ff" },
  ];

  const financeDistribution = useMemo(() => {
    const total = totals.totalAmount > 0 ? totals.totalAmount : 1;
    const pendingPercent = (totals.pendingAmount / total) * 100;
    const overduePercent = (totals.overdueAmount / total) * 100;
    const paidPercent = (totals.paidAmount / total) * 100;

    return {
      pendingPercent,
      overduePercent,
      paidPercent,
      gradient: `conic-gradient(#2563eb 0% ${pendingPercent}%, #f97316 ${pendingPercent}% ${pendingPercent + overduePercent}%, #22c55e ${pendingPercent + overduePercent}% 100%)`,
    };
  }, [totals]);

  const recentMovements = useMemo(() => {
    return [...scopedPayments]
      .sort((a, b) => new Date(b?.dueDate).getTime() - new Date(a?.dueDate).getTime())
      .slice(0, 6)
      .map((payment) => {
        const status = resolvePaymentStatus(payment);
        const installmentLabel = getPaymentInstallmentLabel(payment);
        const isDownPayment = !payment?.installment && String(payment?.notes || "").toLowerCase().includes("entrada");
        const concept =
          isDownPayment
            ? "Entrada inicial"
            : status === "PAGADO"
            ? `Pago de cuota ${installmentLabel}`
            : status === "VENCIDO"
              ? `Cuota vencida ${installmentLabel}`
              : `Cuota pendiente ${installmentLabel}`;
        return {
          id: payment?.id,
          date: payment?.dueDate,
          concept,
          status,
          amount: Number(payment?.amount || 0),
          installmentLabel,
        };
      });
  }, [scopedPayments, contractSuffixMap]);

  function normalizeLicenseTiers(tiers = []) {
    return tiers.map((tier) => ({
      key: tier.key || tier.tierKey,
      tierKey: tier.tierKey || tier.key,
      label: tier.label,
      min: Number(tier.min ?? tier.minAmount ?? 0),
      max:
        tier.max === Number.POSITIVE_INFINITY || tier.maxAmount === null || tier.maxAmount === undefined || tier.max === null
          ? Number.POSITIVE_INFINITY
          : Number(tier.max ?? tier.maxAmount),
      minAmount: Number(tier.minAmount ?? tier.min ?? 0),
      maxAmount:
        tier.maxAmount === null || tier.maxAmount === undefined || tier.max === Number.POSITIVE_INFINITY || tier.max === null
          ? null
          : Number(tier.maxAmount ?? tier.max),
      monthly: Number(tier.monthly ?? tier.monthlyPrice ?? 0),
      monthlyPrice: Number(tier.monthlyPrice ?? tier.monthly ?? 0),
      activeDevices: Number(tier.activeDevices || 0),
      monthlyTotal: Number(tier.monthlyTotal || 0),
    }));
  }

  function buildLicenseDraft(tiers = []) {
    return normalizeLicenseTiers(tiers).map((tier) => ({
      tierKey: tier.tierKey,
      label: tier.label,
      minAmount: String(tier.minAmount),
      maxAmount: tier.maxAmount === null ? "" : String(tier.maxAmount),
      monthlyPrice: String(tier.monthlyPrice),
    }));
  }

  async function loadLicenseSummary(options = {}) {
    setLicenseLoading(true);
    if (!options.silent) setLicenseMessage("");
    try {
      const response = await api.getLicenseSummary({
        year: selectedYear,
        month: selectedMonth,
        ownerUserId,
      });
      setLicenseData(response);
      const rules = response?.rules?.scoped || response?.summary?.tiers || [];
      setLicensePricingDraft(buildLicenseDraft(rules));
      if (!options.silent) setLicenseMessage("Licencias actualizadas.");
    } catch (error) {
      setLicenseMessage(error?.message || "No se pudo cargar licencias.");
    } finally {
      setLicenseLoading(false);
    }
  }

  async function handleSaveLicensePricing() {
    setLicenseSaving(true);
    setLicenseMessage("");
    try {
      await api.updateLicensePricing({
        scopeUserIds: licenseScopeUserIds,
        tiers: licensePricingDraft.map((tier) => ({
          ...tier,
          minAmount: Number(tier.minAmount || 0),
          maxAmount: tier.maxAmount === "" ? null : Number(tier.maxAmount),
          monthlyPrice: Number(tier.monthlyPrice || 0),
        })),
      });
      setLicenseMessage(licenseScopeUserIds.length ? "Precios aplicados a usuarios seleccionados." : "Precios globales actualizados.");
      await loadLicenseSummary({ silent: true });
    } catch (error) {
      setLicenseMessage(error?.message || "No se pudo guardar precios de licencias.");
    } finally {
      setLicenseSaving(false);
    }
  }

  async function handleMarkLicensePaid(entry) {
    const targetUserId = entry?.user?.id;
    if (!targetUserId) return;

    setLicenseMarkingUserId(targetUserId);
    setLicenseMessage("");
    try {
      await api.markLicenseBillingPaid({
        userId: targetUserId,
        year: selectedYear,
        month: selectedMonth,
        amount: Number(entry?.summary?.totals?.monthlyTotal || 0),
        activeDevices: Number(entry?.summary?.totals?.activeDevices || 0),
      });
      setLicenseMessage("Uso de licencias marcado como pagado.");
      await loadLicenseSummary({ silent: true });
    } catch (error) {
      setLicenseMessage(error?.message || "No se pudo marcar como pagado.");
    } finally {
      setLicenseMarkingUserId("");
    }
  }

  React.useEffect(() => {
    loadLicenseSummary({ silent: true });
  }, [selectedYear, selectedMonth, ownerUserId]);

  const fallbackLicenseSummary = useMemo(() => {
    const tiers = [
      { key: "gama_baja", label: "Gama baja", min: 0, max: 400, monthly: 10 },
      { key: "gama_media", label: "Gama media", min: 401, max: 850, monthly: 15 },
      { key: "gama_alta", label: "Gama alta", min: 851, max: 1500, monthly: 25 },
      { key: "gama_ultra", label: "Gama ultra", min: 1501, max: Number.POSITIVE_INFINITY, monthly: 30 },
    ];

    const byTier = Object.fromEntries(tiers.map((tier) => [tier.key, { ...tier, activeDevices: 0, monthlyTotal: 0 }]));
    const totalsLic = { activeDevices: 0, monthlyTotal: 0 };

    for (const device of devices || []) {
      const contract = device?.creditContract;
      if (!contract) continue;

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
      totalsLic.activeDevices += 1;
      totalsLic.monthlyTotal += selectedTier.monthly;
    }

    return { tiers: Object.values(byTier), totals: totalsLic };
  }, [devices]);

  const licenseSummary = useMemo(() => {
    const source = licenseData?.summary || fallbackLicenseSummary;
    return {
      totals: {
        activeDevices: Number(source?.totals?.activeDevices || 0),
        monthlyTotal: Number(source?.totals?.monthlyTotal || 0),
      },
      tiers: normalizeLicenseTiers(source?.tiers || []),
    };
  }, [licenseData, fallbackLicenseSummary]);

  const licenseUsers = Array.isArray(licenseData?.users) ? licenseData.users : [];

  const licenseDistribution = useMemo(() => {
    const total = Math.max(1, licenseSummary.totals.activeDevices);
    const colors = { gama_baja: "#1d4ed8", gama_media: "#14b8a6", gama_alta: "#94a3b8", gama_ultra: "#cbd5e1" };
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
    if (slices.length === 0) slices.push("#e2e8f0 0% 100%");
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
          <button type="button" onClick={() => handleShiftMonth(-1)} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}>Mes anterior</button>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px" }}>
            {MONTH_LABELS.map((label, index) => {
              const value = String(index + 1).padStart(2, "0");
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} style={{ border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px" }}>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="button" onClick={() => handleShiftMonth(1)} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}>Mes siguiente</button>
        </div>
      </div>

      <p style={{ margin: "0 0 12px", color: "var(--text-soft)" }}>
        Periodo seleccionado: <strong>{monthLabel} {selectedYear}</strong>
      </p>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {cards.map((card) => (
          <article key={card.key} style={{ borderRadius: 14, padding: "12px 14px", border: `1px solid ${card.color}33`, background: card.bg }}>
            <div style={{ fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase", color: card.color, fontWeight: 700 }}>{card.label}</div>
            <div style={{ marginTop: 5, fontSize: 40 - 12, fontWeight: 800, color: card.color }}>{formatCurrency(card.amount)}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#334155" }}>Cuotas: {card.count}</div>
          </article>
        ))}
      </div>

      <article style={{ marginTop: 14, border: "1px solid #dbe4ef", borderRadius: 16, background: "#ffffff", display: "grid", gap: 0, gridTemplateColumns: "minmax(280px, 420px) 1fr", overflow: "hidden" }}>
        <section style={{ padding: 16, borderRight: "1px solid #e2e8f0", display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Distribución de cuotas ({monthLabel} {selectedYear})</h3>
          <div style={{ display: "grid", placeItems: "center", padding: "6px 0" }}>
            <div style={{ width: 220, height: 220, borderRadius: "50%", background: financeDistribution.gradient, position: "relative" }}>
              <div style={{ position: "absolute", inset: 44, borderRadius: "50%", background: "#ffffff", display: "grid", placeItems: "center", textAlign: "center", color: "#334155", fontWeight: 600, lineHeight: 1.3 }}>
                <div>
                  Total del mes
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#1e3a8a" }}>{formatCurrency(totals.totalAmount)}</div>
                  <div>100%</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#2563eb", fontWeight: 700 }}>Pendiente por cobrar</span><span>{formatCurrency(totals.pendingAmount)}</span><span style={{ color: "#2563eb", fontWeight: 700 }}>{financeDistribution.pendingPercent.toFixed(1)}%</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#f97316", fontWeight: 700 }}>Vencido por cobrar</span><span>{formatCurrency(totals.overdueAmount)}</span><span style={{ color: "#f97316", fontWeight: 700 }}>{financeDistribution.overduePercent.toFixed(1)}%</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>Pagado</span><span>{formatCurrency(totals.paidAmount)}</span><span style={{ color: "#22c55e", fontWeight: 700 }}>{financeDistribution.paidPercent.toFixed(1)}%</span>
            </div>
          </div>
        </section>

        <section style={{ padding: 16, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Movimientos recientes</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Fecha</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Concepto</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Monto</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cuotas</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((entry) => (
                  <tr key={`movement-${entry.id}`}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{entry.date ? new Date(entry.date).toLocaleDateString() : "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{entry.concept}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 700, background: entry.status === "PAGADO" ? "#dcfce7" : entry.status === "VENCIDO" ? "#ffedd5" : "#dbeafe", color: entry.status === "PAGADO" ? "#166534" : entry.status === "VENCIDO" ? "#9a3412" : "#1e3a8a" }}>
                        {entry.status === "PAGADO" ? "Pagado" : entry.status === "VENCIDO" ? "Vencido" : "Pendiente"}
                      </span>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>{formatCurrency(entry.amount)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{entry.installmentLabel}</td>
                  </tr>
                ))}
                {recentMovements.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 12, color: "#64748b" }}>No hay movimientos recientes en este periodo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </article>

      <article style={{ marginTop: 14, border: "1px solid #dbe4ef", borderRadius: 20, padding: 18, background: "#ffffff", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Licencias activas</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>Se contabilizan unicamente equipos vigentes con deuda pendiente.</p>
          </div>
          <button
            type="button"
            disabled={licenseLoading}
            onClick={() => loadLicenseSummary()}
            style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 14px", background: "#ffffff", cursor: "pointer" }}
          >
            {licenseLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {licenseMessage && (
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 12px", background: "#eff6ff", color: "#1e3a8a", fontWeight: 700 }}>
            {licenseMessage}
          </div>
        )}

        {canManageLicenses && licensePricingDraft.length > 0 && (
          <article style={{ border: "1px solid #c7d2fe", borderRadius: 16, padding: 14, background: "#f8fafc", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 17 }}>Precios de licencias</h4>
                <p style={{ margin: "4px 0 0", color: "#475569" }}>
                  Sin seleccionar usuarios se actualiza el precio global. Si eliges usuarios, se aplica solo a ellos.
                </p>
              </div>
              <button
                type="button"
                disabled={licenseSaving}
                onClick={handleSaveLicensePricing}
                style={{ border: "1px solid #1d4ed8", borderRadius: 12, padding: "10px 14px", background: "#1d4ed8", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}
              >
                {licenseSaving ? "Guardando..." : "Guardar precios"}
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {licensePricingDraft.map((tier, index) => (
                <article key={`pricing-${tier.tierKey}`} style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#ffffff", display: "grid", gap: 8 }}>
                  <strong>{tier.label}</strong>
                  <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
                    Desde
                    <input
                      type="number"
                      min="0"
                      value={tier.minAmount}
                      onChange={(event) => setLicensePricingDraft((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, minAmount: event.target.value } : item))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
                    Hasta
                    <input
                      type="number"
                      min="0"
                      placeholder="Sin limite"
                      value={tier.maxAmount}
                      onChange={(event) => setLicensePricingDraft((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, maxAmount: event.target.value } : item))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
                    Precio mensual
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.monthlyPrice}
                      onChange={(event) => setLicensePricingDraft((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, monthlyPrice: event.target.value } : item))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}
                    />
                  </label>
                </article>
              ))}
            </div>

            {licenseUsers.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <strong>Aplicar a usuarios especificos</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {licenseUsers.map((entry) => {
                    const checked = licenseScopeUserIds.includes(entry.user.id);
                    return (
                      <label key={`license-scope-${entry.user.id}`} style={{ border: `1px solid ${checked ? "#2563eb" : "#cbd5e1"}`, borderRadius: 999, padding: "8px 12px", background: checked ? "#eff6ff" : "#ffffff", display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setLicenseScopeUserIds((items) =>
                              event.target.checked ? [...items, entry.user.id] : items.filter((id) => id !== entry.user.id)
                            );
                          }}
                        />
                        {entry.user.fullName || entry.user.username}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        )}

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#f8fafc" }}><div style={{ color: "#475569" }}>Equipos activos</div><div style={{ marginTop: 6, fontSize: 30, fontWeight: 800, color: "#1d4ed8" }}>{licenseSummary.totals.activeDevices}</div></article>
          <article style={{ border: "1px solid #2563eb", borderRadius: 14, padding: 12, color: "#ffffff", background: "linear-gradient(135deg, #1d4ed8, #38bdf8)" }}><div>Total mensual</div><div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{formatCurrency(licenseSummary.totals.monthlyTotal)}</div></article>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#f8fafc" }}><div style={{ color: "#475569" }}>Promedio por equipo</div><div style={{ marginTop: 6, fontSize: 30, fontWeight: 800, color: "#1d4ed8" }}>{formatCurrency(averagePerDevice)}</div></article>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 12, background: "#f8fafc" }}><div style={{ color: "#475569" }}>Distribucion</div><div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: "#1d4ed8" }}>{activeDistributionText}</div></article>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(220px, 320px) 1fr" }}>
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
            <h4 style={{ margin: "0 0 10px" }}>Distribucion por gama</h4>
            <div style={{ display: "grid", placeItems: "center" }}><div style={{ width: 180, height: 180, borderRadius: "50%", background: licenseDistribution, position: "relative" }}><div style={{ position: "absolute", inset: 34, background: "#f8fafc", borderRadius: "50%" }} /></div></div>
          </article>

          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, overflowX: "auto", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
              <thead><tr style={{ background: "#f8fafc" }}><th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Gama</th><th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Equipos</th><th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Precio unitario</th><th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Subtotal mensual</th><th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th></tr></thead>
              <tbody>
                {licenseSummary.tiers.map((tier) => (
                  <tr key={`license-row-${tier.key}`}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{tier.label}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{tier.activeDevices} equipos</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(tier.monthly)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(tier.monthlyTotal)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}><span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 700, background: tier.activeDevices > 0 ? "#dcfce7" : "#e2e8f0", color: tier.activeDevices > 0 ? "#166534" : "#475569" }}>{tier.activeDevices > 0 ? "Activo" : "Sin equipos"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>

        {canManageLicenses && licenseUsers.length > 0 && (
          <article style={{ border: "1px solid #dbe4ef", borderRadius: 14, overflowX: "auto", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Usuario</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Equipos activos</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Total mensual</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {licenseUsers.map((entry) => {
                  const paid = String(entry?.billing?.status || "").toUpperCase() === "PAGADO";
                  const activeDevices = Number(entry?.summary?.totals?.activeDevices || 0);
                  const monthlyTotal = Number(entry?.summary?.totals?.monthlyTotal || 0);
                  return (
                    <tr key={`license-user-${entry.user.id}`}>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                        <strong>{entry.user.fullName || entry.user.username}</strong>
                        <div style={{ color: "#64748b", fontSize: 13 }}>{entry.user.role}</div>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{activeDevices}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 800 }}>{formatCurrency(monthlyTotal)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 700, background: paid ? "#dcfce7" : "#dbeafe", color: paid ? "#166534" : "#1e3a8a" }}>
                          {paid ? "Pagado" : "Pendiente"}
                        </span>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          disabled={paid || licenseMarkingUserId === entry.user.id}
                          onClick={() => handleMarkLicensePaid(entry)}
                          style={{ border: "1px solid #16a34a", borderRadius: 10, padding: "8px 10px", background: paid ? "#f8fafc" : "#ecfdf5", color: paid ? "#64748b" : "#166534", fontWeight: 800, cursor: paid ? "default" : "pointer" }}
                        >
                          {licenseMarkingUserId === entry.user.id ? "Marcando..." : paid ? "Pagado" : "Marcar pagado"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        )}

        <article style={{ border: "1px solid #c7d2fe", borderRadius: 14, padding: 14, background: "linear-gradient(180deg, #eff6ff, #f8fafc)", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Total licencias: <span style={{ color: "#1d4ed8" }}>{licenseSummary.totals.activeDevices} equipos</span></div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#1d4ed8" }}>{formatCurrency(licenseSummary.totals.monthlyTotal)} <span style={{ fontSize: 22, color: "#334155" }}>/ mes</span></div>
        </article>
      </article>
    </section>
  );
}

