import {
  cardStyle,
  listItemStyle,
  paginationRowStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
} from "./styles";

export default function CustomersList({
  customers,
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
      <h2 style={sectionTitleStyle}>Clientes</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-soft)" }}>Total: {totalItems}</span>
        <select
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          style={{ border: "1px solid var(--line-soft)", borderRadius: 8, padding: "6px 8px" }}
        >
          <option value="name_asc">Nombre A-Z</option>
          <option value="name_desc">Nombre Z-A</option>
          <option value="created_desc">Mas nuevos</option>
          <option value="created_asc">Mas antiguos</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {customers.map((customer) => (
          <article key={customer.id} style={listItemStyle}>
            <strong>{customer.fullName}</strong>
            <p style={{ margin: "6px 0" }}>Documento: {customer.nationalId}</p>
            <p style={{ margin: "6px 0" }}>Telefono: {customer.phone}</p>
            <p style={{ margin: "6px 0" }}>Dispositivos: {customer.devices.length}</p>
          </article>
        ))}
        {customers.length === 0 && <p style={{ margin: 0 }}>No hay clientes registrados.</p>}
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
