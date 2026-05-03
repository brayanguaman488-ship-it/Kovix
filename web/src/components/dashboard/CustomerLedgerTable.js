import { useMemo, useState } from "react";

import { cardStyle, inputStyle, sectionTitleStyle } from "./styles";

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

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildReferenceText(customer) {
  const references = [
    { label: "Personal 1", value: customer?.referencePersonalPhone1 },
    { label: "Personal 2", value: customer?.referencePersonalPhone2 },
    { label: "Laboral", value: customer?.referenceWorkPhone },
  ]
    .map((entry) => ({ ...entry, value: String(entry.value || "").trim() }))
    .filter((entry) => entry.value);

  if (references.length === 0) {
    return "-";
  }

  return (
    <div style={{ display: "grid", gap: 3 }}>
      {references.map((entry) => (
        <div key={entry.label}>
          <strong>{entry.label}:</strong> {entry.value}
        </div>
      ))}
    </div>
  );
}

function getRowStatus(payments) {
  if (payments.some((payment) => resolvePaymentStatus(payment) === "VENCIDO")) {
    return "VENCIDO";
  }
  if (payments.some((payment) => resolvePaymentStatus(payment) === "PENDIENTE")) {
    return "PENDIENTE";
  }
  if (payments.some((payment) => resolvePaymentStatus(payment) === "PAGADO")) {
    return "PAGADO";
  }
  return "SIN_PAGOS";
}

function getStatusBadgeStyle(status) {
  if (status === "PAGADO") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "VENCIDO") {
    return {
      background: "#ffedd5",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    };
  }

  if (status === "PENDIENTE") {
    return {
      background: "#dbeafe",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
    };
  }

  return {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
  };
}

