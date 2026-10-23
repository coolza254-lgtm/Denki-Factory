import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
} from "react";

/** Honor system/app preferences and stop decorative work when offscreen/backgrounded. */
export function useMotion(
  reduced = false,
  element?: RefObject<Element | null>,
) {
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(() => !document.hidden);
  const [onscreen, setOnscreen] = useState(true);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setSystemReduced(query.matches);
    const visibility = () => setVisible(!document.hidden);
    query.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      query.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!element?.current || typeof IntersectionObserver === "undefined")
      return;
    const observer = new IntersectionObserver(([entry]) =>
      setOnscreen(entry.isIntersecting),
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [element]);
  return !reduced && !systemReduced && visible && onscreen;
}

/** Presentation only: never writes interpolated values to the financial state. */
export function RollingNumber({
  value,
  format,
  reduced = false,
}: {
  value: number;
  format: (n: number) => string;
  reduced?: boolean;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const motion = useMotion(reduced, element);
  const formatter = useRef(format);
  formatter.current = format;
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const start = shown.current;
    if (!motion || Math.abs(value - start) < 0.00001) {
      node.textContent = formatter.current(value);
      shown.current = value;
      return;
    }
    node.textContent = formatter.current(start);
    let frame = 0,
      began = 0,
      lastPaint = 0;
    const tick = (time: number) => {
      if (!began) began = time;
      const progress = Math.min(1, (time - began) / 1000);
      if (time - lastPaint >= 32 || progress === 1) {
        shown.current =
          start + (value - start) * (1 - Math.pow(1 - progress, 3));
        node.textContent = formatter.current(shown.current);
        lastPaint = time;
      }
      if (progress < 1) frame = requestAnimationFrame(tick);
      else shown.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, motion]);
  return (
    <span
      className="rolling-number"
      ref={element}
      data-value={value}
      aria-label={format(value)}
    >
      {format(value)}
    </span>
  );
}

export type Celebration = { id: number; label: string; positive: boolean };
export function ActionCelebration({
  event,
  reduced,
}: {
  event: Celebration;
  reduced: boolean;
}) {
  const motion = useMotion(reduced);
  return (
    <div
      key={event.id}
      className={
        "action-celebration " +
        (motion ? "animated " : "still ") +
        (event.positive ? "gain" : "upgrade")
      }
      aria-hidden="true"
    >
      <span className="celebration-label">
        {event.positive ? "+" : "ϟ"} {event.label}
      </span>
      {motion &&
        Array.from({ length: 6 }, (_, i) => (
          <i
            key={i}
            style={
              {
                "--dx": `${Math.cos((i * Math.PI) / 3) * 90}px`,
                "--dy": `${Math.sin((i * Math.PI) / 3) * 65 - 30}px`,
                "--turn": `${i * 67}deg`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}
