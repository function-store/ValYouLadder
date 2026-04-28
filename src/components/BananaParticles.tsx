import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
}

const BananaParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let mouseX = -9999;
    let mouseY = -9999;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const COUNT = 22;
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.008,
      size: 18 + Math.random() * 22,
      opacity: 0.06 + Math.random() * 0.1,
    }));

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const distSq = dx * dx + dy * dy;
        const REPEL_RADIUS = 140;

        if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * 0.35;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // friction
        p.vx *= 0.985;
        p.vy *= 0.985;

        // speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 2.5) {
          p.vx = (p.vx / speed) * 2.5;
          p.vy = (p.vy / speed) * 2.5;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // wrap edges
        const pad = 60;
        if (p.x < -pad) p.x = canvas.width + pad;
        else if (p.x > canvas.width + pad) p.x = -pad;
        if (p.y < -pad) p.y = canvas.height + pad;
        else if (p.y > canvas.height + pad) p.y = -pad;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🍌", 0, 0);
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};

export default BananaParticles;
