import { cardStyle, sectionTitleStyle } from "./styles";

function SummaryIcon({ name }) {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: "false",
  };

  if (name === "users") {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "device") {
    return (
      <svg {...commonProps}>
        <rect width="10" height="18" x="7" y="3" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
      <path d="M7 15h.01" />
      <path d="M11 15h2" />
    </svg>
  );
}

export default function SummaryCards({
  customersCount,
  devicesCount,
  paymentsCount,
  activeSection,
  onSelectSection,
}) {
  const items = [
    {
      key: "customers",
      label: "Clientes",
      value: customersCount,
      icon: "users",
      style: {
        border: "1px solid rgba(59, 130, 246, 0.28)",
        background: "linear-gradient(180deg, #ffffff, #f8fbff)",
        color: "#1e3a8a",
      },
    },
    {
      key: "devices",
      label: "Dispositivos",
      value: devicesCount,
      icon: "device",
      style: {
        border: "1px solid rgba(34, 197, 94, 0.28)",
        background: "linear-gradient(180deg, #ffffff, #f7fff9)",
        color: "#166534",
      },
    },
    {
      key: "payments",
      label: "Pagos",
      value: paymentsCount,
      icon: "payment",
      style: {
        border: "1px solid rgba(245, 158, 11, 0.35)",
        background: "linear-gradient(180deg, #ffffff, #fffaf5)",
        color: "#92400e",
      },
    },
  ];

  return (
    <section style={{ ...cardStyle, borderRadius: 28 }}>
      <h2 style={sectionTitleStyle}>Resumen</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectSection?.(item.key)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderRadius: 18,
              padding: "16px 18px",
              boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
              transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
              transform: activeSection === item.key ? "translateY(-1px)" : "none",
              borderColor: activeSection === item.key ? "rgba(37, 99, 235, 0.6)" : undefined,
              boxSizing: "border-box",
              ...item.style,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, opacity: 0.8 }}>
                {item.label}
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                <SummaryIcon name={item.icon} />
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{item.value}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
