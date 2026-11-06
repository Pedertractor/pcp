import { useEffect, useState } from 'react';

function currentRatio() {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
}

/** Tracks devicePixelRatio, which changes when the window moves to a monitor with another scale. */
export function useDevicePixelRatio(): number {
  const [ratio, setRatio] = useState(currentRatio);

  useEffect(() => {
    const query = window.matchMedia(`(resolution: ${ratio}dppx)`);
    function handleChange() {
      setRatio(currentRatio());
    }
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [ratio]);

  return ratio;
}
