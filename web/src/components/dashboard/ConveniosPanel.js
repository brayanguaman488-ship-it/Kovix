import { useEffect, useMemo, useState } from "react";

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
  paymentAmount: "",
  installmentCount: "1",
  dueDate: "",
  notes: "",
};

const initialPaymentForm = {
  customerId: "",
  deviceId: "",
  amount: "",
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

export default function ConveniosPanel({ canManage = false }) {
  const now = new Date();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialConvenioForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selectedScheduleCustomerId, setSelectedScheduleCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
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

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === paymentForm.customerId) || null;
  }, [customers, paymentForm.customerId]);

  const selectedScheduleCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === selectedScheduleCustomerId) || customers[0] || null;
  }, [customers, selectedScheduleCustomerId]);

  function getCustomerPaymentDevice(customer, payment) {
    return (customer?.devices || []).find((device) => device.id === payment?.convenioDeviceId) || null;
  }

  async function handleCreateConvenio(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.createConvenioCustomer(form);
      setForm(initialConvenioForm);
      setMessage("Convenio registrado correctamente.");
      await loadConvenios({ silent: true });
    } catch (error) {
      setMessage(error?.message || "No se pudo registrar el convenio");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePayment(event) {
    event.preventDefault();
    setSavingPayment(true);
    setMessage("");
    try {
      await api.createConvenioPayment(paymentForm);
      setPaymentForm(initialPaymentForm);
      setMessage("Pago de convenio creado.");
      await loadConvenios({ silent: true });
    } catch (error) {
      setMessage(error?.message || "No se pudo crear el pago");
    } finally {
      setSavingPayment(false);
    }
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

  function handleExportDiscountPdf() {
    const total = discountRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const rows = discountRows
      .map((payment, index) => {
        const device = payment.device ? `${payment.device.brand || ""} ${payment.device.model || ""}`.trim() : "-";
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(payment.customer?.fullName || "-")}</td>
            <td>${escapeHtml(payment.customer?.nationalId || "-")}</td>
            <td>${escapeHtml(device)}</td>
            <td>${payment.sequence ? `Cuota ${payment.sequence}` : "-"}</td>
            <td>${formatDate(payment.dueDate)}</td>
            <td>${formatCurrency(payment.amount)}</td>
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
        <article style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 14, background: "#eff6ff" }}>
          <div style={{ color: "#1d4ed8", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Clientes</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#1e3a8a" }}>{data?.summary?.customersCount || 0}</div>
        </article>
        <article style={{ border: "1px solid #bae6fd", borderRadius: 14, padding: 14, background: "#f0f9ff" }}>
          <div style={{ color: "#0369a1", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Equipos convenio</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#075985" }}>{data?.summary?.devicesCount || 0}</div>
        </article>
        <article style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 14, background: "#ecfdf5" }}>
          <div style={{ color: "#15803d", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Pagado</div>
          <div style={{ color: "#166534", fontSize: 12, fontWeight: 700 }}>Periodo: {monthLabel}</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#166534" }}>{formatCurrency(totals.paidAmount)}</div>
        </article>
        <article style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 14, background: "#fff7ed" }}>
          <div style={{ color: "#c2410c", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Por cobrar</div>
          <div style={{ color: "#9a3412", fontSize: 12, fontWeight: 700 }}>Periodo: {monthLabel}</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#9a3412" }}>{formatCurrency(Number(totals.pendingAmount || 0) + Number(totals.overdueAmount || 0))}</div>
        </article>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <form onSubmit={handleCreateConvenio} style={{ ...cardStyle, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Registrar convenio</h3>
          <input style={inputStyle} placeholder="Nombre completo" value={form.fullName} onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))} />
          <input style={inputStyle} placeholder="Cedula o documento" value={form.nationalId} onChange={(event) => setForm((value) => ({ ...value, nationalId: event.target.value }))} />
          <input style={inputStyle} placeholder="Telefono" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input style={inputStyle} placeholder="Marca" value={form.brand} onChange={(event) => setForm((value) => ({ ...value, brand: event.target.value }))} />
            <input style={inputStyle} placeholder="Modelo" value={form.model} onChange={(event) => setForm((value) => ({ ...value, model: event.target.value }))} />
          </div>
          <input style={inputStyle} placeholder="IMEI (opcional)" value={form.imei} onChange={(event) => setForm((value) => ({ ...value, imei: event.target.value }))} />
          <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Costo del equipo (opcional)" value={form.cashPrice} onChange={(event) => setForm((value) => ({ ...value, cashPrice: event.target.value }))} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Valor de cuota mensual" value={form.paymentAmount} onChange={(event) => setForm((value) => ({ ...value, paymentAmount: event.target.value }))} />
            <input style={inputStyle} type="number" min="1" max="60" placeholder="Numero de meses/cuotas" value={form.installmentCount} onChange={(event) => setForm((value) => ({ ...value, installmentCount: event.target.value }))} />
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
            <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 13, fontWeight: 700 }}>
              Fecha de corte mensual
            <input style={inputStyle} type="date" value={form.dueDate} onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))} />
            </label>
          </div>
          <textarea style={{ ...inputStyle, minHeight: 82, resize: "vertical" }} placeholder="Notas" value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} />
          <button type="submit" disabled={saving} style={buttonStyle}>{saving ? "Registrando..." : "Registrar convenio"}</button>
        </form>

        <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Clientes de convenio</h3>
            <span style={{ color: "var(--text-soft)", fontWeight: 700 }}>{customers.length} registro(s)</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cliente</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Dispositivo</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cuotas</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Registrado</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Tabla</th>
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
                        onClick={() => setSelectedScheduleCustomerId(customer.id)}
                        style={{ ...secondaryButtonStyle, padding: "7px 10px", borderRadius: 10 }}
                      >
                        Ver cuotas
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 12, color: "#64748b" }}>No hay convenios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {selectedScheduleCustomer && (
        <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Tabla de cuotas</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>
                {selectedScheduleCustomer.fullName} - {selectedScheduleCustomer.nationalId}
              </p>
            </div>
            <span style={{ color: "#1e3a8a", fontWeight: 900 }}>{selectedScheduleCustomer.payments?.length || 0} cuota(s)</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Fecha de corte</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Equipo</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cuota</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Monto</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {(selectedScheduleCustomer.payments || []).map((payment) => {
                  const status = resolveStatus(payment);
                  const badge = statusBadge(status);
                  const device = getCustomerPaymentDevice(selectedScheduleCustomer, payment);
                  return (
                    <tr key={`schedule-${payment.id}`}>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(payment.dueDate)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{device ? `${device.brand} ${device.model}` : "-"}</td>
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
                {(!selectedScheduleCustomer.payments || selectedScheduleCustomer.payments.length === 0) && (
                  <tr><td colSpan={6} style={{ padding: 12, color: "#64748b" }}>Este cliente todavia no tiene tabla de cuotas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Finanzas de convenios</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)" }}>Descuentos a pasar en {monthLabel} {selectedYear}: <strong>{discountRows.length}</strong></p>
          </div>
          <button type="button" onClick={handleExportDiscountPdf} style={secondaryButtonStyle}>Exportar listado PDF</button>
        </div>
        <form onSubmit={handleCreatePayment} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <select
            value={paymentForm.customerId}
            onChange={(event) => setPaymentForm((value) => ({ ...value, customerId: event.target.value, deviceId: "" }))}
            style={inputStyle}
          >
            <option value="">Cliente</option>
            {customers.map((customer) => <option key={`pay-customer-${customer.id}`} value={customer.id}>{customer.fullName}</option>)}
          </select>
          <select value={paymentForm.deviceId} onChange={(event) => setPaymentForm((value) => ({ ...value, deviceId: event.target.value }))} style={inputStyle}>
            <option value="">Equipo opcional</option>
            {(selectedCustomer?.devices || []).map((device) => <option key={`pay-device-${device.id}`} value={device.id}>{device.brand} {device.model}</option>)}
          </select>
          <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Valor de cuota mensual" value={paymentForm.amount} onChange={(event) => setPaymentForm((value) => ({ ...value, amount: event.target.value }))} />
          <input style={inputStyle} type="number" min="1" max="60" placeholder="Numero de cuotas" value={paymentForm.installmentCount} onChange={(event) => setPaymentForm((value) => ({ ...value, installmentCount: event.target.value }))} />
          <input style={inputStyle} type="date" title="Fecha de corte mensual" value={paymentForm.dueDate} onChange={(event) => setPaymentForm((value) => ({ ...value, dueDate: event.target.value }))} />
          <button type="submit" disabled={savingPayment} style={{ ...buttonStyle, minWidth: 130 }}>{savingPayment ? "Creando..." : "Crear cuotas"}</button>
        </form>

        <div style={{ overflowX: "auto", border: "1px solid #dbeafe", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#eff6ff" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cliente</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cedula</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Equipo</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Fecha de corte</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Cuota</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #bfdbfe" }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {discountRows.map((payment) => (
                <tr key={`discount-${payment.id}`}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.customer?.fullName || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.customer?.nationalId || "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.device ? `${payment.device.brand} ${payment.device.model}` : "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{formatDate(payment.dueDate)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.sequence ? `Cuota ${payment.sequence}` : "-"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
              {discountRows.length === 0 && (
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
