import BrandLogo from "../components/BrandLogo";

export default function Home() {
  return (
    <main className="landingScene">
      <div className="orb orbA" />
      <div className="orb orbB" />
      <div className="wormShell" aria-hidden="true">
        <svg className="wormSvg" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wormGradHome" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(14, 165, 233, 0)" />
              <stop offset="35%" stopColor="rgba(125, 211, 252, 0.96)" />
              <stop offset="70%" stopColor="rgba(56, 189, 248, 0.92)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>
          <path
            className="trailBase"
            d="M-140 700 C 100 590, 300 770, 520 650 C 760 520, 940 690, 1180 540 C 1340 440, 1460 530, 1580 440"
          />
          <path
            className="trailGlow"
            d="M-140 700 C 100 590, 300 770, 520 650 C 760 520, 940 690, 1180 540 C 1340 440, 1460 530, 1580 440"
          />
        </svg>
        <div className="wormHead" />
      </div>

      <div className="cornerBrand">
        <BrandLogo variant="nova" height={40} maxWidth={40} alt="KOVIX Nova Mark" />
        <span>KOVIX</span>
      </div>

      <section className="landingWrap">
        <h1>KOVIX</h1>
        <p className="lead">Plataforma inteligente para control y gestion de creditos moviles.</p>
        <a href="/login" className="entry">
          Entrar al panel
        </a>
      </section>

      <style jsx>{`
        .landingScene {
          min-height: 100vh;
          padding: 24px;
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: radial-gradient(circle at 15% 12%, #1e293b 0%, #020617 46%, #00030a 100%);
        }

        .orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(36px);
          opacity: 0.42;
          pointer-events: none;
        }

        .orbA {
          width: min(46vw, 500px);
          height: min(46vw, 500px);
          left: -10%;
          top: -10%;
          background: #0ea5e9;
          animation: driftA 11s ease-in-out infinite;
        }

        .orbB {
          width: min(44vw, 460px);
          height: min(44vw, 460px);
          right: -8%;
          bottom: -14%;
          background: #2563eb;
          animation: driftB 12s ease-in-out infinite;
        }

        .wormShell {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .wormSvg {
          width: 100%;
          height: 100%;
        }

        .trailBase {
          fill: none;
          stroke: rgba(125, 211, 252, 0.14);
          stroke-width: 2;
        }

        .trailGlow {
          fill: none;
          stroke: url(#wormGradHome);
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 1900;
          stroke-dashoffset: 1900;
          filter: drop-shadow(0 0 11px rgba(103, 232, 249, 0.68));
          animation: drawTrail 2.7s cubic-bezier(0.19, 1, 0.22, 1) forwards,
            fadeTrail 4.8s ease-out forwards;
        }

        .wormHead {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: radial-gradient(circle, #ecfeff 0%, #67e8f9 55%, rgba(56, 189, 248, 0) 100%);
          filter: blur(0.5px);
          box-shadow: 0 0 20px rgba(103, 232, 249, 0.84);
          animation: crawlTrail 2.7s cubic-bezier(0.19, 1, 0.22, 1) forwards,
            fadeTrail 4.8s ease-out forwards;
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
          letter-spacing: 1.4px;
          font-size: 0.9rem;
          text-shadow: 0 8px 20px rgba(2, 6, 23, 0.6);
          animation: revealBrand 0.7s ease-out;
        }

        .landingWrap {
          width: 100%;
          max-width: 760px;
          z-index: 1;
          border-radius: 30px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: linear-gradient(
            140deg,
            rgba(15, 23, 42, 0.78) 0%,
            rgba(30, 41, 59, 0.64) 100%
          );
          box-shadow: 0 30px 70px rgba(2, 6, 23, 0.55);
          backdrop-filter: blur(12px);
          color: #e2e8f0;
          padding: 34px;
          display: grid;
          gap: 16px;
          justify-items: center;
          text-align: center;
          animation: rise 0.8s ease-out;
          position: relative;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3.1rem);
          letter-spacing: 0.5px;
          color: #f8fafc;
        }

        .lead {
          margin: 0;
          font-size: clamp(1rem, 2.3vw, 1.2rem);
          color: #cbd5e1;
          max-width: 630px;
        }

        .entry {
          margin-top: 4px;
          text-decoration: none;
          border: 1px solid #0ea5e9;
          background: linear-gradient(135deg, #0369a1 0%, #2563eb 100%);
          color: #ffffff;
          font-weight: 700;
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 14px 28px rgba(3, 105, 161, 0.32);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .entry:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(37, 99, 235, 0.34);
        }

        @keyframes driftA {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(18px, 20px);
          }
        }

        @keyframes driftB {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-22px, -16px);
          }
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.98);
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
            transform: translate(-9%, 78%);
          }
          15% {
            opacity: 1;
          }
          32% {
            transform: translate(23%, 66%);
          }
          50% {
            transform: translate(42%, 81%);
          }
          68% {
            transform: translate(65%, 60%);
          }
          86% {
            transform: translate(84%, 73%);
          }
          100% {
            transform: translate(106%, 49%);
            opacity: 0;
          }
        }

        @keyframes fadeTrail {
          0%,
          60% {
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
