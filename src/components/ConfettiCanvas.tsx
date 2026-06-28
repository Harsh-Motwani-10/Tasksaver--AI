import React, { useEffect, useRef } from 'react';

interface ConfettiCanvasProps {
  trigger: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'triangle';
  opacity: number;
  decay: number;
}

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
];

export default function ConfettiCanvas({ trigger }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Resize canvas to cover viewport
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Create particles burst when trigger changes
  useEffect(() => {
    if (trigger === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const newParticles: Particle[] = [];

    // Left Cannon
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        x: 0,
        y: height * 0.8,
        vx: 8 + Math.random() * 12, // Move right
        vy: -12 - Math.random() * 15, // Move up
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: -10 + Math.random() * 20,
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as any,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.012,
      });
    }

    // Right Cannon
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        x: width,
        y: height * 0.8,
        vx: -8 - Math.random() * 12, // Move left
        vy: -12 - Math.random() * 15, // Move up
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: -10 + Math.random() * 20,
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as any,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.012,
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

    // Start animation loop if not already running
    if (!animationFrameRef.current) {
      animate();
    }
  }, [trigger]);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    const gravity = 0.45;
    const friction = 0.985;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Update positions & physics
      p.vx *= friction;
      p.vy += gravity;
      p.vy *= friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      // Remove invisible particles
      if (p.opacity <= 0 || p.y > canvas.height + 20) {
        particles.splice(i, 1);
        continue;
      }

      // Draw particle
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      ctx.beginPath();
      if (p.shape === 'circle') {
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.shape === 'triangle') {
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (particles.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      animationFrameRef.current = null;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
