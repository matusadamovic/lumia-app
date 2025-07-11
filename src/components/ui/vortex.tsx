import { cn } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
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
  orientation?: "horizontal" | "vertical" | "auto";
}

export const Vortex = (props: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const resizeRaf = useRef<number | null>(null);

  // parameters
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

  // runtime state
  const tick = useRef(0);
  const center = useRef<[number, number]>([0, 0]);
  const particleProps = useRef<Float32Array>(new Float32Array(particlePropsLength));

  // offscreen canvas reference (initialized on client)
  const offscreenRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } | null>(null);

  // noise function
  const noise3D = useRef(createNoise3D(Math.random)).current;

  // helpers
  const rand = useCallback((n: number) => n * Math.random(), []);
  const randRange = useCallback((n: number) => n - rand(2 * n), [rand]);
  const fadeInOut = useCallback((t: number, m: number) => {
    const hm = 0.5 * m;
    return Math.abs(((t + hm) % m) - hm) / hm;
  }, []);
  const lerp = useCallback((a: number, b: number, t: number) => (1 - t) * a + t * b, []);

  const isVertical = useCallback(() => {
    if (orientation === "vertical") return true;
    if (orientation === "horizontal") return false;
    return window.innerHeight > window.innerWidth;
  }, [orientation]);

  // particle initialization
  const initParticle = useCallback((i: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let x: number, y: number;
    if (isVertical()) {
      x = center.current[0] + randRange(rangeY);
      y = rand(canvas.height);
    } else {
      x = rand(canvas.width);
      y = center.current[1] + randRange(rangeY);
    }
    const life = 0;
    const ttl = baseTTL + rand(rangeTTL);
    const speed = baseSpeed + rand(rangeSpeed);
    const radius = baseRadius + rand(rangeRadius);
    const hue = baseHue + rand(rangeHue);

    particleProps.current.set([x, y, 0, 0, life, ttl, speed, radius, hue], i);
  }, [
    isVertical, rand, randRange, rangeY,
    baseTTL, rangeTTL, baseSpeed, rangeSpeed,
    baseRadius, rangeRadius, baseHue, rangeHue,
  ]);

  const initParticles = useCallback(() => {
    tick.current = 0;
    const arr = particleProps.current;
    for (let i = 0; i < arr.length; i += particlePropCount) {
      initParticle(i);
    }
  }, [initParticle, particlePropCount]);

  const checkBounds = useCallback((x: number, y: number, c: HTMLCanvasElement) =>
    x < 0 || x > c.width || y < 0 || y > c.height, []);

  const updateParticlePath = useCallback((i: number, path: Path2D) => {
    const arr = particleProps.current;
    const x = arr[i], y = arr[i + 1];
    const n = noise3D(x * xOff, y * yOff, tick.current * zOff) * noiseSteps * Math.PI * 2;
    const vx = lerp(arr[i + 2], Math.cos(n), 0.5);
    const vy = lerp(arr[i + 3], Math.sin(n), 0.5);
    const life = arr[i + 4] + 1;
    const ttl = arr[i + 5];
    const speed = arr[i + 6];
    const radius = arr[i + 7];
    const hue = arr[i + 8];

    const x2 = x + vx * speed;
    const y2 = y + vy * speed;

    path.moveTo(x, y);
    path.lineTo(x2, y2);

    arr[i] = x2;
    arr[i + 1] = y2;
    arr[i + 2] = vx;
    arr[i + 3] = vy;
    arr[i + 4] = life;

    if (checkBounds(x2, y2, canvasRef.current!) || life > ttl) {
      initParticle(i);
    }

    return { radius, hue, life, ttl };
  }, [
    checkBounds, initParticle, lerp,
    noise3D, noiseSteps, xOff, yOff, zOff,
  ]);

  const resizeAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    if (offscreenRef.current) {
      offscreenRef.current.canvas.width = w;
      offscreenRef.current.canvas.height = h;
    }
    center.current = [w / 2, h / 2];
  }, []);

  const handleResize = useCallback(() => {
    if (resizeRaf.current != null) cancelAnimationFrame(resizeRaf.current);
    resizeRaf.current = requestAnimationFrame(() => {
      resizeAll();
      initParticles();
    });
  }, [resizeAll, initParticles]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext("2d")!;
    const offCtx = off.ctx;
    tick.current++;

    // background
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw particles into offscreen
    offCtx.globalCompositeOperation = "source-over";
    offCtx.clearRect(0, 0, off.canvas.width, off.canvas.height);
    let path = new Path2D();
    const styles: { radius: number; hue: number; alpha: number }[] = [];

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      const { radius, hue, life, ttl } = updateParticlePath(i, path);
      styles.push({ radius, hue, alpha: fadeInOut(life, ttl) });
      if (styles.length === 100) {
        offCtx.lineCap = "round";
        styles.forEach(s => {
          offCtx.lineWidth = s.radius;
          offCtx.strokeStyle = `hsla(${s.hue},100%,60%,${s.alpha})`;
        });
        offCtx.stroke(path);
        path = new Path2D();
        styles.length = 0;
      }
    }
    if (styles.length) {
      offCtx.lineCap = "round";
      styles.forEach(s => {
        offCtx.lineWidth = s.radius;
        offCtx.strokeStyle = `hsla(${s.hue},100%,60%,${s.alpha})`;
      });
      offCtx.stroke(path);
    }

    // glow via shadowBlur
    ctx.globalCompositeOperation = "lighter";
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffffff";
    ctx.drawImage(off.canvas, 0, 0);
    ctx.restore();

    // sharp overlay
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(off.canvas, 0, 0);

    animationFrameId.current = requestAnimationFrame(draw);
  }, [
    backgroundColor,
    particlePropCount,
    particlePropsLength,
    updateParticlePath,
    fadeInOut,
  ]);

  useEffect(() => {
    // only on client
    if (typeof document !== "undefined" && !offscreenRef.current) {
      const c = document.createElement("canvas");
      offscreenRef.current = {
        canvas: c,
        ctx: c.getContext("2d")!,
      };
    }
    resizeAll();
    initParticles();
    draw();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId.current != null) cancelAnimationFrame(animationFrameId.current);
      if (resizeRaf.current != null) cancelAnimationFrame(resizeRaf.current);
    };
  }, [resizeAll, initParticles, draw, handleResize]);

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
      <div className={cn("relative z-10", props.className)}>
        {props.children}
      </div>
    </div>
  );
};
