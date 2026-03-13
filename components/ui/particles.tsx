"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

type ParticlesProps = {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
};

type ParticlesWindow = Window &
  typeof globalThis & {
    particlesJS?: (tagId: string, params: Record<string, unknown>) => void;
    pJSDom?: Array<{ pJS?: { fn?: { vendors?: { destroypJS?: () => void } } } }>;
  };

export function Particles({
  className,
  quantity = 120,
  staticity = 30,
  ease = 90,
  size = 1.75,
  refresh = false,
  color = "#6f8fff",
  vx = 0,
  vy = 0,
}: ParticlesProps) {
  const rawId = useId();
  const containerId = `particles-${rawId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const win = window as ParticlesWindow;
    const movementSpeed = Math.max(0.3, 2.4 - ease / 60);
    const repulseDistance = Math.max(90, staticity * 5);
    const initParticles = () => {
      if (typeof win.particlesJS !== "function") return undefined;

      container.innerHTML = "";

      win.particlesJS(containerId, {
        particles: {
          number: {
            value: quantity,
            density: {
              enable: true,
              value_area: 1100,
            },
          },
          color: {
            value: color,
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color,
            },
          },
          opacity: {
            value: 0.45,
            random: true,
            anim: {
              enable: false,
              speed: 1,
              opacity_min: 0.16,
              sync: false,
            },
          },
          size: {
            value: size,
            random: true,
            anim: {
              enable: false,
              speed: 2,
              size_min: 0.8,
              sync: false,
            },
          },
          line_linked: {
            enable: true,
            distance: 160,
            color,
            opacity: 0.28,
            width: 1,
          },
          move: {
            enable: true,
            speed: movementSpeed,
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
              enable: false,
              rotateX: 600,
              rotateY: 1200,
            },
          },
        },
        interactivity: {
          detect_on: "window",
          events: {
            onhover: {
              enable: true,
              mode: "grab",
            },
            onclick: {
              enable: false,
              mode: "push",
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: Math.max(140, repulseDistance + 20),
              line_linked: {
                opacity: 0.75,
              },
            },
          },
        },
        retina_detect: true,
      });

      const domIndex = (win.pJSDom?.length ?? 1) - 1;
      return domIndex >= 0 ? win.pJSDom?.[domIndex] : undefined;
    };

    let currentInstance =
      typeof win.particlesJS === "function"
        ? initParticles()
        : undefined;
    let createdScript: HTMLScriptElement | null = null;

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-particles-src="/vendor/particles.js"]');
    const handleLoad = () => {
      currentInstance = initParticles();
    };

    if (typeof win.particlesJS !== "function") {
      if (existingScript) {
        existingScript.addEventListener("load", handleLoad);
      } else {
        createdScript = document.createElement("script");
        createdScript.src = "/vendor/particles.js";
        createdScript.async = true;
        createdScript.dataset.particlesSrc = "/vendor/particles.js";
        createdScript.addEventListener("load", handleLoad);
        document.body.appendChild(createdScript);
      }
    }

    return () => {
      if (currentInstance?.pJS?.fn?.vendors?.destroypJS) {
        currentInstance.pJS.fn.vendors.destroypJS();
      }
      if (existingScript) {
        existingScript.removeEventListener("load", handleLoad);
      }
      createdScript?.removeEventListener("load", handleLoad);
      container.innerHTML = "";
    };
  }, [color, containerId, ease, quantity, refresh, size, staticity, vx, vy]);

  return <div id={containerId} ref={containerRef} className={cn("pointer-events-none absolute inset-0", className)} aria-hidden="true" />;
}
