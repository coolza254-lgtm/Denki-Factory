import { useRef, type CSSProperties } from "react";
import { useMotion } from "./Motion";

/** Original SVG cutouts: a few uneven shapes, no downloaded imagery or filters. */
export function SmallGeneratorArt({
  wind = false,
  active = true,
  reduced = false,
  speed = 6,
}: {
  wind?: boolean;
  active?: boolean;
  reduced?: boolean;
  speed?: number;
}) {
  const element = useRef<SVGSVGElement>(null);
  const motion = useMotion(reduced, element);
  return (
    <svg
      ref={element}
      viewBox="0 0 200 160"
      role="img"
      aria-label={wind ? "กังหันลมเล็กบนสนามหญ้า" : "แผงโซลาร์มือสองบนขาตั้ง"}
      className={`small-generator-art ${active ? "working" : "resting"} ${motion ? "motion-running" : "motion-paused"}`}
      style={
        {
          "--rotor-time": `${Math.max(0.8, 14 / Math.max(1, speed))}s`,
        } as CSSProperties
      }
    >
      <g
        stroke="#46584b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse
          cx="100"
          cy="139"
          rx="76"
          ry="10"
          fill="#c9de9c"
          stroke="none"
        />
        {wind ? (
          <>
            <path d="m94 66-7 71 23 1-9-72" fill="#fff7dd" />
            <path d="m93 101 11 1m-13 17 15 1" stroke="#a6bdaf" />
            <g transform="translate(98 58)">
              <g className="little-rotor">
                {[0, 120, 240].map((angle) => (
                  <path
                    key={angle}
                    transform={`rotate(${angle})`}
                    d="M-3-3-9-42q1-12 8-10L5-7 1 3z"
                    fill="#fffdf0"
                  />
                ))}
                <circle r="7" fill="#f5c45e" />
                <circle r="2" fill="#e5a352" stroke="none" />
              </g>
            </g>
            <path
              className="breeze-line"
              d="M21 51h24q9 0 6-7m95 40h30q9 0 5-7M23 90h32"
              fill="none"
              stroke="#87bdb3"
            />
            <path d="M109 127q19 0 23-9" fill="none" />
            <rect
              x="128"
              y="106"
              width="29"
              height="30"
              rx="4"
              fill="#8bb8a1"
            />
            <path d="m144 113-7 9h7l-3 7" stroke="#fff4bd" fill="none" />
          </>
        ) : (
          <>
            <path
              d="m58 105-7 31m84-32 5 33M50 137h12m72 1h13"
              fill="none"
              strokeWidth="5"
            />
            <path d="m39 107 17-66 104 6-18 63z" fill="#fff7dd" />
            <path d="m47 102 14-55 91 5-15 52z" fill="#629fc1" />
            <path
              d="m56 75 89 5m-61-31-15 54m45-52-15 54m31-53-15 54"
              stroke="#c4e3df"
              strokeWidth="1.5"
            />
            <path d="m113 54 12 1-3 8-12-1z" fill="#edcc81" stroke="none" />
            <path
              className="panel-glint"
              d="m66 55-9 34m17-33-6 21"
              stroke="#ecf7e9"
              opacity=".7"
            />
            <path d="M142 116q25 14 26 1" fill="none" />
            <circle cx="157" cy="29" r="12" fill="#f8d167" stroke="none" />
            <path d="M157 10V6m18 23h5m-9-13 3-3" stroke="#e6b64e" />
          </>
        )}
        <path d="m33 135 3-6 3 7m119 2 3-7 4 5" stroke="#6f9857" fill="none" />
        <g transform="translate(170 132)" strokeWidth="1.5">
          <path d="M0 6V-3" stroke="#6f9857" />
          <path d="M-5-3 0-7l5 4-5 4z" fill="#f3ab87" stroke="none" />
        </g>
      </g>
    </svg>
  );
}
