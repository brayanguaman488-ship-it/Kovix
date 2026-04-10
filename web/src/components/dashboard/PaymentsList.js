import {
  buttonStyle,
  cardStyle,
  listItemStyle,
  paginationRowStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
} from "./styles";

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
        <span style={{ color: "var(--text-soft)" }}>Total: {totalItems}</span>
        <select
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 8px" }}
        >
          <option value="due_asc">Vencimiento proximo</option>
          <option value="due_desc">Vencimiento lejano</option>
          <option value="amount_asc">Monto menor</option>
          <option value="amount_desc">Monto mayor</option>
          <option value="status_asc">Estado A-Z</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {payments.map((payment) => (
          <article key={payment.id} style={listItemStyle}>
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
          </article>
        ))}
        {payments.length === 0 && <p style={{ margin: 0 }}>No hay pagos programados.</p>}
      </div>
      <div style={paginationRowStyle}>
        <button type="button" onClick={onPrevPage} disabled={page <= 1} style={secondaryButtonStyle}>
          Anterior
        </button>
        <span style={{ color: "var(--text-soft)" }}>
          Pagina {page} de {totalPages}
        </span>
        <button type="button" onClick={onNextPage} disabled={page >= totalPages} style={secondaryButtonStyle}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
