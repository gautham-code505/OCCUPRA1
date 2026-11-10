import React from 'react';

export type RobotMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'sad';

/**
 * "Occy" — the Smart Planner's little robot.
 *  idle      → hops now and then, blinks
 *  listening → antenna glows, sound waves, mouth open
 *  thinking  → keeps jumping while a thought cloud with a magnifier rises from its head
 *  happy     → big jump with sparkles when the plan is ready
 *  sad       → droops when something went wrong
 */
export const PlannerRobot: React.FC<{ mood: RobotMood; size?: number }> = ({ mood, size = 120 }) => {
  return (
    <div className={`occy occy--${mood}`} style={{ width: size, height: size * 1.25 }} aria-hidden="true">
      <style>{CSS}</style>
      <svg viewBox="0 0 120 150" width="100%" height="100%" overflow="visible">
        {/* Thought cloud (thinking) */}
        <g className="occy-cloud">
          <circle className="occy-puff occy-puff1" cx="78" cy="30" r="3.5" />
          <circle className="occy-puff occy-puff2" cx="86" cy="20" r="5" />
          <g className="occy-bubble">
            <ellipse cx="100" cy="2" rx="22" ry="15" />
            <circle cx="86" cy="0" r="9" />
            <circle cx="112" cy="-2" r="10" />
            <circle cx="100" cy="-9" r="10" />
            {/* magnifier scanning inside the cloud */}
            <g className="occy-magnifier">
              <circle cx="97" cy="0" r="5" fill="none" strokeWidth="2.2" />
              <line x1="100.5" y1="3.5" x2="105" y2="8" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* Sound waves (listening) */}
        <g className="occy-waves" fill="none" strokeLinecap="round" strokeWidth="2.5">
          <path className="occy-wave1" d="M18 58 q-6 8 0 16" />
          <path className="occy-wave2" d="M11 54 q-9 12 0 24" />
          <path className="occy-wave1" d="M102 58 q6 8 0 16" />
          <path className="occy-wave2" d="M109 54 q9 12 0 24" />
        </g>

        {/* Sparkles (happy) */}
        <g className="occy-sparkles">
          <path d="M14 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <path d="M104 40 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" />
          <path d="M22 100 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" />
        </g>

        {/* Ground shadow */}
        <ellipse className="occy-shadow" cx="60" cy="144" rx="26" ry="4.5" />

        <g className="occy-body">
          {/* Antenna */}
          <line x1="60" y1="30" x2="60" y2="18" className="occy-stroke" strokeWidth="3" strokeLinecap="round" />
          <circle className="occy-bulb" cx="60" cy="15" r="5" />

          {/* Head */}
          <rect x="28" y="30" width="64" height="50" rx="18" className="occy-head" />
          <rect x="36" y="38" width="48" height="34" rx="12" className="occy-screen" />
          {/* Eyes */}
          <g className="occy-eyes">
            <ellipse className="occy-eye" cx="50" cy="54" rx="5" ry="6" />
            <ellipse className="occy-eye" cx="70" cy="54" rx="5" ry="6" />
            <circle className="occy-glint" cx="52" cy="51.5" r="1.6" />
            <circle className="occy-glint" cx="72" cy="51.5" r="1.6" />
          </g>
          {/* Mouth variants */}
          <path className="occy-mouth occy-mouth--smile" d="M53 64 q7 6 14 0" fill="none" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse className="occy-mouth occy-mouth--o" cx="60" cy="65" rx="3.5" ry="3" />
          <path className="occy-mouth occy-mouth--sad" d="M53 67 q7 -5 14 0" fill="none" strokeWidth="2.5" strokeLinecap="round" />
          <line className="occy-mouth occy-mouth--flat" x1="54" y1="65" x2="66" y2="65" strokeWidth="2.5" strokeLinecap="round" />
          {/* Cheeks */}
          <circle className="occy-cheek" cx="42" cy="63" r="3" />
          <circle className="occy-cheek" cx="78" cy="63" r="3" />
          {/* Ears */}
          <rect x="22" y="46" width="7" height="16" rx="3.5" className="occy-ear" />
          <rect x="91" y="46" width="7" height="16" rx="3.5" className="occy-ear" />

          {/* Body */}
          <rect x="38" y="84" width="44" height="38" rx="14" className="occy-torso" />
          <circle cx="60" cy="100" r="6" className="occy-heart" />
          {/* Arms */}
          <g className="occy-arm occy-arm--l"><rect x="26" y="88" width="10" height="24" rx="5" className="occy-limb" /></g>
          <g className="occy-arm occy-arm--r"><rect x="84" y="88" width="10" height="24" rx="5" className="occy-limb" /></g>
          {/* Legs */}
          <rect x="45" y="121" width="11" height="15" rx="5" className="occy-limb" />
          <rect x="64" y="121" width="11" height="15" rx="5" className="occy-limb" />
        </g>
      </svg>
    </div>
  );
};

