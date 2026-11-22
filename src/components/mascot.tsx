"use client";

export type MascotMood = "splash" | "train" | "rest" | "fast" | "celebrate" | "guide";

export default function Mascot({
  mood = "guide",
  size = 88,
  className = "",
  label = "Mascota de KetoFit",
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
  label?: string;
}) {
  const showBand = mood === "train" || mood === "splash";
  const showDumbbell = mood === "train" || mood === "splash";
  const showSparkles = mood === "celebrate" || mood === "splash";
  const isResting = mood === "rest";
  const isFasting = mood === "fast";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      role="img"
      aria-label={label}
      className={`ketofit-mascot mood-${mood} ${className}`.trim()}
    >
      <defs>
        <linearGradient id="kf-skin" x1="80" y1="22" x2="80" y2="146" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#356847" />
          <stop offset="100%" stopColor="#1e442f" />
        </linearGradient>
        <linearGradient id="kf-flesh" x1="80" y1="32" x2="80" y2="136" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e5f0c7" />
          <stop offset="72%" stopColor="#cde09e" />
          <stop offset="100%" stopColor="#b0cc79" />
        </linearGradient>
        <radialGradient id="kf-pit" cx="42%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#be875b" />
          <stop offset="65%" stopColor="#8d5c38" />
          <stop offset="100%" stopColor="#6a4224" />
        </radialGradient>
        <radialGradient id="kf-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c8db9e" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#c8db9e" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="80" cy="147" rx="34" ry="6" fill="#0d2219" fillOpacity="0.22" className="mascot-shadow" />

      {/* Subtle aura for splash / fast / celebrate */}
      {(mood === "splash" || isFasting || mood === "celebrate") && (
        <circle cx="80" cy="86" r="66" fill="url(#kf-aura)" className="mascot-aura" />
      )}

      {/* Main animated body group */}
      <g className="mascot-body">
        {/* Top sprout leaf */}
        <g className="mascot-leaf">
          <path
            d="M80 28 C80 18 83 12 88 10"
            stroke="#5a8f4f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M83 18 C92 9 104 11 102 21 C98 27 88 26 83 18 Z"
            fill="#88b96a"
            stroke="#2a5637"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M78 21 C69 13 60 16 63 24 C67 28 74 26 78 21 Z"
            fill="#6fa557"
            stroke="#2a5637"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* Left arm */}
        <path
          d={
            mood === "celebrate"
              ? "M44 86 C30 76 26 64 31 55"
              : isResting
                ? "M44 92 C36 98 37 107 45 110"
                : "M44 90 C33 93 29 101 34 107"
          }
          stroke="#254f36"
          strokeWidth="6.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right arm (+ optional dumbbell) */}
        <g className={showDumbbell ? "mascot-arm-lift" : ""}>
          <path
            d={
              showDumbbell
                ? "M116 88 C128 84 134 74 132 63"
                : mood === "celebrate"
                  ? "M116 86 C130 76 134 64 129 55"
                  : isResting
                    ? "M116 92 C124 98 123 107 115 110"
                    : "M116 88 C127 82 132 74 128 66"
            }
            stroke="#254f36"
            strokeWidth="6.5"
            strokeLinecap="round"
            fill="none"
          />
          {showDumbbell && (
            <g transform="translate(132 58) rotate(-18)">
              <rect x="-13" y="-2.5" width="26" height="5" rx="2.5" fill="#d9e5c8" stroke="#16382e" strokeWidth="1.8" />
              <rect x="-17" y="-8" width="6.5" height="16" rx="3" fill="#44724a" stroke="#16382e" strokeWidth="1.8" />
              <rect x="10.5" y="-8" width="6.5" height="16" rx="3" fill="#44724a" stroke="#16382e" strokeWidth="1.8" />
            </g>
          )}
        </g>

        {/* Feet */}
        <path d="M67 136 L65 144" stroke="#1e442f" strokeWidth="6" strokeLinecap="round" />
        <path d="M93 136 L95 144" stroke="#1e442f" strokeWidth="6" strokeLinecap="round" />

        {/* Avocado outer skin */}
        <path
          d="M80 26 C100 26 111 45 116 66 C122 89 124 114 111 129 C102 139 91 142 80 142 C69 142 58 139 49 129 C36 114 38 89 44 66 C49 45 60 26 80 26 Z"
          fill="url(#kf-skin)"
        />

        {/* Avocado inner flesh */}
        <path
          d="M80 34 C96 34 105 50 109 68 C114 88 116 110 105 123 C98 131 89 134 80 134 C71 134 62 131 55 123 C44 110 46 88 51 68 C55 50 64 34 80 34 Z"
          fill="url(#kf-flesh)"
        />

        {/* Athletic headband for train / splash */}
        {showBand && (
          <g>
            <path
              d="M52 54 Q80 46 108 54 L106 62 Q80 55 54 62 Z"
              fill="#16382e"
            />
            <path
              d="M53.5 58 Q80 51 106.5 58"
              stroke="#c8db9e"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Warm avocado pit (belly) */}
        <ellipse cx="80" cy="108" rx="19" ry="20" fill="url(#kf-pit)" />
        <ellipse
          cx="73"
          cy="100"
          rx="5.5"
          ry="8"
          transform="rotate(-22 73 100)"
          fill="#d9aa82"
          fillOpacity="0.45"
        />

        {/* Face */}
        <g className="mascot-face">
          {/* Cheeks */}
          <ellipse cx="61" cy="78" rx="5.5" ry="3.2" fill="#df8f78" fillOpacity="0.42" />
          <ellipse cx="99" cy="78" rx="5.5" ry="3.2" fill="#df8f78" fillOpacity="0.42" />

          {/* Eyes */}
          {isResting || isFasting ? (
            <>
              <path d="M62 72 Q67 66 72 72" stroke="#16382e" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M88 72 Q93 66 98 72" stroke="#16382e" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <g className="mascot-eyes">
              <circle cx="67" cy="71" r="4.6" fill="#16382e" />
              <circle cx="93" cy="71" r="4.6" fill="#16382e" />
              <circle cx="68.6" cy="69.4" r="1.6" fill="#ffffff" />
              <circle cx="94.6" cy="69.4" r="1.6" fill="#ffffff" />
            </g>
          )}

          {/* Mouth */}
          {mood === "celebrate" ? (
            <path
              d="M72 78 Q80 88 88 78 Z"
              fill="#16382e"
              stroke="#16382e"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          ) : isResting || isFasting ? (
            <path d="M74 79 Q80 84 86 79" stroke="#16382e" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M73 78 Q80 85 87 78" stroke="#16382e" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          )}
        </g>

        {/* Resting Zzz micro-accent */}
        {isResting && (
          <g fill="#c8db9e" fontSize="11" fontWeight="700" className="mascot-zzz">
            <text x="118" y="46">z</text>
            <text x="126" y="36" fontSize="13">Z</text>
          </g>
        )}

        {/* Celebration / splash sparkles */}
        {showSparkles && (
          <g fill="#d7e8b2" className="mascot-sparkles">
            <path d="M29 42 L31.5 36 L34 42 L40 44.5 L34 47 L31.5 53 L29 47 L23 44.5 Z" />
            <path d="M128 31 L129.8 27 L131.6 31 L135.6 32.8 L131.6 34.6 L129.8 38.6 L128 34.6 L124 32.8 Z" />
          </g>
        )}
      </g>
    </svg>
  );
}
