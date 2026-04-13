'use client'

/**
 * FruitFallback — CSS-only animated background.
 *
 * Shown when:
 *  - WebGL is not supported
 *  - Three.js fails to load
 *  - SSR (before hydration)
 *
 * Uses pure CSS keyframe animations — zero JS, zero GPU.
 * Achieves a premium "soft gradient blob" effect.
 */

export default function FruitFallback() {
  return (
    <div className="fruit-fallback-root" aria-hidden="true">

      {/* Base gradient — warm fruit palette */}
      <div className="fruit-fallback-base" />

      {/* Animated blobs */}
      <div className="fruit-blob blob-1" />
      <div className="fruit-blob blob-2" />
      <div className="fruit-blob blob-3" />
      <div className="fruit-blob blob-4" />
      <div className="fruit-blob blob-5" />

      {/* Noise texture overlay for depth */}
      <div className="fruit-noise" />

      <style>{`
        .fruit-fallback-root {
          position: fixed;
          inset: 0;
          z-index: -10;
          overflow: hidden;
        }

        .fruit-fallback-base {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            #fff8f0 0%,
            #fde8cb 25%,
            #ffe0e0 50%,
            #fdf0ff 75%,
            #e8fff0 100%
          );
        }

        /* ── Blobs ── */
        .fruit-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.55;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }

        .blob-1 {
          width: 600px; height: 600px;
          top: -150px; left: -100px;
          background: radial-gradient(circle, #FF8C00 0%, #FF6347 60%, transparent 100%);
          animation: blob-drift-1 12s infinite alternate ease-in-out;
        }
        .blob-2 {
          width: 500px; height: 500px;
          top: 30%; right: -80px;
          background: radial-gradient(circle, #FF3B5C 0%, #C1121F 60%, transparent 100%);
          animation: blob-drift-2 15s infinite alternate ease-in-out;
          opacity: 0.4;
        }
        .blob-3 {
          width: 700px; height: 700px;
          bottom: -200px; left: 20%;
          background: radial-gradient(circle, #FFB703 0%, #FF8C00 50%, transparent 100%);
          animation: blob-drift-3 18s infinite alternate ease-in-out;
          opacity: 0.5;
        }
        .blob-4 {
          width: 400px; height: 400px;
          top: 10%; left: 40%;
          background: radial-gradient(circle, #9B2226 0%, #6A0572 60%, transparent 100%);
          animation: blob-drift-4 10s infinite alternate ease-in-out;
          opacity: 0.25;
        }
        .blob-5 {
          width: 450px; height: 450px;
          bottom: 5%; right: 5%;
          background: radial-gradient(circle, #70D44B 0%, #52B788 60%, transparent 100%);
          animation: blob-drift-5 14s infinite alternate ease-in-out;
          opacity: 0.35;
        }

        /* Noise gives depth — renders well even without SVG support */
        .fruit-noise {
          position: absolute;
          inset: 0;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 256px;
        }

        @keyframes blob-drift-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(80px, 60px) scale(1.12); }
        }
        @keyframes blob-drift-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-60px, 80px) scale(1.08); }
        }
        @keyframes blob-drift-3 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(100px, -60px) scale(1.15); }
        }
        @keyframes blob-drift-4 {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
          100% { transform: translate(-40px, 50px) scale(1.1) rotate(20deg); }
        }
        @keyframes blob-drift-5 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-70px, -40px) scale(1.05); }
        }

        @media (max-width: 640px) {
          .fruit-blob { filter: blur(50px); }
          .blob-1 { width: 350px; height: 350px; }
          .blob-3 { width: 400px; height: 400px; }
        }
      `}</style>
    </div>
  )
}
