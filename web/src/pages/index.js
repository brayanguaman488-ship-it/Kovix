import BrandLogo from "../components/BrandLogo";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 760,
          border: "1px solid var(--line)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.1)",
          padding: 30,
        }}
      >
        <BrandLogo variant="shield" height={82} maxWidth={82} alt="KOVIX Shield" />
        <p style={{ marginTop: 10, color: "var(--text-soft)", fontSize: 17 }}>
          Panel administrativo para telefonos vendidos a credito.
        </p>
        <p style={{ marginBottom: 0 }}>
          Ruta recomendada para iniciar: <a href="/login">/login</a>
        </p>
      </section>
    </main>
  );
}
