import { buttonStyle, cardStyle, sectionTitleStyle } from "./styles";

export default function PaymentsList({
  payments,
  onMarkPaid,
  onMarkOverdue,
  onMarkPending,
  markingPaymentId,
  totalItems,
  page,
  totalPages,
  sortValue,
  onSortChange,
  onPrevPage,
  onNextPage,
}) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionTitleStyle}>Pagos</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span>Total: {totalItems}</span>
        <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
          <option value="due_asc">Vencimiento proximo</option>
          <option value="due_desc">Vencimiento lejano</option>
          <option value="amount_asc">Monto menor</option>
          <option value="amount_desc">Monto mayor</option>
          <option value="status_asc">Estado A-Z</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {payments.map((payment) => (
          <article key={payment.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <strong>
              {payment.customer?.fullName} - ${Number(payment.amount).toFixed(2)}
            </strong>
            <p style={{ margin: "6px 0" }}>Vence: {new Date(payment.dueDate).toLocaleDateString()}</p>
            <p style={{ margin: "6px 0" }}>Estado: {payment.status}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                  background: "#f59e0b",
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
                  background: "#64748b",
                }}
                disabled={markingPaymentId === payment.id || payment.status === "PENDIENTE"}
              >
                {markingPaymentId === payment.id ? "Guardando..." : "Marcar pendiente"}
              </button>
            </div>
          </article>
        ))}
        {payments.length === 0 && <p style={{ margin: 0 }}>No hay pagos programados.</p>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <button type="button" onClick={onPrevPage} disabled={page <= 1}>
          Anterior
        </button>
        <span>
          Pagina {page} de {totalPages}
        </span>
        <button type="button" onClick={onNextPage} disabled={page >= totalPages}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
