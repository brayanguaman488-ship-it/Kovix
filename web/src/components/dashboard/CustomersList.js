import { cardStyle, sectionTitleStyle } from "./styles";

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
        <span>Total: {totalItems}</span>
        <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
          <option value="name_asc">Nombre A-Z</option>
          <option value="name_desc">Nombre Z-A</option>
          <option value="created_desc">Mas nuevos</option>
          <option value="created_asc">Mas antiguos</option>
        </select>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {customers.map((customer) => (
          <article key={customer.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <strong>{customer.fullName}</strong>
            <p style={{ margin: "6px 0" }}>Documento: {customer.nationalId}</p>
            <p style={{ margin: "6px 0" }}>Telefono: {customer.phone}</p>
            <p style={{ margin: "6px 0" }}>Dispositivos: {customer.devices.length}</p>
          </article>
        ))}
        {customers.length === 0 && <p style={{ margin: 0 }}>No hay clientes registrados.</p>}
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
