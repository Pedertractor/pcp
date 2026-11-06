import { useEffect, useRef, useState } from 'react';

import logoLoginDark from '@/public/logo-login-dark.png';
import logoLogin from '@/public/logo-login.png';
import {
  FactoryProcessGlow,
  type ProcessGlowPosition,
} from '@/components/auth/factory-process-glow';

const GLOW_CYCLE_MS = 2000;
const STORAGE_KEY = 'pcp.login-process-glows';

const DEFAULT_GLOWS = {
  laser: { x: 50.5, y: 62.5 },
  weld: { x: 68.0, y: 57.0 },
} satisfies Record<string, ProcessGlowPosition>;

type GlowKind = keyof typeof DEFAULT_GLOWS;
type GlowPositions = Record<GlowKind, ProcessGlowPosition>;

function isPosition(value: unknown): value is ProcessGlowPosition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const position = value as ProcessGlowPosition;
  return (
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    position.x >= 0 &&
    position.x <= 100 &&
    position.y >= 0 &&
    position.y <= 100
  );
}

function readStoredPositions(): GlowPositions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GLOWS;
    }

    const parsed = JSON.parse(raw) as Partial<GlowPositions>;
    if (!isPosition(parsed.laser) || !isPosition(parsed.weld)) {
      return DEFAULT_GLOWS;
    }

    return { laser: parsed.laser, weld: parsed.weld };
  } catch {
    return DEFAULT_GLOWS;
  }
}

export function LoginFactoryScene() {
  const boundsRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<GlowPositions>(DEFAULT_GLOWS);
  const [glowActive, setGlowActive] = useState(true);

  useEffect(() => {
    setPositions(readStoredPositions());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setGlowActive((current) => !current);
    }, GLOW_CYCLE_MS);

    return () => window.clearInterval(id);
  }, []);

  function updatePosition(kind: GlowKind, position: ProcessGlowPosition): void {
    setPositions((current) => {
      const next = { ...current, [kind]: position };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div
      ref={boundsRef}
      className="relative w-[min(100%,calc(42vh*1447/1087))] lg:w-[min(100%,calc(100dvh*1447/1087))]"
    >
      <img
        src={logoLogin}
        alt="Ilustração da fábrica PCP"
        className="block h-auto w-full select-none dark:hidden"
        draggable={false}
      />
      <img
        src={logoLoginDark}
        alt=""
        aria-hidden
        className="hidden h-auto w-full select-none dark:block"
        draggable={false}
      />
      <FactoryProcessGlow
        label="Laser"
        variant="laser"
        position={positions.laser}
        defaultPosition={DEFAULT_GLOWS.laser}
        active
        boundsRef={boundsRef}
        onPositionChange={(position) => updatePosition('laser', position)}
      />
      <FactoryProcessGlow
        label="Solda"
        variant="weld"
        position={positions.weld}
        defaultPosition={DEFAULT_GLOWS.weld}
        active={glowActive}
        boundsRef={boundsRef}
        onPositionChange={(position) => updatePosition('weld', position)}
      />
    </div>
  );
}
