import { useId } from 'react';

/**
 * Mascote do Synapse: um filhote de veado-de-cauda-branca.
 * Desenhado em SVG vetorial para escalar sem perda e permitir animar as partes (orelhas, olho, respiração).
 * `MascotMark` é só a cabeça (logo/favicon); `MascotLying` é o corpo inteiro (intro e telas de espera).
 */

const Sparkle = ({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) => (
  <path
    className="mascot-sparkle"
    style={{ animationDelay: `${delay}s` }}
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z"
    fill="#ffe9c9"
  />
);

const SPOTS: Array<[number, number, number, number, number]> = [
  [132, 168, 6.5, 4.6, -20],
  [164, 156, 7, 5, -12],
  [198, 150, 7.5, 5, -4],
  [232, 152, 7, 5, 8],
  [262, 164, 6, 4.4, 24],
  [112, 192, 6, 4.2, -26],
  [146, 188, 7.5, 5.2, -14],
  [182, 180, 8, 5.6, -6],
  [218, 180, 7.5, 5.2, 6],
  [250, 192, 6.5, 4.6, 20],
  [128, 216, 6, 4.2, -16],
  [166, 210, 7, 4.8, -8],
  [204, 208, 7, 4.8, 2],
  [238, 216, 6, 4.2, 14],
  [286, 188, 4.6, 3.4, 30],
];

interface Ids {
  fur: string;
  furDark: string;
  belly: string;
  earIn: string;
  rim: string;
  paint: string;
  soft: string;
}

const makeIds = (uid: string): Ids => ({
  fur: `fur${uid}`,
  furDark: `furd${uid}`,
  belly: `bel${uid}`,
  earIn: `ear${uid}`,
  rim: `rim${uid}`,
  paint: `pnt${uid}`,
  soft: `sft${uid}`,
});

const Defs = ({ ids }: { ids: Ids }) => (
  <defs>
    <linearGradient id={ids.fur} x1="0.1" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor="#f6c892" />
      <stop offset="0.5" stopColor="#dca06a" />
      <stop offset="1" stopColor="#b0714a" />
    </linearGradient>
    <linearGradient id={ids.furDark} x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stopColor="#d99e68" />
      <stop offset="1" stopColor="#9d6340" />
    </linearGradient>
    <linearGradient id={ids.belly} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff4e2" />
      <stop offset="1" stopColor="#f3d3a8" />
    </linearGradient>
    <linearGradient id={ids.earIn} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffd2bd" />
      <stop offset="1" stopColor="#e8908c" />
    </linearGradient>
    <radialGradient id={ids.rim} cx="0.3" cy="0.05" r="0.9">
      <stop offset="0" stopColor="#ff7fb5" stopOpacity="0.55" />
      <stop offset="0.6" stopColor="#ff7fb5" stopOpacity="0" />
    </radialGradient>
    <filter id={ids.soft} x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" />
    </filter>
    {/* Contorno levemente irregular, como aquarela. */}
    <filter id={ids.paint} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" />
    </filter>
  </defs>
);

const Head = ({ ids }: { ids: Ids }) => (
  <g>
    {/* orelha de trás */}
    <g className="mascot-ear mascot-ear-back">
      <path d="M282 84 C250 78 224 58 218 34 C246 30 278 46 298 72 Z" fill={`url(#${ids.furDark})`} />
      <path d="M278 76 C256 70 240 56 234 42 C252 42 272 54 288 70 Z" fill={`url(#${ids.earIn})`} opacity="0.85" />
    </g>
    {/* orelha da frente */}
    <g className="mascot-ear mascot-ear-front">
      <path d="M312 68 C336 42 366 28 394 30 C392 58 362 82 328 84 Z" fill={`url(#${ids.fur})`} />
      <path d="M322 68 C340 52 360 42 380 40 C376 58 356 72 334 76 Z" fill={`url(#${ids.earIn})`} />
    </g>
    {/* cabeça */}
    <path
      d="M266 100 C264 74 288 56 316 58 C342 60 360 78 370 98 C376 112 368 124 355 126 C340 128 330 137 312 137 C286 137 268 122 266 100Z"
      fill={`url(#${ids.fur})`}
    />
    <path
      d="M266 100 C264 74 288 56 316 58 C342 60 360 78 370 98 C376 112 368 124 355 126 C340 128 330 137 312 137 C286 137 268 122 266 100Z"
      fill={`url(#${ids.rim})`}
    />
    {/* focinho claro */}
    <path
      d="M334 104 C346 98 362 98 372 104 C376 114 368 124 355 126 C344 128 336 124 332 116 Z"
      fill={`url(#${ids.belly})`}
      opacity="0.95"
    />
    <ellipse cx="370" cy="105" rx="7.5" ry="5.5" fill="#35192b" />
    <ellipse cx="368" cy="103" rx="2.4" ry="1.4" fill="#ffffff" opacity="0.5" />
    {/* bochecha */}
    <circle cx="330" cy="116" r="10" fill="#ff8aa5" opacity="0.28" />
    {/* olho */}
    <g className="mascot-eye">
      <ellipse cx="324" cy="92" rx="8.6" ry="10.4" fill="#2a1226" />
      <ellipse cx="327" cy="88" rx="3" ry="3.4" fill="#fff" />
      <circle cx="321" cy="97" r="1.5" fill="#fff" opacity="0.7" />
    </g>
    <path d="M314 83 C318 78 326 76 333 79" stroke="#2a1226" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* sardas do focinho */}
    <circle cx="350" cy="112" r="1.1" fill="#9d6340" opacity="0.7" />
    <circle cx="356" cy="115" r="1.1" fill="#9d6340" opacity="0.7" />
    <circle cx="346" cy="117" r="1.1" fill="#9d6340" opacity="0.7" />
  </g>
);

