import { useState } from "react";

import { api } from "../lib/api";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const data = await api.login({ username, password });

      if (data.ok) {
        setMessage("Login correcto");
        window.location.replace("/dashboard");
      }
    } catch (error) {
      setMessage(error.message || "Error de conexion con el servidor");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 22,
          padding: 24,
          border: "1px solid var(--line)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.14)",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <BrandLogo variant="shield" height={78} maxWidth={78} alt="KOVIX Shield" />
          <p
            style={{
              margin: "12px 0 0",
              color: "#1e3a8a",
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1.2,
              fontWeight: 700,
            }}
          >
            KOVIX Platform
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>Panel KOVIX</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-soft)" }}>
            Ingresa con tu usuario y contrasena administrativa.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={{
              width: "100%",
              padding: "12px 13px",
              borderRadius: 10,
              border: "1px solid var(--line-soft)",
            }}
          />

          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{
              width: "100%",
              padding: "12px 13px",
              borderRadius: 10,
              border: "1px solid var(--line-soft)",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #1d4ed8",
              background: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Ingresar
          </button>
        </form>

        {message && (
          <p
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1e3a8a",
            }}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
