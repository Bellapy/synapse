import { useEffect, useRef } from 'react';

/**
 * Fundo fluido: um shader de tela cheia (ruído fractal deformado sobre si mesmo) que desenha fitas de cor
 * em movimento lento. Roda em meia resolução (o desfoque é parte do visual), pausa com a aba oculta e
 * fica estático com `prefers-reduced-motion`. Sem WebGL, o degradê CSS de fallback assume.
 */

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uCalm;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 screen = p;
  float t = uTime * 0.04;
  p = p * 0.8 + (uMouse - 0.5) * 0.08;

  // Deformação de domínio: o campo é distorcido por ele mesmo, o que cria as dobras de líquido.
  vec2 q = vec2(fbm(p * 1.1 + vec2(0.0, t)), fbm(p * 1.1 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.2 + 2.2 * q + vec2(1.7, 9.2) + t * 1.3),
                fbm(p * 1.2 + 2.2 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 0.9 + 2.4 * r);

  // Fitas largas: poucas bandas, com transição longa (nada de arestas duras).
  float wave = sin((f * 2.5 + r.x * 1.7 + p.y * 0.9) * 3.14159);
  float body = smoothstep(-0.55, 0.95, wave);
  float ridge = pow(max(0.0, 1.0 - abs(wave)), 4.0);

  vec3 deep   = vec3(0.043, 0.024, 0.125);
  vec3 plum   = vec3(0.145, 0.063, 0.37);
  vec3 iris   = vec3(0.37, 0.27, 0.86);
  vec3 orchid = vec3(0.72, 0.33, 0.84);
  vec3 rose   = vec3(1.0, 0.42, 0.6);
  vec3 ember  = vec3(1.0, 0.64, 0.45);
  vec3 sky    = vec3(0.26, 0.58, 1.0);

  // Um gradiente espacial espalha o azul, o violeta, o rosa e o pêssego pela tela.
  float g = f * 1.15 + 0.42 * screen.x - 0.28 * screen.y + (q.y - 0.5) * 0.5;
  vec3 hue = mix(sky, iris, smoothstep(0.1, 0.42, g));
  hue = mix(hue, orchid, smoothstep(0.38, 0.6, g));
  hue = mix(hue, rose, smoothstep(0.55, 0.8, g));
  hue = mix(hue, ember, smoothstep(0.78, 1.02, g));

  vec3 col = mix(deep, plum, smoothstep(0.2, 0.75, f));
  col = mix(col, hue, body * 0.62);
  col += mix(rose, ember, smoothstep(0.5, 1.0, g)) * ridge * 0.14;

  // Vinheta suave e respiro para o 3D quando o grafo está na tela.
  float vig = smoothstep(1.5, 0.2, length(screen * vec2(0.85, 1.0)));
  col *= mix(0.5, 1.0, vig);
  col *= mix(1.0, 0.5, uCalm);

  // Ruído de dithering evita as faixas visíveis em degradês escuros.
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 120.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RENDER_SCALE = 0.5;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('FluidBackground shader:', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export default function FluidBackground({ calm = 0 }: { calm?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calmTarget = useRef(calm);

  useEffect(() => {
    calmTarget.current = calm;
  }, [calm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uCalm = gl.getUniformLocation(program, 'uCalm');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let calmNow = calmTarget.current;
    let frame = 0;
    let running = true;
    const start = performance.now();

    const resize = () => {
      const width = Math.max(2, Math.floor(canvas.clientWidth * RENDER_SCALE));
      const height = Math.max(2, Math.floor(canvas.clientHeight * RENDER_SCALE));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (now: number) => {
      resize();
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      calmNow += (calmTarget.current - calmNow) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduceMotion ? 12 : (now - start) / 1000 + 12);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uCalm, calmNow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (!running) return;
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const onPointer = (event: PointerEvent) => {
      mouse.tx = event.clientX / window.innerWidth;
      mouse.ty = 1 - event.clientY / window.innerHeight;
    };
    const onVisibility = () => {
      running = !document.hidden && !reduceMotion;
      cancelAnimationFrame(frame);
      if (running) frame = requestAnimationFrame(loop);
    };

    draw(performance.now());
    if (!reduceMotion) {
      frame = requestAnimationFrame(loop);
      window.addEventListener('pointermove', onPointer, { passive: true });
    }
    const onResize = () => draw(performance.now());
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      // Sem loseContext(): o StrictMode remonta o efeito no mesmo canvas e reaproveitaria um contexto morto.
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ background: 'radial-gradient(120% 90% at 70% 20%, #2a1269 0%, #0b0620 70%)' }}
    />
  );
}
