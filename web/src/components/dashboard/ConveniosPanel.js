import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../lib/api";
import { buttonStyle, cardStyle, inputStyle, secondaryButtonStyle } from "./styles";

const initialConvenioForm = {
  fullName: "",
  nationalId: "",
  phone: "",
  brand: "",
  model: "",
  imei: "",
  cashPrice: "",
  installmentCount: "1",
  dueDate: "",
  notes: "",
};

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

function formatCurrency(value) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function resolveStatus(payment) {
  const status = String(payment?.status || "").toUpperCase();
  if (status !== "PENDIENTE") return status;

  const dueDate = new Date(payment?.dueDate);
  if (Number.isNaN(dueDate.getTime())) return status;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDate < todayStart ? "VENCIDO" : "PENDIENTE";
}

function statusBadge(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PAGADO") {
    return { label: "Pagado", bg: "#dcfce7", color: "#166534" };
  }
  if (normalized === "VENCIDO") {
    return { label: "Vencido", bg: "#ffedd5", color: "#9a3412" };
  }
  if (normalized === "MIXTO") {
    return { label: "Mixto", bg: "#fef9c3", color: "#854d0e" };
  }
  return { label: "Pendiente", bg: "#dbeafe", color: "#1e3a8a" };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildGeneralInstallmentRows(customer) {
  const groups = new Map();

  for (const payment of customer?.payments || []) {
    const dueDateKey = payment?.dueDate ? new Date(payment.dueDate).toISOString().slice(0, 10) : "sin-fecha";
    const key = dueDateKey;
    const device = (customer?.devices || []).find((entry) => entry.id === payment?.convenioDeviceId);
    const deviceLabel = device ? `${device.brand || ""} ${device.model || ""}`.trim() : "Equipo";
    const current = groups.get(key) || {
      key,
      dueDate: payment?.dueDate,
      status: resolveStatus(payment),
      amount: 0,
      devices: [],
      sequences: [],
      statuses: [],
    };

    current.amount = Number((current.amount + Number(payment?.amount || 0)).toFixed(2));
    if (deviceLabel && !current.devices.includes(deviceLabel)) current.devices.push(deviceLabel);
    if (payment?.sequence) current.sequences.push(`Cuota ${payment.sequence}`);
    const status = resolveStatus(payment);
    if (!current.statuses.includes(status)) current.statuses.push(status);
    current.status = current.statuses.length > 1 ? "MIXTO" : status;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate));
}

function buildDeviceScheduleSections(customer) {
  const devices = customer?.devices || [];
  const payments = customer?.payments || [];
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const sectionsById = new Map();

  for (const device of devices) {
    sectionsById.set(device.id, {
      id: device.id,
      device,
      payments: [],
      totalAmount: 0,
      pendingAmount: 0,
    });
  }

  for (const payment of payments) {
    const sectionId = payment?.convenioDeviceId || "sin-equipo";
    if (!sectionsById.has(sectionId)) {
      sectionsById.set(sectionId, {
        id: sectionId,
        device: deviceById.get(sectionId) || null,
        payments: [],
        totalAmount: 0,
        pendingAmount: 0,
      });
    }

    const section = sectionsById.get(sectionId);
    const amount = Number(payment?.amount || 0);
    section.payments.push(payment);
    section.totalAmount = Number((section.totalAmount + amount).toFixed(2));
    if (resolveStatus(payment) !== "PAGADO") {
      section.pendingAmount = Number((section.pendingAmount + amount).toFixed(2));
    }
  }

  return Array.from(sectionsById.values())
    .map((section) => ({
      ...section,
      payments: section.payments.sort((left, right) => {
        const dateDiff = new Date(left.dueDate) - new Date(right.dueDate);
        if (dateDiff) return dateDiff;
        return Number(left.sequence || 0) - Number(right.sequence || 0);
      }),
    }))
    .sort((left, right) => {
      const leftDate = left.device?.createdAt ? new Date(left.device.createdAt).getTime() : 0;
      const rightDate = right.device?.createdAt ? new Date(right.device.createdAt).getTime() : 0;
      return rightDate - leftDate;
    });
}