const CSS = `
.occy { position: relative; display: inline-block; }
.occy svg { overflow: visible; }
.occy-head, .occy-torso { fill: #e2f4ff; stroke: #38bdf8; stroke-width: 2.5; }
.occy-screen { fill: #0b1530; }
.occy-eye { fill: #22d3ee; transform-box: fill-box; transform-origin: center; animation: occy-blink 4s infinite; }
.occy-glint { fill: #fff; }
.occy-mouth { stroke: #22d3ee; fill: none; opacity: 0; }
.occy-mouth--o { fill: #22d3ee; stroke: none; }
.occy-cheek { fill: #f472b6; opacity: .55; }
.occy-ear, .occy-limb { fill: #7dd3fc; }
.occy-stroke { stroke: #38bdf8; }
.occy-heart { fill: #38bdf8; animation: occy-heartbeat 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.occy-bulb { fill: #fbbf24; transform-box: fill-box; transform-origin: center; }
.occy-shadow { fill: rgba(56,189,248,.18); transform-box: fill-box; transform-origin: center; }
.occy-body { transform-box: fill-box; transform-origin: 50% 100%; }
.occy-arm { transform-box: fill-box; transform-origin: 50% 10%; }
.occy-cloud, .occy-waves, .occy-sparkles { opacity: 0; }
.occy-bubble ellipse, .occy-bubble circle:not(.occy-magnifier circle), .occy-puff { fill: #f1f5f9; stroke: #94a3b8; stroke-width: 1.2; }
.occy-magnifier circle, .occy-magnifier line { stroke: #6366f1; }
.occy-waves path { stroke: #22d3ee; }
.occy-sparkles path { fill: #fbbf24; }

/* idle: a cheerful hop every few seconds */
.occy--idle .occy-body { animation: occy-hop 2.8s ease-in-out infinite; }
.occy--idle .occy-shadow { animation: occy-shadow 2.8s ease-in-out infinite; }
.occy--idle .occy-mouth--smile { opacity: 1; }
.occy--idle .occy-arm--r { animation: occy-wave 2.8s ease-in-out infinite; }

/* listening: glowing antenna, sound waves, open mouth */
.occy--listening .occy-waves { opacity: 1; }
.occy--listening .occy-wave1 { animation: occy-wavefade 1s ease-in-out infinite; }
.occy--listening .occy-wave2 { animation: occy-wavefade 1s ease-in-out .25s infinite; }
.occy--listening .occy-bulb { fill: #f43f5e; animation: occy-pulse .8s ease-in-out infinite; }
.occy--listening .occy-mouth--o { opacity: 1; animation: occy-talk .5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.occy--listening .occy-body { animation: occy-sway 1.6s ease-in-out infinite; }

/* thinking: keeps jumping while a thought cloud rises and a magnifier searches */
.occy--thinking .occy-body { animation: occy-jump .9s cubic-bezier(.3,.7,.4,1) infinite; }
.occy--thinking .occy-shadow { animation: occy-shadow .9s cubic-bezier(.3,.7,.4,1) infinite; }
.occy--thinking .occy-cloud { opacity: 1; }
.occy--thinking .occy-puff1 { animation: occy-pop 1.8s ease-in-out infinite; }
.occy--thinking .occy-puff2 { animation: occy-pop 1.8s ease-in-out .3s infinite; }
.occy--thinking .occy-bubble { animation: occy-float 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.occy--thinking .occy-magnifier { animation: occy-search 1.4s ease-in-out infinite; }
.occy--thinking .occy-eyes { transform: translate(3px,-3px); transition: transform .3s; }
.occy--thinking .occy-mouth--flat { opacity: 1; }
.occy--thinking .occy-bulb { animation: occy-pulse .6s ease-in-out infinite; }
.occy--thinking .occy-arm--l { animation: occy-flap .45s ease-in-out infinite alternate; }
.occy--thinking .occy-arm--r { animation: occy-flap .45s ease-in-out .2s infinite alternate; }

/* happy: big jump with sparkles */
.occy--happy .occy-body { animation: occy-bigjump .8s cubic-bezier(.3,.7,.4,1) 2; }
.occy--happy .occy-shadow { animation: occy-shadow .8s cubic-bezier(.3,.7,.4,1) 2; }
.occy--happy .occy-sparkles { opacity: 1; animation: occy-twinkle .8s ease-in-out infinite; }
.occy--happy .occy-mouth--smile { opacity: 1; }
.occy--happy .occy-eye { animation: none; transform: scaleY(.45); }
.occy--happy .occy-bulb { fill: #34d399; }
.occy--happy .occy-arm--l, .occy--happy .occy-arm--r { animation: occy-cheer .4s ease-in-out 4 alternate; }

/* sad: droop */
.occy--sad .occy-body { transform: translateY(4px) rotate(-4deg); transition: transform .4s; }
.occy--sad .occy-mouth--sad { opacity: 1; }
.occy--sad .occy-bulb { fill: #64748b; }

@keyframes occy-blink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
@keyframes occy-heartbeat { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25); } }
@keyframes occy-hop { 0%,60%,100% { transform: translateY(0) scale(1,1); } 66% { transform: translateY(2px) scale(1.06,.94); } 76% { transform: translateY(-14px) scale(.96,1.05); } 86% { transform: translateY(0) scale(1.04,.96); } }
@keyframes occy-jump { 0%,100% { transform: translateY(0) scale(1.05,.95); } 45% { transform: translateY(-20px) scale(.96,1.05); } }
@keyframes occy-bigjump { 0%,100% { transform: translateY(0) scale(1.06,.94) rotate(0); } 50% { transform: translateY(-32px) scale(.95,1.06) rotate(-8deg); } }
@keyframes occy-shadow { 0%,60%,100% { transform: scale(1); opacity: 1; } 45%,76% { transform: scale(.6); opacity: .5; } }
@keyframes occy-sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@keyframes occy-wave { 0%,60%,100% { transform: rotate(0); } 70% { transform: rotate(-35deg); } 80% { transform: rotate(-10deg); } 90% { transform: rotate(-35deg); } }
@keyframes occy-flap { from { transform: rotate(12deg); } to { transform: rotate(-24deg); } }
@keyframes occy-cheer { from { transform: rotate(0); } to { transform: rotate(-150deg); } }
@keyframes occy-pulse { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); } 50% { transform: scale(1.35); filter: drop-shadow(0 0 5px currentColor); } }
@keyframes occy-talk { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.4); } }
@keyframes occy-wavefade { 0%,100% { opacity: .15; } 50% { opacity: 1; } }
@keyframes occy-pop { 0%,100% { opacity: .3; transform: translateY(2px); } 50% { opacity: 1; transform: translateY(-2px); } }
@keyframes occy-float { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-4px) scale(1.04); } }
@keyframes occy-search { 0% { transform: translate(-7px,0); } 25% { transform: translate(5px,-3px); } 50% { transform: translate(8px,2px); } 75% { transform: translate(-3px,3px); } 100% { transform: translate(-7px,0); } }
@keyframes occy-twinkle { 0%,100% { opacity: .4; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .occy *, .occy { animation-duration: 0s !important; animation-iteration-count: 1 !important; }
}
`;
