import { buttonStyle, cardStyle } from "./styles";

export default function DashboardHeader({ user, onLogout, isLoggingOut }) {
  return (
    <section
      style={{
        ...cardStyle,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>KOVIX Dashboard</h1>
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          {user ? `Sesion activa: ${user.username}` : "Sin sesion"}
        </p>
      </div>
      <button onClick={onLogout} style={buttonStyle} type="button" disabled={isLoggingOut}>
        {isLoggingOut ? "Cerrando..." : "Cerrar sesion"}
      </button>
    </section>
  );
}
