import { useEffect, useState } from "react";

/** Muted looping background video with static fallback, failure handling and reduced-motion support. */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return (
    <div className="hero-fallback absolute inset-0" aria-hidden>
      {poster && (failed || reduced) && <img src={poster} alt="" className="h-full w-full object-cover" />}
      {!failed && !reduced && (
        <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster={poster} onError={() => setFailed(true)}>
          <source src={src} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
    </div>
  );
}
