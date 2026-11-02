"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  APP_DEVELOPER,
  SPLASH_DURATION_MS,
  SPLASH_PROGRESS_100_MS,
  SPLASH_PROGRESS_90_MS,
} from "@/lib/app-config";

type SplashScreenProps = {
  isExiting: boolean;
};

export function SplashScreen({ isExiting }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frameId = 0;

    const updateProgress = (now: number) => {
      const elapsed = Math.min(now - startedAt, SPLASH_DURATION_MS);
      const nextProgress =
        elapsed <= SPLASH_PROGRESS_90_MS
          ? Math.round((elapsed / SPLASH_PROGRESS_90_MS) * 90)
          : elapsed <= SPLASH_PROGRESS_100_MS
            ? 90 + Math.round(
                ((elapsed - SPLASH_PROGRESS_90_MS) /
                  (SPLASH_PROGRESS_100_MS - SPLASH_PROGRESS_90_MS)) *
                  10,
              )
            : 100;

      setProgress((current) => (current === nextProgress ? current : nextProgress));
      if (elapsed < SPLASH_DURATION_MS) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    };

    frameId = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className={`disc-splash${isExiting ? " is-exiting" : ""}`}>
      <div className="splash-background" aria-hidden="true" />
      <div className="splash-glow splash-glow-top" aria-hidden="true" />
      <div className="splash-glow splash-glow-bottom" aria-hidden="true" />
      <main className="splash-content">
        <div className="splash-logo-breathe">
          <div className="splash-logo-stage">
            <div className="splash-logo-glow" aria-hidden="true" />
            <Image
              src="/disc-nf-logo.png"
              alt="DISC NF - Avaliação Comportamental"
              width={1132}
              height={365}
              priority
              sizes="(max-width: 640px) 84vw, (max-width: 1024px) 48vw, 560px"
              className="splash-logo"
            />
            <div className="splash-shine" aria-hidden="true" />
          </div>
        </div>
        <section className="splash-loading" role="status" aria-live="polite" aria-busy={progress < 100}>
          <p>Preparando sua experiência...</p>
          <div
            className="splash-progress-track"
            role="progressbar"
            aria-label="Carregando a experiência"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span className="splash-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </section>
        <p className="splash-developer">
          Desenvolvido por <strong>{APP_DEVELOPER}</strong>
        </p>
      </main>
    </div>
  );
}
