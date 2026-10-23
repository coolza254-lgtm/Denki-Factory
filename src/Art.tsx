import { useId, useRef, type CSSProperties } from "react";
import { useMotion } from "./Motion";
export function FactoryArt({
  tier = 0,
  night = false,
  small = false,
  active,
  reduced = false,
  breeze = false,
  breezeActive = false,
  extraPanels = 0,
  windSpeed = 6,
}: {
  tier?: number;
  night?: boolean;
  small?: boolean;
  active?: boolean;
  reduced?: boolean;
  breeze?: boolean;
  breezeActive?: boolean;
  extraPanels?: number;
  windSpeed?: number;
}) {
  const id = useId();
  const element = useRef<SVGSVGElement>(null);
  const motion = useMotion(reduced, element);
  const producing = active ?? (!night || tier >= 4);
  return (
    <svg
      ref={element}
      data-producing={producing}
      className={
        "factory-art " +
        (night ? "night " : "") +
        (small ? "small " : "") +
        (producing ? "producing " : "idle ") +
        (motion ? "motion-running" : "motion-paused")
      }
      viewBox="0 0 420 270"
      role="img"
      aria-label={
        tier >= 6
          ? "โรงไฟฟ้านิวเคลียร์การ์ตูน"
          : tier === 4
            ? "ฟาร์มกังหันลมการ์ตูน"
            : "โรงไฟฟ้าการ์ตูนสองมิติ"
      }
    >
      <defs>
        <clipPath id={id}>
          <rect width="420" height="270" rx="20" />
        </clipPath>
      </defs>
      <g
        clipPath={`url(#${id})`}
        stroke="#263359"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          fill={night ? "#29395f" : "#c4e8f2"}
          stroke="none"
          d="M0 0h420v270H0z"
        />
        {night ? (
          <>
            <path
              d="M350 25a21 21 0 1 0 20 30 21 21 0 0 1-20-30"
              fill="#fff1be"
              stroke="none"
            />
            <g fill="#fff8e8" stroke="none">
              <circle cx="80" cy="40" r="2" />
              <circle cx="225" cy="70" r="2" />
              <circle cx="160" cy="20" r="2" />
            </g>
          </>
        ) : (
          <>
            <g
              className="sun-rays"
              stroke="#f4c752"
              strokeWidth="2"
              opacity=".7"
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <path
                  key={angle}
                  d="M343 18v-5"
                  transform={`rotate(${angle} 343 53)`}
                />
              ))}
            </g>
            <circle
              className="warm-sun"
              cx="343"
              cy="53"
              r="23"
              fill="#ffcc48"
              stroke="none"
            />
            <path
              className="drifting-cloud"
              d="M48 69c-8-11 2-21 14-17 2-18 26-17 29-3 14-7 24 6 19 16H48"
              fill="#fffdf7"
              stroke="none"
            />
            <path
              className="drifting-cloud far"
              d="M236 34c-5-8 1-15 10-12 3-11 18-11 21 1 8-3 18 4 14 11"
              fill="#fffdf7"
              stroke="none"
            />
          </>
        )}
        <path
          d="M-20 203Q90 170 204 190T440 187v100H-20"
          fill="#a9cd8c"
          stroke="none"
        />
        <path
          d="M-10 246Q120 219 210 237T440 223v60H-10"
          fill="#8fbd73"
          stroke="none"
        />
        <g stroke="none">
          <path d="M0 172q18-28 42-7 19-27 41 1l6 26H0" fill="#81b77d" />
          <path d="M363 166q15-30 38-12 16-17 31 3v39h-69z" fill="#81b77d" />
          <ellipse
            cx="95"
            cy="240"
            rx="79"
            ry="9"
            fill="#78a45f"
            opacity=".28"
          />
        </g>
        <path d="m276 205 135 26" stroke="#ede7c4" strokeWidth="18" />
        {tier <= 3 ? (
          <>
            <g>
              {Array.from({ length: tier === 0 ? 2 : 6 }, (_, i) => {
                const x = 24 + (i % 3) * 78,
                  y = 140 + Math.floor(i / 3) * 48;
                return (
                  <g key={i}>
                    <path
                      d={`M${x + 9} ${y + 28}v17m45-17v17`}
                      strokeWidth="4"
                    />
                    <path
                      d={`m${x} ${y + 29} 12-38 61 2-13 37z`}
                      className="solar-cell"
                      style={{ animationDelay: `${i * -0.45}s` }}
                      fill="#538eb7"
                    />
                    <path
                      d={`m${x + 9} ${y + 16} 56 1m-49-12 55 1m-37-14-11 35m31-34-10 35`}
                      stroke="#bfdfeb"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
            </g>
            <path d="M171 202q34 25 88-1" strokeWidth="7" fill="none" />
            <path
              d="M171 202q34 25 88-1"
              stroke="#f2c956"
              strokeWidth="3"
              fill="none"
            />
            <path
              className="electric-current solar-wire"
              d="M171 202q34 25 88-1"
              stroke="#fff4ae"
              strokeWidth="3.5"
              fill="none"
              strokeDasharray="4 14"
            />
          </>
        ) : null}
        {breeze && tier < 4 && (
          <g
            transform="translate(219 108)"
            className={breezeActive ? "yard-wind working" : "yard-wind resting"}
            style={
              {
                "--rotor-time": `${Math.max(0.8, 14 / Math.max(1, windSpeed))}s`,
              } as CSSProperties
            }
          >
            <path d="m-3 0-5 101h15L3 0" fill="#fff6db" />
            <path d="m-4 55 9 1m-10 25 12 1" stroke="#98b4a7" />
            <g className="little-rotor">
              {[0, 120, 240].map((angle) => (
                <path
                  key={angle}
                  transform={`rotate(${angle})`}
                  d="M-2-1-6-35q2-9 7-6L4-6 1 3z"
                  fill="#fffbed"
                />
              ))}
              <circle r="6" fill="#f6c853" />
            </g>
            <path
              className="breeze-line"
              d="M-47 11h20m34 28h29"
              fill="none"
              stroke="#d5eee4"
            />
            <path
              d="M5 96q23 6 46-5"
              fill="none"
              stroke="#f2c956"
              strokeWidth="3"
            />
          </g>
        )}
        {extraPanels > 0 && tier < 4 && (
          <g transform="translate(19 227)" strokeWidth="1.5">
            {Array.from({ length: Math.min(3, extraPanels) }, (_, i) => (
              <g key={i} transform={`translate(${i * 39} ${(i % 2) * 3})`}>
                <path d="m2 16 5-19 32 1-5 19z" fill="#6ca4c2" />
                <path d="m5 7 30 1m-17-9-5 18m16-17-5 18" stroke="#c7e5de" />
                <path d="M6 17v6m24-5v6" />
              </g>
            ))}
          </g>
        )}
        {tier === 4 ? (
          <g>
            {[75, 178, 274].map((x, i) => (
              <g key={x} transform={`translate(${x} ${105 + i * 10})`}>
                <path d="m-4 0-4 110h17L4 0" fill="#fffdf7" />
                <g className="turbine">
                  <path
                    d="M0 0-6-60q8-4 10 4L3-3M0 0l-49 32q0 9 9 6L3 3M0 0l54 29q8-5 0-10L3-3"
                    fill="#fffdf7"
                  />
                  <circle r="7" fill="#f6c853" />
                </g>
              </g>
            ))}
          </g>
        ) : null}
        {tier >= 5 ? (
          <g>
            <rect
              x="35"
              y="158"
              width="130"
              height="67"
              rx="4"
              fill="#f4d48c"
            />
            <path d="M29 159h142l-18-22H44z" fill="#e98b72" />
            <path d="M52 181h30v25H52zm48 0h30v25h-30z" fill="#78a9bd" />
            {tier >= 6 ? (
              <>
                <path
                  d="M190 213q30-62 7-104h51q-23 45 9 104z"
                  fill="#d5ded4"
                />
                <path d="M269 223q27-57 9-96h45q-17 39 9 96z" fill="#e7e7d7" />
                <path
                  d="M207 92q-15-20 8-31m13 26q17-13 2-34m62 60q-9-17 9-31"
                  fill="none"
                  stroke="#fffdf7"
                  className="steam-plume"
                  strokeWidth="14"
                />
                <path d="M191 213h65m14 10h61" />
              </>
            ) : (
              <>
                <path d="M186 185v-72h20v72m20 0v-95h20v95" fill="#d8d4c3" />
                <path
                  d="M195 96q-12-21 7-32m32 14q18-15 1-35"
                  fill="none"
                  stroke="#fffdf7"
                  className="steam-plume"
                  strokeWidth="12"
                />
                <rect
                  x="172"
                  y="180"
                  width="104"
                  height="45"
                  rx="12"
                  fill="#8bb8a1"
                />
                <path d="M184 203h80" />
              </>
            )}
          </g>
        ) : null}
        {tier < 5 ? (
          <g>
            <path d="M272 153h72v65h-72z" fill="#f6d47e" />
            <path d="m262 155 22-24 57 3 14 23z" fill="#e88f76" />
            <path d="M291 179h25v39h-25z" fill="#f9f2d9" />
            <path
              d="M322 166h13v12h-13z"
              fill={night && producing ? "#ffe496" : "#8eb6c4"}
            />
            <path d="m283 165-5 8h6l-3 8" fill="none" strokeWidth="2" />
          </g>
        ) : null}
        {tier >= 4 && (
          <g fill="none">
            <path
              d="M155 230q55 17 104-4t77 3"
              stroke="#263359"
              strokeWidth="6"
            />
            <path
              d="M155 230q55 17 104-4t77 3"
              stroke="#f2c956"
              strokeWidth="3"
            />
            <path
              className="electric-current"
              d="M155 230q55 17 104-4t77 3"
              stroke="#fff4ae"
              strokeWidth="3.5"
              strokeDasharray="4 14"
            />
          </g>
        )}
        <g
          className="power-signal"
          transform="translate(304 114)"
          stroke="none"
        >
          <g className="signal-rings">
            <circle r="16" fill="#ffcc48" opacity=".15" />
            <circle r="11" fill="#ffcc48" opacity=".28" />
          </g>
          <path d="m2-9-8 10h5l-1 8 9-12H2z" fill="#ffd451" />
        </g>
        {tier === 6 && (
          <g className="reactor-indicator" fill="#7cceac" stroke="none">
            <circle cx="116" cy="193" r="3" />
            <circle cx="105" cy="193" r="3" />
            <circle cx="127" cy="193" r="3" />
          </g>
        )}
        <g transform="translate(357 182)">
          <path d="m-5 27-3 17m18-17 3 17" strokeWidth="6" />
          <path d="m-9 7-5 21 26 1-5-22" fill="#638db0" />
          <path d="M-11 11-18 22m29-10 9 8" strokeWidth="5" />
          <circle cy="-2" r="11" fill="#f3c4a3" />
          <path d="M-13-5q0-16 13-15 13 1 14 15z" fill="#ffcc48" />
          <path d="M-15-4h31" />
          <path d="M0-18v11" />
          <circle cx="4" cy="-1" r="1" fill="#263359" stroke="none" />
        </g>
        <path
          d="m21 235 4-7 3 6m206 19 3-7 3 5m160-15 3-6 3 5"
          fill="none"
          stroke="#53794b"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
export function SolarIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="m5 5-3 18h28L26 5z" fill="#b6dcec" />
      <path d="M4 14h24M13 5l-1 18m8-18 1 18M10 23v6m12-6v6M7 29h18" />
    </svg>
  );
}
