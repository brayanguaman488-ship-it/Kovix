import { useState } from "react";

import { api } from "../lib/api";

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
    <main style={{ padding: 40, fontFamily: "Arial, sans-serif", maxWidth: 420 }}>
      <h1>Login</h1>
      <p>Ingresa con tu usuario y contrasena administrativa.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />

        <input
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />

        <button type="submit" style={{ padding: 12 }}>
          Ingresar
        </button>
      </form>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  );
}
