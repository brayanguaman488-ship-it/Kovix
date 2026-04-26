import { buttonStyle } from "./styles";
import BrandLogo from "../BrandLogo";

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3a5 5 0 0 0-5 5v2.4c0 .9-.3 1.8-.9 2.5L4.7 15a1 1 0 0 0 .8 1.6h13a1 1 0 0 0 .8-1.6l-1.4-2.1a4 4 0 0 1-.9-2.5V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 21Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function DashboardHeader({
  user,
  onLogout,
  isLoggingOut,
  notificationsCount = 0,
  notifications = [],
  notificationsOpen = false,
  onToggleNotifications,
  onOpenNotification,
}) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={onToggleNotifications}
            style={{
              minHeight: 52,
              minWidth: 64,
              borderRadius: 16,
              border: "1px solid rgba(29, 78, 216, 0.38)",
              background: "#ffffff",
              color: "#1e3a8a",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              position: "relative",
            }}
            aria-label="Notificaciones"
            title="Notificaciones Equifax"
          >
            <BellIcon />
            {notificationsCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                  padding: "0 6px",
                  border: "2px solid #ffffff",
                }}
              >
                {notificationsCount > 99 ? "99+" : notificationsCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              style={{
                position: "absolute",
                top: 58,
                right: 0,
                zIndex: 30,
                width: 360,
                maxWidth: "85vw",
                borderRadius: 14,
                border: "1px solid #dbe3ef",
                background: "#ffffff",
                boxShadow: "0 18px 32px rgba(15, 23, 42, 0.2)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
                Consultas Equifax pendientes
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 12, color: "#64748b" }}>No hay pendientes.</div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={`equifax-notification-${item.id}`}
                      type="button"
                      onClick={() => onOpenNotification?.(item)}
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: "#ffffff",
                        textAlign: "left",
                        padding: "10px 12px",
                        cursor: "pointer",
                        display: "grid",
                        gap: 2,
                      }}
                    >
                      <strong>{item.queryFullName}</strong>
                      <span style={{ fontSize: 13, color: "#475569" }}>Cedula: {item.queryNationalId}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          style={{ ...buttonStyle, minWidth: 196, minHeight: 52, borderRadius: 16, fontSize: 20 }}
          type="button"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Cerrando..." : "Cerrar sesion"}
        </button>
      </div>
    </section>
  );
}
