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
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <BrandLogo variant="nova" height={46} maxWidth={46} alt="KOVIX Shield" />
          <div>
            <h1 style={{ margin: 0, fontSize: 32, letterSpacing: 0.2 }}>Panel de Control</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontWeight: 500 }}>
              KOVIX
            </p>
          </div>
        </div>
        <p style={{ margin: 0, color: "var(--text-soft)" }}>
          {user ? `Sesion activa: ${displayName}` : "Sin sesion"}
        </p>
      </div>
      <button
        onClick={onLogout}
        style={{ ...buttonStyle, minWidth: 168, minHeight: 46 }}
        type="button"
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "Cerrando..." : "Cerrar sesion"}
      </button>
    </section>
  );
}
