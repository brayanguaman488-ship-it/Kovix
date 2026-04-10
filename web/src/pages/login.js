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
      <div className="wormShell" aria-hidden="true">
        <svg className="wormSvg" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wormGradLogin" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
              <stop offset="30%" stopColor="rgba(125, 211, 252, 0.95)" />
              <stop offset="70%" stopColor="rgba(14, 165, 233, 0.92)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>
          <path
            className="trailBase"
            d="M-120 640 C 120 560, 300 720, 520 610 C 760 490, 950 640, 1180 520 C 1330 440, 1450 500, 1560 430"
          />
          <path
            className="trailGlow"
            d="M-120 640 C 120 560, 300 720, 520 610 C 760 490, 950 640, 1180 520 C 1330 440, 1450 500, 1560 430"
          />
        </svg>
        <div className="wormHead" />
      </div>

      <div className="cornerBrand">
        <BrandLogo variant="nova" height={42} maxWidth={42} alt="KOVIX Nova Mark" />
        <span>KOVIX</span>
      </div>

      <section className="authCardWrap">
        <div className="brandBlock">
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

        .wormShell {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .wormSvg {
          width: 100%;
          height: 100%;
        }

        .trailBase {
          fill: none;
          stroke: rgba(125, 211, 252, 0.17);
          stroke-width: 2;
        }

        .trailGlow {
          fill: none;
          stroke: url(#wormGradLogin);
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 1800;
          stroke-dashoffset: 1800;
          filter: drop-shadow(0 0 12px rgba(125, 211, 252, 0.7));
          animation: drawTrail 2.6s cubic-bezier(0.19, 1, 0.22, 1) forwards,
            fadeTrail 4.6s ease-out forwards;
        }

        .wormHead {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: radial-gradient(circle, #ecfeff 0%, #67e8f9 55%, rgba(56, 189, 248, 0) 100%);
          filter: blur(0.4px);
          box-shadow: 0 0 20px rgba(103, 232, 249, 0.8);
          animation: crawlTrail 2.6s cubic-bezier(0.19, 1, 0.22, 1) forwards,
            fadeTrail 4.6s ease-out forwards;
        }

        .cornerBrand {
          position: absolute;
          top: 22px;
          left: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 2;
          color: #dbeafe;
          font-weight: 700;
          letter-spacing: 1.5px;
          font-size: 0.92rem;
          text-shadow: 0 8px 20px rgba(2, 6, 23, 0.6);
          animation: revealBrand 0.7s ease-out;
        }

        .authCardWrap {
          position: relative;
          z-index: 3;
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

        .brandBlock h1 {
          margin: 10px 0 0;
          font-size: clamp(1.6rem, 4vw, 2rem);
          color: #0b1324;
          line-height: 1.2;
        }

        .kicker {
          margin: 0;
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

        @keyframes drawTrail {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes crawlTrail {
          0% {
            opacity: 0;
            transform: translate(-8%, 71%);
          }
          15% {
            opacity: 1;
          }
          30% {
            transform: translate(24%, 63%);
          }
          48% {
            transform: translate(41%, 76%);
          }
          66% {
            transform: translate(64%, 58%);
          }
          84% {
            transform: translate(83%, 70%);
          }
          100% {
            transform: translate(105%, 50%);
            opacity: 0;
          }
        }

        @keyframes fadeTrail {
          0%,
          58% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes revealBrand {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