function buildDiscountPdfRows(payments) {
  const groups = new Map();

  for (const payment of payments || []) {
    const dueDateKey = payment?.dueDate ? new Date(payment.dueDate).toISOString().slice(0, 10) : "sin-fecha";
    const customerId = payment?.customer?.id || payment?.convenioCustomerId || payment?.customer?.nationalId || "cliente";
    const key = `${customerId}-${dueDateKey}`;
    const device = payment.device ? `${payment.device.brand || ""} ${payment.device.model || ""}`.trim() : "-";
    const current = groups.get(key) || {
      key,
      customer: payment.customer || {},
      dueDate: payment.dueDate,
      amount: 0,
      devices: [],
      sequences: [],
    };

    current.amount = Number((current.amount + Number(payment?.amount || 0)).toFixed(2));
    if (device && !current.devices.includes(device)) current.devices.push(device);
    if (payment?.sequence) current.sequences.push(`Cuota ${payment.sequence}`);
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const dateDiff = new Date(left.dueDate) - new Date(right.dueDate);
    if (dateDiff) return dateDiff;
    return String(left.customer?.fullName || "").localeCompare(String(right.customer?.fullName || ""));
  });
}

const metricCardStyle = {
  borderRadius: 14,
  padding: 14,
  minHeight: 108,
  display: "grid",
  alignContent: "space-between",
};