export default function CustomerLedgerTable({ customers = [], devices = [], payments = [] }) {
  const now = new Date();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const yearOptions = useMemo(() => {
    const years = new Set([String(now.getFullYear())]);
    customers.forEach((customer) => {
      const createdAt = new Date(customer?.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        years.add(String(createdAt.getFullYear()));
      }
    });
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [customers, now]);

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers
      .map((customer) => {
        const customerId = String(customer?.id || "");
        const createdAt = new Date(customer?.createdAt);
        const customerDevices = devices.filter(
          (device) => String(device?.customer?.id || device?.customerId || "") === customerId
        );
        const customerPayments = payments.filter((payment) => {
          const paymentCustomerId = String(payment?.customer?.id || payment?.customerId || "");
          const paymentNationalId = String(payment?.customer?.nationalId || "");
          return paymentCustomerId === customerId || paymentNationalId === String(customer?.nationalId || "");
        });
        const paidAmount = customerPayments
          .filter((payment) => resolvePaymentStatus(payment) === "PAGADO")
          .reduce((total, payment) => total + Number(payment?.amount || 0), 0);
        const pendingAmount = customerPayments
          .filter((payment) => resolvePaymentStatus(payment) !== "PAGADO")
          .reduce((total, payment) => total + Number(payment?.amount || 0), 0);
        const status = getRowStatus(customerPayments);
        const latestDueDate = customerPayments
          .map((payment) => new Date(payment?.dueDate))
          .filter((date) => !Number.isNaN(date.getTime()))
          .sort((a, b) => b - a)[0];

        return {
          customer,
          devices: customerDevices,
          payments: customerPayments,
          paidAmount,
          pendingAmount,
          status,
          latestDueDate,
          createdAt,
        };
      })
      .filter((row) => {
        const createdAt = row.createdAt;
        if (Number.isNaN(createdAt.getTime())) {
          if (selectedMonth !== "all" || selectedYear !== "all") {
            return false;
          }
        } else {
          const monthMatches =
            selectedMonth === "all" || String(createdAt.getMonth() + 1).padStart(2, "0") === selectedMonth;
          const yearMatches = selectedYear === "all" || String(createdAt.getFullYear()) === selectedYear;

          if (!monthMatches || !yearMatches) {
            return false;
          }
        }

        if (selectedStatus !== "all" && row.status !== selectedStatus) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          row.customer?.fullName,
          row.customer?.nationalId,
          row.customer?.phone,
          row.customer?.referencePersonalPhone1,
          row.customer?.referencePersonalPhone2,
          row.customer?.referenceWorkPhone,
          row.devices.map((device) => `${device.brand || ""} ${device.model || ""} ${device.imei || ""}`).join(" "),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .join(" ");

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const statusOrder = { VENCIDO: 0, PENDIENTE: 1, PAGADO: 2, SIN_PAGOS: 3 };
        const statusCompare = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (statusCompare !== 0) {
          return statusCompare;
        }
        return String(a.customer?.fullName || "").localeCompare(String(b.customer?.fullName || ""));
      });
  }, [customers, devices, payments, search, selectedMonth, selectedYear, selectedStatus]);

  const totals = rows.reduce(
    (acc, row) => {
      acc.paid += row.paidAmount;
      acc.pending += row.pendingAmount;
      acc.overdue += row.status === "VENCIDO" ? 1 : 0;
      acc.paidRows += row.status === "PAGADO" ? 1 : 0;
      return acc;
    },
    { paid: 0, pending: 0, overdue: 0, paidRows: 0 }
  );

  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Listado global de clientes</h2>
      <p style={{ marginTop: -6, color: "var(--text-soft)" }}>
        Tabla consolidada de clientes con celular, referencias y estado global de pagos.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
        <article style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 12, background: "#f8fbff" }}>
          <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Clientes</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a" }}>{rows.length}</div>
        </article>
        <article style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fffaf5" }}>
          <div style={{ color: "#ea580c", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Vencidos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#c2410c" }}>{totals.overdue}</div>
        </article>
        <article style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 12, background: "#f7fff9" }}>
          <div style={{ color: "#16a34a", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Pagados</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#166534" }}>{totals.paidRows}</div>
        </article>
        <article style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#f6faff" }}>
          <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Saldo por cobrar</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1e40af" }}>{formatMoney(totals.pending)}</div>
        </article>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por cliente, cedula, telefono o referencia"
          style={{ ...inputStyle, width: 420, maxWidth: "100%" }}
        />
        <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={{ ...inputStyle, width: 190 }}>
          <option value="all">Todos los meses</option>
          {MONTH_LABELS.map((label, index) => (
            <option key={label} value={String(index + 1).padStart(2, "0")}>
              {label}
            </option>
          ))}
        </select>
        <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="all">Todos los anos</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} style={{ ...inputStyle, width: 170 }}>
          <option value="all">Todos</option>
          <option value="VENCIDO">Vencidos</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="PAGADO">Pagados</option>
          <option value="SIN_PAGOS">Sin pagos</option>
        </select>
      </div>
      <p style={{ margin: "0 0 12px", color: "var(--text-soft)", fontSize: 13 }}>
        Mes y ano filtran clientes por fecha de ingreso. Los pagos se muestran siempre de forma global por cliente.
      </p>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 14, background: "#ffffff" }}>
        <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Cliente", "Celular", "Referencias", "Ingreso", "Estado", "Pagado", "Por cobrar", "Ultimo vencimiento"].map((label) => (
                <th key={label} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badgeStyle = getStatusBadgeStyle(row.status);
              const primaryDevice = row.devices[0];
              return (
                <tr key={row.customer.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                    <strong>{row.customer.fullName}</strong>
                    <div style={{ color: "#64748b", fontSize: 13 }}>Cedula: {row.customer.nationalId || "-"}</div>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                    <strong>{row.customer.phone || "-"}</strong>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      {primaryDevice ? `${primaryDevice.brand || ""} ${primaryDevice.model || ""}`.trim() : "Sin equipo"}
                    </div>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top", color: "#334155" }}>
                    {buildReferenceText(row.customer)}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                    {Number.isNaN(row.createdAt.getTime()) ? "-" : row.createdAt.toLocaleDateString()}
                    <div style={{ color: "#64748b", fontSize: 13 }}>{row.payments.length} cuota(s) global</div>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                    <span style={{ ...badgeStyle, display: "inline-block", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top", fontWeight: 800 }}>
                    {formatMoney(row.paidAmount)}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top", fontWeight: 800 }}>
                    {formatMoney(row.pendingAmount)}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                    {row.latestDueDate ? row.latestDueDate.toLocaleDateString() : "-"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 12, color: "#475569" }}>
                  No hay clientes para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
