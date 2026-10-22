// An illustrated "postcard" for the Willmar, Minnesota chapter (no photo from there):
// lakes at dusk — pines, a lake, a water tower — with the co-op's world in it:
// a cold-chain truck on the road and a planning dashboard glowing in a window.

export default function WillmarArt() {
  return (
    <svg className="willmar-art" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of Willmar, Minnesota — the Land of 10,000 Lakes: a lake at dusk with pine trees, a water tower, and a refrigerated truck on the road">
      <defs>
        <linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1423" />
          <stop offset=".45" stopColor="#1F3354" />
          <stop offset=".72" stopColor="#8C5A4A" />
          <stop offset=".86" stopColor="#E2A86B" />
        </linearGradient>
        <linearGradient id="wm-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C98E5E" stopOpacity=".55" />
          <stop offset=".5" stopColor="#24375A" />
          <stop offset="1" stopColor="#0B1423" />
        </linearGradient>
        <radialGradient id="wm-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFE6B8" />
          <stop offset=".5" stopColor="#F2B878" stopOpacity=".6" />
          <stop offset="1" stopColor="#F2B878" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="600" fill="url(#wm-sky)" />
      {/* stars */}
      {[[40, 40], [92, 86], [150, 30], [230, 64], [300, 26], [352, 92], [270, 130], [60, 150], [190, 120]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.5} fill="#F4F0E8" opacity=".7">
          <animate attributeName="opacity" values=".2;.9;.2" dur={`${3 + (i % 4)}s`} begin={`${i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* setting sun */}
      <circle cx="250" cy="352" r="90" fill="url(#wm-sun)" />
      <circle cx="250" cy="352" r="26" fill="#FFE3B0" opacity=".95" />

      {/* distant prairie and treeline */}
      <path d="M0 340 C80 326 160 336 240 330 S360 320 400 328 V372 H0Z" fill="#3A2F3B" />
      <path d="M0 362 L0 346 l10 -14 l8 14 l9 -20 l9 20 l8 -12 l8 12 l12 -24 l10 24 l9 -16 l9 16 l10 -10 l10 10 L130 362Z" fill="#20202E" />
      <path d="M300 362 l10 -18 l9 18 l8 -26 l9 26 l9 -14 l9 14 l11 -22 l10 22 l9 -12 l8 12 L400 362Z" fill="#20202E" />

      {/* water tower */}
      <g fill="#1A1C2A">
        <rect x="140" y="270" width="3" height="80" transform="rotate(-6 141 310)" />
        <rect x="167" y="270" width="3" height="80" transform="rotate(6 168 310)" />
        <rect x="153" y="275" width="3" height="78" />
        <path d="M133 276 h44 v-6 q0 -24 -22 -26 q-22 2 -22 26z" />
        <rect x="134" y="286" width="42" height="2" />
      </g>
      <text x="155" y="266" textAnchor="middle" fill="#E2CDA4" fontSize="7" fontWeight="700" letterSpacing="1.5" fontFamily="var(--font-sans), sans-serif">WILLMAR</text>

      {/* lake with reflections */}
      <rect y="360" width="400" height="120" fill="url(#wm-lake)" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={250 - 50 + i * 6 - (i % 2) * 20} y={370 + i * 13} width={100 - i * 10} height="2" rx="1" fill="#FFE3B0" opacity={0.5 - i * 0.06}>
          <animate attributeName="x" values={`${200 + i * 5};${212 + i * 5};${200 + i * 5}`} dur={`${4 + i * 0.5}s`} repeatCount="indefinite" />
        </rect>
      ))}

      {/* shore, road, pines */}
      <path d="M0 470 C90 456 170 470 260 462 S360 452 400 458 V600 H0Z" fill="#0F1624" />
      <path d="M0 520 C120 506 260 530 400 512" stroke="#2B3446" strokeWidth="22" fill="none" />
      <path d="M0 520 C120 506 260 530 400 512" stroke="#C5A572" strokeWidth="1.2" strokeDasharray="10 12" fill="none" opacity=".6" />
      {[[18, 470, 1.2], [56, 482, .9], [330, 462, 1.1], [372, 474, 1.35]].map(([x, y, s], i) => (
        <path key={i} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -70 L14 -40 H6 L20 -14 H8 L24 12 H-24 L-8 -14 H-20 L-6 -40 H-14Z M-3 12 h6 v10 h-6z" fill="#0A111C" />
      ))}

      {/* cold-chain truck driving the road */}
      <g>
        <animateMotion dur="14s" repeatCount="indefinite" path="M-70 512 C120 498 260 522 470 504" />
        <g transform="translate(0 -14)">
          <rect x="-26" y="-11" width="34" height="18" rx="2" fill="#F4F0E8" />
          <path d="M-20 -3 l4 4 m0 -4 l-4 4 M-18 -5 v8" stroke="#3A6EA5" strokeWidth="1.4" />
          <path d="M8 -6 h9 l6 7 v6 H8Z" fill="#C5A572" />
          <rect x="11" y="-4" width="6" height="5" rx="1" fill="#1F3354" />
          <circle cx="-16" cy="8" r="3.6" fill="#0B1423" stroke="#A8A8A2" />
          <circle cx="14" cy="8" r="3.6" fill="#0B1423" stroke="#A8A8A2" />
          <circle cx="24" cy="2" r="1.6" fill="#FFE3B0">
            <animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>

      {/* the co-op: an office with a planning dashboard in the window */}
      <g transform="translate(250 418)">
        <rect x="0" y="0" width="90" height="46" fill="#141C2B" stroke="#2B3446" />
        <path d="M-4 0 L45 -18 L94 0Z" fill="#1A2233" />
        <rect x="10" y="12" width="34" height="22" rx="2" fill="#0B1423" stroke="#C5A57288" />
        <path d="M13 30 l6 -6 5 3 6 -8 6 4 5 -7" stroke="#E2CDA4" strokeWidth="1.3" fill="none" />
        <rect x="52" y="12" width="12" height="12" fill="#F2B87866" />
        <rect x="68" y="12" width="12" height="12" fill="#F2B87844" />
        <rect x="58" y="30" width="16" height="16" fill="#0B1423" />
      </g>

      {/* postcard label */}
      <g transform="translate(24 560)">
        <text fill="#F4F0E8" fontSize="22" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic">Willmar, Minnesota</text>
        <text y="18" fill="#C5A572" fontSize="8" fontWeight="600" letterSpacing="2" fontFamily="var(--font-sans), sans-serif">LAND OF 10,000 LAKES · JAN — AUG 2026</text>
      </g>
    </svg>
  );
}
