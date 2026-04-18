import { buttonStyle } from "./styles";
import BrandLogo from "../BrandLogo";

export default function DashboardHeader({ user, onLogout, isLoggingOut }) {
  const displayName = user?.fullName?.trim() || "Administrador";

  return (
    <section
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <BrandLogo variant="nova" height={52} maxWidth={52} alt="KOVIX Shield" />
          <div>
            <h1 style={{ margin: 0, fontSize: 56, letterSpacing: -0.8, lineHeight: 1 }}>Panel de Control</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontWeight: 600 }}>KOVIX</p>
          </div>
        </div>
        <p style={{ margin: 0, color: "var(--text-soft)" }}>
          {user ? `Sesion activa: ${displayName}` : "Sin sesion"}
        </p>
      </div>
      <button
        onClick={onLogout}
        style={{ ...buttonStyle, minWidth: 196, minHeight: 52, borderRadius: 16, fontSize: 20 }}
        type="button"
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "Cerrando..." : "Cerrar sesion"}
      </button>
    </section>
  );
}