export const MascotMark = ({
  size = 40,
  className = '',
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) => {
  const ids = makeIds(useId().replace(/:/g, ''));
  return (
    <svg
      viewBox="210 14 190 136"
      width={size}
      height={(size * 136) / 190}
      className={`${animated ? 'mascot-live' : ''} ${className}`}
      overflow="visible"
      role="img"
      aria-label="Synapse"
    >
      <Defs ids={ids} />
      <g filter={`url(#${ids.paint})`}>
        <Head ids={ids} />
      </g>
    </svg>
  );
};

export const MascotLying = ({
  width = 420,
  className = '',
  animated = true,
}: {
  width?: number;
  className?: string;
  animated?: boolean;
}) => {
  const ids = makeIds(useId().replace(/:/g, ''));
  return (
    <svg
      viewBox="0 0 420 300"
      width={width}
      height={(width * 300) / 420}
      className={`${animated ? 'mascot-live' : ''} ${className}`}
      overflow="visible"
      role="img"
      aria-label="Filhote de veado-de-cauda-branca, mascote do Synapse"
    >
      <Defs ids={ids} />

      <Sparkle x={52} y={72} s={1.1} />
      <Sparkle x={376} y={188} s={0.8} delay={1.1} />
      <Sparkle x={196} y={34} s={0.7} delay={0.6} />
      <Sparkle x={26} y={176} s={0.55} delay={1.7} />

      <ellipse cx="195" cy="268" rx="165" ry="14" fill="#14072e" opacity="0.5" />

      <g filter={`url(#${ids.paint})`}>
        {/* cauda: o tufo branco que dá nome à espécie */}
        <g className="mascot-tail">
          <path d="M72 218 C50 206 42 190 46 174 C60 176 76 190 84 206 Z" fill="#fff6e8" />
          <path d="M74 214 C60 204 54 192 56 182 C64 186 74 196 80 208 Z" fill="#ffe3c2" opacity="0.8" />
        </g>

        <g className="mascot-body">
          {/* corpo */}
          <path
            d="M62 240 C48 196 84 148 150 138 C208 130 266 138 298 170 C320 192 324 226 300 246 C284 260 252 264 214 264 L108 264 C82 264 66 254 62 240Z"
            fill={`url(#${ids.fur})`}
          />
          <path
            d="M62 240 C48 196 84 148 150 138 C208 130 266 138 298 170 C320 192 324 226 300 246 C284 260 252 264 214 264 L108 264 C82 264 66 254 62 240Z"
            fill={`url(#${ids.rim})`}
          />
          {/* coxa dobrada */}
          <path
            d="M70 236 C62 204 92 176 126 180 C158 184 172 214 166 244 C162 258 130 266 100 262 C80 260 72 250 70 236Z"
            fill={`url(#${ids.furDark})`}
            opacity="0.55"
          />
          <path d="M92 192 C108 180 128 180 142 190" stroke="#fff0d6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />
          {/* barriga clara */}
          <path
            d="M120 262 C150 250 196 250 238 256 C262 260 280 258 296 246 C284 262 252 266 214 266 L128 266 Z"
            fill={`url(#${ids.belly})`}
            opacity="0.9"
          />
          {/* manchas */}
          {SPOTS.map(([x, y, rx, ry, rot]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill="#fff7ea" opacity="0.93" />
          ))}
          {/* patas dianteiras dobradas */}
          <path d="M226 246 C238 232 280 230 322 244 C334 250 334 262 322 266 L232 266 C220 264 218 254 226 246Z" fill={`url(#${ids.fur})`} />
          <path d="M226 246 C238 232 280 230 322 244 C334 250 334 262 322 266 L232 266 C220 264 218 254 226 246Z" fill={`url(#${ids.rim})`} opacity="0.4" />
          <path d="M310 246 C326 246 336 254 332 263 C324 267 312 266 306 262Z" fill="#4a2a2c" />
          <path d="M120 262 C132 256 150 256 160 262 C156 268 130 268 120 262Z" fill="#4a2a2c" />
          {/* pescoço e peito claro */}
          <path
            d="M258 178 C256 148 266 122 282 108 L338 124 C342 154 332 184 318 210 C300 222 270 208 258 178Z"
            fill={`url(#${ids.fur})`}
          />
          <ellipse cx="304" cy="186" rx="20" ry="30" transform="rotate(8 304 186)" fill={`url(#${ids.belly})`} opacity="0.8" filter={`url(#${ids.soft})`} />
        </g>

        <Head ids={ids} />
      </g>
    </svg>
  );
};
