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
  dueDate: "",
  notes: "",
};

const initialPaymentForm = {
  customerId: "",
  deviceId: "",
  amount: "",
  dueDate: "",
  notes: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

export default function ConveniosPanel({ canManage = false }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialConvenioForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [markingPaymentId, setMarkingPaymentId] = useState("");
  const [updatingAccessUserId, setUpdatingAccessUserId] = useState("");
  const [message, setMessage] = useState("");

  async function loadConvenios(options = {}) {
    setLoading(true);
    if (!options.silent) setMessage("");
    try {
      const response = await api.getConvenioSummary(ownerUserId ? { ownerUserId } : {});
      setData(response);
    } catch (error) {
      setMessage(error?.message || "No se pudo cargar Convenios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConvenios({ silent: true });
  }, [ownerUserId]);

  const customers = data?.customers || [];
  const payments = data?.payments || [];
  const accessUsers = data?.accessUsers || [];
  const totals = data?.summary?.payments || {};

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === paymentForm.customerId) || null;
  }, [customers, paymentForm.customerId]);

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
          <button type="button" onClick={() => loadConvenios()} disabled={loading} style={secondaryButtonStyle}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
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
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: "#166534" }}>{formatCurrency(totals.paidAmount)}</div>
        </article>
        <article style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 14, background: "#fff7ed" }}>
          <div style={{ color: "#c2410c", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Por cobrar</div>
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
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Pago a cobrar" value={form.paymentAmount} onChange={(event) => setForm((value) => ({ ...value, paymentAmount: event.target.value }))} />
            <input style={inputStyle} type="date" value={form.dueDate} onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))} />
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
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Pagos</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Registrado</th>
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
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{customer.payments?.length || 0}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{new Date(customer.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 12, color: "#64748b" }}>No hay convenios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Finanzas de convenios</h3>
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
          <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Monto" value={paymentForm.amount} onChange={(event) => setPaymentForm((value) => ({ ...value, amount: event.target.value }))} />
          <input style={inputStyle} type="date" value={paymentForm.dueDate} onChange={(event) => setPaymentForm((value) => ({ ...value, dueDate: event.target.value }))} />
          <button type="submit" disabled={savingPayment} style={{ ...buttonStyle, minWidth: 130 }}>{savingPayment ? "Creando..." : "Crear pago"}</button>
        </form>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Cliente</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0" }}>Equipo</th>
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
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{new Date(payment.dueDate).toLocaleDateString()}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.customer?.fullName || "-"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{payment.device ? `${payment.device.brand} ${payment.device.model}` : "-"}</td>
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
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 12, color: "#64748b" }}>No hay pagos de convenios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
