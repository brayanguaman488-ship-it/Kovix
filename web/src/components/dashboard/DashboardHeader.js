import { buttonStyle, cardStyle } from "./styles";
import BrandLogo from "../BrandLogo";

export default function DashboardHeader({ user, onLogout, isLoggingOut }) {
  const displayName = user?.fullName?.trim() || "Administrador";

  return (
    <section
      style={{
        ...cardStyle,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <BrandLogo variant="shield" height={58} maxWidth={58} alt="KOVIX Shield" />
          <h1 style={{ margin: 0, fontSize: 30 }}>KOVIX Dashboard</h1>
        </div>
        <p style={{ marginTop: 8, marginBottom: 0, color: "var(--text-soft)" }}>
          {user ? `Sesion activa: ${displayName}` : "Sin sesion"}
        </p>
      </div>
      <button onClick={onLogout} style={buttonStyle} type="button" disabled={isLoggingOut}>
        {isLoggingOut ? "Cerrando..." : "Cerrar sesion"}
      </button>
    </section>
  );
}
