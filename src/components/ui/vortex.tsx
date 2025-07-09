import { cn } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createNoise3D } from "simplex-noise";
import { motion } from "framer-motion";

interface VortexProps {
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  particleCount?: number;
  rangeY?: number;
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
  /**  
   *  `"horizontal"` – vždy vodorovný pás  
   *  `"vertical"`  – vždy zvislý pás  
   *  `"auto"`     – podľa orientácie displeja (portrét ⇢ vertical, landscape ⇢ horizontal)  
   */
  orientation?: "horizontal" | "vertical" | "auto";
}

export const Vortex = (props: VortexProps) => {
  /* -------------------------- refs & persistent data -------------------------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  /* ---------------------------- incoming props --------------------------- */
  const particleCount = props.particleCount ?? 700;
  const particlePropCount = 9;
  const particlePropsLength = particleCount * particlePropCount;
  const rangeY = props.rangeY ?? 100;
  const baseTTL = 50;
  const rangeTTL = 150;
  const baseSpeed = props.baseSpeed ?? 0.0;
  const rangeSpeed = props.rangeSpeed ?? 1.5;
  const baseRadius = props.baseRadius ?? 1;
  const rangeRadius = props.rangeRadius ?? 2;
  const baseHue = props.baseHue ?? 220;
  const rangeHue = 100;
  const noiseSteps = 3;
  const xOff = 0.00125;
  const yOff = 0.00125;
  const zOff = 0.0005;
  const backgroundColor = props.backgroundColor ?? "#000000";
  const orientation = props.orientation ?? "auto";

  /* ---------------------------- runtime state ---------------------------- */
  const tick = useRef(0);
  const center = useRef<[number, number]>([0, 0]);
  const particleProps = useRef<Float32Array>(
    new Float32Array(particlePropsLength),
  );

  /* ----------------------------- helpers -------------------------------- */
  const rand = useCallback((n: number): number => n * Math.random(), []);
  const randRange = useCallback((n: number): number => n - rand(2 * n), [rand]);
  const fadeInOut = (t: number, m: number): number => {
    const hm = 0.5 * m;
    return Math.abs(((t + hm) % m) - hm) / hm;
  };
  const lerp = (n1: number, n2: number, speed: number): number =>
    (1 - speed) * n1 + speed * n2;

  /* ------------------------- simplex noise fn --------------------------- */
  const noise3D = useMemo(() => createNoise3D(Math.random), []);

  /* --------------------------- orientation ------------------------------ */
  const isVertical = () => {
    if (orientation === "vertical") return true;
    if (orientation === "horizontal") return false;
    // auto
    return window.innerHeight > window.innerWidth;
  };

  /* --------------------------- particles --------------------------------- */
  const initParticle = useCallback(
    (i: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let x: number, y: number;

      if (isVertical()) {
        // zvislý pás (mobil v portréte alebo napevno vertical)
        x = center.current[0] + randRange(rangeY); // okolo stredu X
        y = rand(canvas.height); // plná výška
      } else {
        // vodorovný pás (desktop / landscape)
        x = rand(canvas.width); // plná šírka
        y = center.current[1] + randRange(rangeY); // okolo stredu Y
      }

      const life = 0;
      const ttl = baseTTL + rand(rangeTTL);
      const speed = baseSpeed + rand(rangeSpeed);
      const radius = baseRadius + rand(rangeRadius);
      const hue = baseHue + rand(rangeHue);

      particleProps.current.set(
        [x, y, 0, 0, life, ttl, speed, radius, hue],
        i,
      );
    },
    [
      rand,
      randRange,
      rangeY,
      baseTTL,
      rangeTTL,
      baseSpeed,
      rangeSpeed,
      baseRadius,
      rangeRadius,
      baseHue,
      rangeHue,
    ],
  );

  const initParticles = useCallback(() => {
    tick.current = 0;
    particleProps.current = new Float32Array(particlePropsLength);

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i);
    }
  }, [initParticle, particlePropCount, particlePropsLength]);

  const checkBounds = (
    x: number,
    y: number,
    canvas: HTMLCanvasElement,
  ) => x > canvas.width || x < 0 || y > canvas.height || y < 0;

  const updateParticle = useCallback(
    (i: number, ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const i2 = 1 + i,
        i3 = 2 + i,
        i4 = 3 + i,
        i5 = 4 + i,
        i6 = 5 + i,
        i7 = 6 + i,
        i8 = 7 + i,
        i9 = 8 + i;

      const x = particleProps.current[i];
      const y = particleProps.current[i2];

      const n =
        noise3D(x * xOff, y * yOff, tick.current * zOff) *
        noiseSteps *
        Math.PI *
        2; // TAU

      const vx = lerp(particleProps.current[i3], Math.cos(n), 0.5);
      const vy = lerp(particleProps.current[i4], Math.sin(n), 0.5);
      const life = particleProps.current[i5] + 1;
      const ttl = particleProps.current[i6];
      const speed = particleProps.current[i7];
      const radius = particleProps.current[i8];
      const hue = particleProps.current[i9];

      const x2 = x + vx * speed;
      const y2 = y + vy * speed;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();

      particleProps.current[i] = x2;
      particleProps.current[i2] = y2;
      particleProps.current[i3] = vx;
      particleProps.current[i4] = vy;
      particleProps.current[i5] = life;

      if (checkBounds(x2, y2, canvas) || life > ttl) initParticle(i);
    },
    [
      noise3D,
      xOff,
      yOff,
      zOff,
      noiseSteps,
      lerp,
      fadeInOut,
      checkBounds,
      initParticle,
    ],
  );

  /* ------------------------------ canvas fx ------------------------------ */
  const renderGlow = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.filter = "blur(8px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = "blur(4px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    [],
  );

  const renderToScreen = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    [],
  );

  /* ------------------------------ helpers ------------------------------- */
  const resize = (
    canvas: HTMLCanvasElement,
    ctx?: CanvasRenderingContext2D,
  ) => {
    const { innerWidth, innerHeight } = window;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    center.current[0] = 0.5 * canvas.width;
    center.current[1] = 0.5 * canvas.height;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  /* ------------------------------ main loop ------------------------------ */
  const draw = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      tick.current += 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        updateParticle(i, ctx);
      }

      renderGlow(canvas, ctx);
      renderToScreen(canvas, ctx);

      animationFrameId.current = window.requestAnimationFrame(() =>
        draw(canvas, ctx),
      );
    },
    [
      backgroundColor,
      particlePropCount,
      particlePropsLength,
      updateParticle,
      renderGlow,
      renderToScreen,
    ],
  );

  /* ----------------------------- lifecycle ------------------------------ */
  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    resize(canvas, ctx);
    initParticles();
    draw(canvas, ctx);
  }, [draw, initParticles]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      resize(canvas, ctx);
      initParticles(); // re-seed particles podľa novej orientácie
    }
  }, [initParticles]);

  useEffect(() => {
    setup();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [handleResize, setup]);

  /* -------------------------------- render ------------------------------- */
  return (
    <div className={cn("relative h-full w-full", props.containerClassName)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        ref={containerRef}
        className="absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-transparent"
      >
        <canvas ref={canvasRef} />
      </motion.div>

      <div className={cn("relative z-10", props.className)}>{props.children}</div>
    </div>
  );
};
