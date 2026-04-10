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
    <main className="authScene">
      <div className="aura auraOne" />
      <div className="aura auraTwo" />
      <div className="gridLayer" />

      <section className="authCard">
        <div className="brandBlock">
          <div className="logoWrap">
            <BrandLogo variant="shield" height={84} maxWidth={84} alt="KOVIX Shield" />
          </div>
          <p className="kicker">KOVIX Security Console</p>
          <h1>Control Inteligente de Dispositivos</h1>
          <p className="subtitle">Acceso administrativo protegido para gestion operativa.</p>
        </div>

        <form onSubmit={handleSubmit} className="authForm">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button type="submit">Ingresar al panel</button>
        </form>

        {message && <p className="feedback">{message}</p>}
      </section>

      <style jsx>{`
        .authScene {
          min-height: 100vh;
          position: relative;
          display: grid;
          place-items: center;
          padding: 24px;
          overflow: hidden;
          background: radial-gradient(circle at 20% 10%, #1e3a8a 0%, #0f172a 45%, #020617 100%);
        }

        .aura {
          position: absolute;
          border-radius: 999px;
          filter: blur(28px);
          opacity: 0.45;
          pointer-events: none;
        }

        .auraOne {
          width: min(56vw, 560px);
          height: min(56vw, 560px);
          background: #0ea5e9;
          top: -8%;
          left: -10%;
          animation: floatOne 9s ease-in-out infinite;
        }

        .auraTwo {
          width: min(45vw, 460px);
          height: min(45vw, 460px);
          background: #22d3ee;
          right: -6%;
          bottom: -12%;
          animation: floatTwo 10s ease-in-out infinite;
        }

        .gridLayer {
          position: absolute;
          inset: 0;
          opacity: 0.14;
          pointer-events: none;
          background-image: linear-gradient(rgba(148, 163, 184, 0.28) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.28) 1px, transparent 1px);
          background-size: 34px 34px;
        }

        .authCard {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 520px;
          border-radius: 24px;
          padding: 28px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(241, 245, 249, 0.8) 100%
          );
          box-shadow: 0 30px 60px rgba(2, 6, 23, 0.45);
          backdrop-filter: blur(10px);
          display: grid;
          gap: 20px;
          animation: reveal 0.7s ease-out;
        }

        .logoWrap {
          width: fit-content;
          border-radius: 20px;
          padding: 10px;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1), rgba(14, 165, 233, 0.18));
          border: 1px solid rgba(14, 165, 233, 0.26);
        }

        .brandBlock h1 {
          margin: 10px 0 0;
          font-size: clamp(1.6rem, 4vw, 2rem);
          color: #0b1324;
          line-height: 1.2;
        }

        .kicker {
          margin: 12px 0 0;
          text-transform: uppercase;
          letter-spacing: 1.3px;
          font-weight: 700;
          font-size: 0.75rem;
          color: #0c4a6e;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #334155;
        }

        .authForm {
          display: grid;
          gap: 12px;
        }

        .authForm input {
          width: 100%;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          background: rgba(255, 255, 255, 0.84);
          color: #0b1324;
        }

        .authForm button {
          padding: 13px 15px;
          border-radius: 12px;
          border: 1px solid #1d4ed8;
          background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%);
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(30, 58, 138, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .authForm button:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 32px rgba(30, 58, 138, 0.34);
        }

        .feedback {
          margin: 0;
          padding: 11px 13px;
          border-radius: 12px;
          border: 1px solid #93c5fd;
          background: rgba(219, 234, 254, 0.9);
          color: #1e3a8a;
          font-weight: 500;
        }

        @keyframes floatOne {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(22px, 18px);
          }
        }

        @keyframes floatTwo {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-18px, -22px);
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </main>
  );
}
