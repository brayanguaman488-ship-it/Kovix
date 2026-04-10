import BrandLogo from "../components/BrandLogo";

export default function Home() {
  return (
    <main className="landingScene">
      <div className="orb orbA" />
      <div className="orb orbB" />

      <section className="landingCard">
        <div className="logoFrame">
          <BrandLogo variant="shield" height={96} maxWidth={96} alt="KOVIX Shield" />
        </div>
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

        .landingCard {
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
          justify-items: start;
          animation: rise 0.8s ease-out;
        }

        .logoFrame {
          padding: 12px;
          border-radius: 22px;
          border: 1px solid rgba(14, 165, 233, 0.4);
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(59, 130, 246, 0.12));
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
      `}</style>
    </main>
  );
}
