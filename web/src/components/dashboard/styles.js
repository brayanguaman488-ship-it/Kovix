export const pageShellStyle = {
  padding: "32px 20px 42px",
  display: "grid",
  gap: 24,
  minHeight: "100vh",
  maxWidth: 1280,
  margin: "0 auto",
};

export const cardStyle = {
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: 20,
  background: "var(--panel)",
  backdropFilter: "blur(7px)",
  boxShadow: "0 22px 46px rgba(15, 23, 42, 0.12)",
};

export const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 14,
  fontSize: 21,
  letterSpacing: 0.2,
  color: "var(--text-main)",
};

export const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid var(--line-soft)",
  borderRadius: 10,
  color: "var(--text-main)",
  background: "#ffffff",
  outline: "none",
};

export const buttonStyle = {
  padding: "11px 15px",
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)",
  color: "#f8fafc",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(30, 58, 138, 0.3)",
};

export const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "#f8fafc",
  color: "var(--text-main)",
  fontWeight: 600,
  cursor: "pointer",
};

export const listItemStyle = {
  border: "1px solid var(--line-soft)",
  borderRadius: 12,
  padding: 12,
  background: "var(--panel-soft)",
};

export const paginationRowStyle = {
  display: "flex",
  gap: 8,
  marginTop: 14,
  alignItems: "center",
  flexWrap: "wrap",
};