export default function ConveniosPanel({ canManage = false }) {
  const now = new Date();
  const scheduleRef = useRef(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialConvenioForm);
  const [formMode, setFormMode] = useState("new");
  const [renewalCustomerId, setRenewalCustomerId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selectedScheduleCustomerId, setSelectedScheduleCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState("");
  const [markingPaymentId, setMarkingPaymentId] = useState("");
  const [skippingPaymentId, setSkippingPaymentId] = useState("");
  const [updatingAccessUserId, setUpdatingAccessUserId] = useState("");
  const [message, setMessage] = useState("");

  async function loadConvenios(options = {}) {
    setLoading(true);
    if (!options.silent) setMessage("");
    try {
      const response = await api.getConvenioSummary({
        ...(ownerUserId ? { ownerUserId } : {}),
        year: selectedYear,
        month: selectedMonth,
      });
      setData(response);
    } catch (error) {
      setMessage(error?.message || "No se pudo cargar Convenios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConvenios({ silent: true });
  }, [ownerUserId, selectedYear, selectedMonth]);

  const customers = data?.customers || [];
  const payments = data?.payments || [];
  const discountRows = data?.discountRows || [];
  const accessUsers = data?.accessUsers || [];
  const totals = data?.summary?.payments || {};
  const monthLabel = MONTH_LABELS[Number(selectedMonth) - 1] || "Mes";
  const calculatedInstallmentAmount = useMemo(() => {
    const total = Number(form.cashPrice || 0);
    const count = Number(form.installmentCount || 0);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(count) || count <= 0) return 0;
    return total / count;
  }, [form.cashPrice, form.installmentCount]);

  const selectedScheduleCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === selectedScheduleCustomerId) || null;
  }, [customers, selectedScheduleCustomerId]);
  const generalInstallmentRows = useMemo(() => {
    return buildGeneralInstallmentRows(selectedScheduleCustomer);
  }, [selectedScheduleCustomer]);
  const deviceScheduleSections = useMemo(() => {
    return buildDeviceScheduleSections(selectedScheduleCustomer);
  }, [selectedScheduleCustomer]);
  const discountPdfRows = useMemo(() => {
    return buildDiscountPdfRows(discountRows);
  }, [discountRows]);

  async function handleCreateConvenio(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const isRenewal = formMode === "renewal";
      const selectedCustomer = customers.find((customer) => customer.id === renewalCustomerId);
      if (isRenewal && !selectedCustomer) {
        setMessage("Selecciona el cliente registrado para renovar credito.");
        return;
      }

      const response = isRenewal
        ? await api.renewConvenioCustomer(renewalCustomerId, form)
        : await api.createConvenioCustomer(form);
      setForm(initialConvenioForm);
      if (isRenewal) {
        setRenewalCustomerId("");
      }
      setSelectedScheduleCustomerId(response?.customer?.id || renewalCustomerId || "");
      setMessage(isRenewal ? "Credito renovado y cuota general actualizada." : "Convenio registrado y tabla de cuotas generada.");
      await loadConvenios({ silent: true });
      setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (error) {
      setMessage(error?.message || "No se pudo guardar el convenio");
    } finally {
      setSaving(false);
    }
  }

  function handleStartRenewal(customer) {
    setFormMode("renewal");
    setRenewalCustomerId(customer?.id || "");
    setForm((value) => ({
      ...value,
      fullName: customer?.fullName || "",
      nationalId: customer?.nationalId || "",
      phone: customer?.phone || "",
      brand: "",
      model: "",
      imei: "",
      cashPrice: "",
      installmentCount: "1",
      dueDate: "",
      notes: "",
    }));
    setSelectedScheduleCustomerId(customer?.id || "");
    setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleChangeFormMode(nextMode) {
    setFormMode(nextMode);
    setForm(initialConvenioForm);
    setRenewalCustomerId("");
  }

  function handleOpenSchedule(customerId) {
    setSelectedScheduleCustomerId(customerId);
    setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function handleMarkPaid(paymentId) {
    setMarkingPaymentId(paymentId);
    setMessage("");
    try {
      await api.markConvenioPaymentPaid(paymentId);
      setMessage("Pago marcado como pagado.");
      await loadConvenios({ silent: true });
    } catch (error) {
      setMessage(error?.message || "No se pudo marcar el pago");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleSkipDiscount(paymentId) {
    setSkippingPaymentId(paymentId);
    setMessage("");
    try {
      await api.skipConvenioPaymentDiscount(paymentId);
      setMessage("Descuento pasado al siguiente mes.");
      await loadConvenios({ silent: true });
    } catch (error) {
      setMessage(error?.message || "No se pudo pasar el descuento");
    } finally {
      setSkippingPaymentId("");
    }
  }

  async function handleDeleteCustomer(customer) {
    if (!customer?.id) return;

    const confirmed = window.confirm(`Eliminar convenio de ${customer.fullName}? Se borrara su equipo y toda la tabla de cuotas.`);
    if (!confirmed) return;

    setDeletingCustomerId(customer.id);
    setMessage("");
    try {
      await api.deleteConvenioCustomer(customer.id);
      if (selectedScheduleCustomerId === customer.id) {
        setSelectedScheduleCustomerId("");
      }
      setMessage("Convenio eliminado correctamente.");
      await loadConvenios({ silent: true });
    } catch (error) {
      setMessage(error?.message || "No se pudo eliminar el convenio");
    } finally {
      setDeletingCustomerId("");
    }
  }

  function handleExportDiscountPdf() {
    const total = discountPdfRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const rows = discountPdfRows
      .map((row, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.customer?.fullName || "-")}</td>
            <td>${escapeHtml(row.customer?.nationalId || "-")}</td>
            <td>${escapeHtml(row.devices.join(", ") || "-")}</td>
            <td>${escapeHtml(row.sequences.join(" + ") || "-")}</td>
            <td>${formatDate(row.dueDate)}</td>
            <td>${formatCurrency(row.amount)}</td>
          </tr>
        `;
      })
      .join("");

    const popup = window.open("", "_blank", "width=960,height=720");
    if (!popup) {
      setMessage("El navegador bloqueo la ventana para exportar PDF");
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Descuentos Convenios ${monthLabel} ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            p { margin: 0 0 18px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #eff6ff; }
            .total { margin-top: 16px; font-weight: 800; text-align: right; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Listado general para pasar descuentos</h1>
          <p>Periodo: ${monthLabel} ${selectedYear}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Cedula</th>
                <th>Dispositivo</th>
                <th>Cuota</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="7">No hay descuentos para este periodo.</td></tr>`}
            </tbody>
          </table>
          <div class="total">Total a descontar: ${formatCurrency(total)}</div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  async function handleToggleAccess(userId, enabled) {
    setUpdatingAccessUserId(userId);
    setMessage("");
    try {
      await api.updateConvenioAccess(userId, { enabled });
      setMessage(enabled ? "Vista de Convenios activada." : "Vista de Convenios retirada.");
      await loadConvenios({ silent: true });
    } catch (error) {
      setMessage(error?.message || "No se pudo actualizar el acceso");
    } finally {
      setUpdatingAccessUserId("");
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <article style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 42, lineHeight: 1.02 }}>Convenios</h2>
            <p style={{ margin: "8px 0 0", color: "var(--text-soft)" }}>
              Registro independiente para equipos sin app de bloqueo y pagos recibidos por roles externos.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={{ ...inputStyle, width: 150 }}>
              {MONTH_LABELS.map((label, index) => {
                const value = String(index + 1).padStart(2, "0");
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
            <input value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} style={{ ...inputStyle, width: 92 }} />
            <button type="button" onClick={handleExportDiscountPdf} style={secondaryButtonStyle}>
              Exportar PDF
            </button>
            <button type="button" onClick={() => loadConvenios()} disabled={loading} style={secondaryButtonStyle}>
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ marginTop: 14, border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 12px", background: "#eff6ff", color: "#1e3a8a", fontWeight: 700 }}>
            {message}
          </div>
        )}
      </article>

      {canManage && (
        <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Acceso a la vista</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>Activa Convenios solo para los usuarios que lo necesitan.</p>
            </div>
            <select value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} style={{ ...inputStyle, maxWidth: 280 }}>
              <option value="">Vista global de convenios</option>
              {accessUsers.map((entry) => (
                <option key={`owner-${entry.id}`} value={entry.id}>
                  {(entry.fullName || entry.username) + ` (${entry.role})`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {accessUsers.map((entry) => (
              <button
                key={`access-${entry.id}`}
                type="button"
                disabled={updatingAccessUserId === entry.id}
                onClick={() => handleToggleAccess(entry.id, !entry.convenioAccess)}
                style={{
                  border: `1px solid ${entry.convenioAccess ? "#16a34a" : "#cbd5e1"}`,
                  borderRadius: 999,
                  padding: "8px 12px",
                  background: entry.convenioAccess ? "#ecfdf5" : "#ffffff",
                  color: entry.convenioAccess ? "#166534" : "#334155",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {(entry.convenioAccess ? "Activo: " : "Sin acceso: ") + (entry.fullName || entry.username)}
              </button>
            ))}
          </div>
        </article>
      )}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <article style={{ ...metricCardStyle, border: "1px solid #bfdbfe", background: "#eff6ff" }}>
          <div style={{ color: "#1d4ed8", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Clientes</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#1e3a8a" }}>{data?.summary?.customersCount || 0}</div>
        </article>
        <article style={{ ...metricCardStyle, border: "1px solid #bae6fd", background: "#f0f9ff" }}>
          <div style={{ color: "#0369a1", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Equipos convenio</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#075985" }}>{data?.summary?.devicesCount || 0}</div>
        </article>
        <article style={{ ...metricCardStyle, border: "1px solid #bbf7d0", background: "#ecfdf5" }}>
          <div style={{ color: "#15803d", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Pagado</div>
          <div style={{ color: "#166534", fontSize: 12, fontWeight: 700 }}>Periodo: {monthLabel}</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#166534" }}>{formatCurrency(totals.paidAmount)}</div>
        </article>
        <article style={{ ...metricCardStyle, border: "1px solid #fed7aa", background: "#fff7ed" }}>
          <div style={{ color: "#c2410c", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Por cobrar</div>
          <div style={{ color: "#9a3412", fontSize: 12, fontWeight: 700 }}>Periodo: {monthLabel}</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#9a3412" }}>{formatCurrency(Number(totals.pendingAmount || 0) + Number(totals.overdueAmount || 0))}</div>
        </article>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <form onSubmit={handleCreateConvenio} style={{ ...cardStyle, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{formMode === "renewal" ? "Renovar credito" : "Registrar convenio"}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleChangeFormMode("new")}
                style={formMode === "new" ? buttonStyle : secondaryButtonStyle}
              >
                Cliente nuevo
              </button>
              <button
                type="button"
                onClick={() => handleChangeFormMode("renewal")}
                style={formMode === "renewal" ? buttonStyle : secondaryButtonStyle}
              >
                Renovar credito
              </button>
            </div>
          </div>
          {formMode === "renewal" && (
            <select
              required
              style={inputStyle}
              value={renewalCustomerId}
              onChange={(event) => {
                const customer = customers.find((entry) => entry.id === event.target.value);
                setRenewalCustomerId(event.target.value);
                setForm((value) => ({
                  ...value,
                  fullName: customer?.fullName || "",
                  nationalId: customer?.nationalId || "",
                  phone: customer?.phone || "",
                }));
              }}
            >
              <option value="">Seleccionar cliente registrado</option>
              {customers.map((customer) => (
                <option key={`renewal-${customer.id}`} value={customer.id}>
                  {customer.fullName} - {customer.nationalId}
                </option>
              ))}
            </select>
          )}
          <input
            required={formMode === "new"}
            disabled={formMode === "renewal"}
            style={{ ...inputStyle, background: formMode === "renewal" ? "#f8fafc" : inputStyle.background }}
            placeholder="Nombre completo"
            value={form.fullName}
            onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))}
          />
          <input
            required={formMode === "new"}
            disabled={formMode === "renewal"}
            style={{ ...inputStyle, background: formMode === "renewal" ? "#f8fafc" : inputStyle.background }}
            placeholder="Cedula o documento"
            value={form.nationalId}
            onChange={(event) => setForm((value) => ({ ...value, nationalId: event.target.value }))}
          />
          <input
            disabled={formMode === "renewal"}
            style={{ ...inputStyle, background: formMode === "renewal" ? "#f8fafc" : inputStyle.background }}
            placeholder="Telefono"
            value={form.phone}
            onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
          />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input style={inputStyle} placeholder="Marca" value={form.brand} onChange={(event) => setForm((value) => ({ ...value, brand: event.target.value }))} />
            <input style={inputStyle} placeholder="Modelo" value={form.model} onChange={(event) => setForm((value) => ({ ...value, model: event.target.value }))} />
          </div>
          <input style={inputStyle} placeholder="IMEI (opcional)" value={form.imei} onChange={(event) => setForm((value) => ({ ...value, imei: event.target.value }))} />
          <input required style={inputStyle} type="number" min="0" step="0.01" placeholder="Valor total del telefono" value={form.cashPrice} onChange={(event) => setForm((value) => ({ ...value, cashPrice: event.target.value }))} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input required style={inputStyle} type="number" min="1" max="60" placeholder="Numero de meses/cuotas" value={form.installmentCount} onChange={(event) => setForm((value) => ({ ...value, installmentCount: event.target.value }))} />
            <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 12px", background: "#eff6ff", display: "grid", alignContent: "center" }}>
              <span style={{ color: "#1e3a8a", fontSize: 12, fontWeight: 800 }}>Cuota mensual calculada</span>
              <strong style={{ color: "#1e3a8a", fontSize: 20 }}>{formatCurrency(calculatedInstallmentAmount)}</strong>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
            <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 13, fontWeight: 700 }}>
              Fecha de corte mensual
            <input required style={inputStyle} type="date" value={form.dueDate} onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))} />
            </label>
          </div>
          <textarea style={{ ...inputStyle, minHeight: 82, resize: "vertical" }} placeholder="Notas" value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} />
          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? "Generando..." : formMode === "renewal" ? "Renovar credito y actualizar tabla" : "Registrar convenio y generar tabla"}
          </button>
        </form>

        <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Clientes de convenio</h3>
            <span style={{ color: "var(--text-soft)", fontWeight: 700 }}>{customers.length} registro(s)</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cliente</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Dispositivo</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cuotas</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Registrado</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Tabla</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Renovar</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Borrar</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <strong>{customer.fullName}</strong>
                      <div style={{ color: "#64748b", fontSize: 13 }}>{customer.nationalId}</div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      {(customer.devices || []).map((device) => `${device.brand} ${device.model}`).join(", ") || "-"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      {(customer.devices || []).map((device) => device.installmentCount || 1).join(", ") || customer.payments?.length || 0}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(customer.createdAt)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenSchedule(customer.id)}
                        style={{ ...secondaryButtonStyle, padding: "7px 10px", borderRadius: 10 }}
                      >
                        Ver cuotas
                      </button>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        onClick={() => handleStartRenewal(customer)}
                        style={{ ...buttonStyle, padding: "7px 10px", borderRadius: 10 }}
                      >
                        Renovar
                      </button>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        disabled={deletingCustomerId === customer.id}
                        onClick={() => handleDeleteCustomer(customer)}
                        style={{
                          border: "1px solid #f97316",
                          borderRadius: 10,
                          padding: "7px 10px",
                          background: "#fff7ed",
                          color: "#9a3412",
                          fontWeight: 800,
                          cursor: deletingCustomerId === customer.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {deletingCustomerId === customer.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 12, color: "#64748b" }}>No hay convenios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {selectedScheduleCustomer && (
        <article ref={scheduleRef} style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Tabla de cuotas</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>
                {selectedScheduleCustomer.fullName} - {selectedScheduleCustomer.nationalId}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#1e3a8a", fontWeight: 900 }}>{selectedScheduleCustomer.payments?.length || 0} cuota(s)</span>
              <button type="button" onClick={() => setSelectedScheduleCustomerId("")} style={{ ...secondaryButtonStyle, padding: "7px 10px", borderRadius: 10 }}>
                Ocultar tabla
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto", border: "1px solid #bfdbfe", borderRadius: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ background: "#eff6ff" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Fecha de corte</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Telefonos incluidos</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cuotas</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cuota general</th>
                </tr>
              </thead>
              <tbody>
                {generalInstallmentRows.map((row) => {
                  const badge = statusBadge(row.status);
                  return (
                    <tr key={`general-${row.key}`}>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(row.dueDate)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{row.devices.join(", ") || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{row.sequences.join(" + ") || "-"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 800, background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>{formatCurrency(row.amount)}</td>
                    </tr>
                  );
                })}
                {generalInstallmentRows.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 12, color: "#64748b" }}>Este cliente todavia no tiene cuotas generales.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {deviceScheduleSections.map((section) => {
              const deviceLabel = section.device ? `${section.device.brand || ""} ${section.device.model || ""}`.trim() : "Sin equipo asignado";
              return (
                <article key={`device-schedule-${section.id}`} style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#ffffff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 12, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <div>
                      <strong>{deviceLabel}</strong>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {section.device?.imei ? `IMEI: ${section.device.imei}` : "Sin IMEI registrado"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 13, fontWeight: 800 }}>
                      <span>{section.payments.length} cuota(s)</span>
                      <span>Pendiente: {formatCurrency(section.pendingAmount)}</span>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                      <thead>
                        <tr style={{ background: "#ffffff" }}>
                          <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Fecha de corte</th>
                          <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cuota</th>
                          <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                          <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Monto</th>
                          <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Accion de este telefono</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.payments.map((payment) => {
                          const status = resolveStatus(payment);
                          const badge = statusBadge(status);
                          return (
                            <tr key={`schedule-${payment.id}`}>
                              <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(payment.dueDate)}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.sequence ? `Cuota ${payment.sequence}` : "-"}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 800, background: badge.bg, color: badge.color }}>{badge.label}</span>
                              </td>
                              <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>{formatCurrency(payment.amount)}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                                <button
                                  type="button"
                                  disabled={status === "PAGADO" || markingPaymentId === payment.id}
                                  onClick={() => handleMarkPaid(payment.id)}
                                  style={{ border: "1px solid #16a34a", borderRadius: 10, padding: "8px 10px", background: status === "PAGADO" ? "#f8fafc" : "#ecfdf5", color: status === "PAGADO" ? "#64748b" : "#166534", fontWeight: 800, cursor: status === "PAGADO" ? "default" : "pointer" }}
                                >
                                  {markingPaymentId === payment.id ? "Marcando..." : status === "PAGADO" ? "Pagado" : "Marcar pagado"}
                                </button>
                                <button
                                  type="button"
                                  disabled={status === "PAGADO" || skippingPaymentId === payment.id}
                                  onClick={() => handleSkipDiscount(payment.id)}
                                  style={{ marginLeft: 8, border: "1px solid #f97316", borderRadius: 10, padding: "8px 10px", background: status === "PAGADO" ? "#f8fafc" : "#fff7ed", color: status === "PAGADO" ? "#64748b" : "#9a3412", fontWeight: 800, cursor: status === "PAGADO" ? "default" : "pointer" }}
                                >
                                  {skippingPaymentId === payment.id ? "Refinanciando..." : "No pasar descuento"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {section.payments.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: 12, color: "#64748b" }}>Este telefono todavia no tiene cuotas.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        </article>
      )}

      <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Finanzas de convenios</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>
              Listado mensual para PDF en {monthLabel} {selectedYear}: <strong>{discountPdfRows.length}</strong>
            </p>
          </div>
          <button type="button" onClick={handleExportDiscountPdf} style={secondaryButtonStyle}>Exportar listado PDF de {monthLabel}</button>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid #dbeafe", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#eff6ff" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cliente</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cedula</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Telefonos vigentes</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Fecha de corte</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cuota</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {discountPdfRows.map((row) => (
                <tr key={`discount-${row.key}`}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{row.customer?.fullName || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{row.customer?.nationalId || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{row.devices.join(", ") || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(row.dueDate)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{row.sequences.join(" + ") || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>{formatCurrency(row.amount)}</td>
                </tr>
              ))}
              {discountPdfRows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 12, color: "#64748b" }}>No hay descuentos para pasar en este mes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Fecha del mes</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cliente</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Equipo</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cuota</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Monto</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const status = resolveStatus(payment);
                const badge = statusBadge(status);
                return (
                  <tr key={payment.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(payment.dueDate)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.customer?.fullName || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.device ? `${payment.device.brand} ${payment.device.model}` : "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.sequence ? `Cuota ${payment.sequence}` : "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}><span style={{ borderRadius: 999, padding: "4px 10px", fontWeight: 800, background: badge.bg, color: badge.color }}>{badge.label}</span></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>{formatCurrency(payment.amount)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        disabled={status === "PAGADO" || markingPaymentId === payment.id}
                        onClick={() => handleMarkPaid(payment.id)}
                        style={{ border: "1px solid #16a34a", borderRadius: 10, padding: "8px 10px", background: status === "PAGADO" ? "#f8fafc" : "#ecfdf5", color: status === "PAGADO" ? "#64748b" : "#166534", fontWeight: 800, cursor: status === "PAGADO" ? "default" : "pointer" }}
                      >
                        {markingPaymentId === payment.id ? "Marcando..." : status === "PAGADO" ? "Pagado" : "Marcar pagado"}
                      </button>
                      <button
                        type="button"
                        disabled={status === "PAGADO" || skippingPaymentId === payment.id}
                        onClick={() => handleSkipDiscount(payment.id)}
                        style={{ marginLeft: 8, border: "1px solid #f97316", borderRadius: 10, padding: "8px 10px", background: status === "PAGADO" ? "#f8fafc" : "#fff7ed", color: status === "PAGADO" ? "#64748b" : "#9a3412", fontWeight: 800, cursor: status === "PAGADO" ? "default" : "pointer" }}
                      >
                        {skippingPaymentId === payment.id ? "Pasando..." : "No pasar descuento"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 12, color: "#64748b" }}>No hay pagos de convenios en {monthLabel} {selectedYear}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
