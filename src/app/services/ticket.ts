export const ENVIO_POR_DEFECTO = 35;

export interface DatosTicket {
  nombre: string;
  lugar: string;
  telefono: string;
  referencia: string;
  pedido: number | null;
  envio: number | null;
}

interface Bloque { texto: string; px: number; negrita: boolean; }

const ANCHO = 384;
const MARGEN = 12;
const ALTO_CAMISETA = 64;

const dinero = (n: number) => '$' + n.toFixed(2).replace(/\.00$/, '');

function dibujarCamiseta(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x - 32, y);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(22, 2);
  ctx.lineTo(2, 14);
  ctx.lineTo(10, 28);
  ctx.lineTo(16, 24);
  ctx.lineTo(16, 54);
  ctx.lineTo(48, 54);
  ctx.lineTo(48, 24);
  ctx.lineTo(54, 28);
  ctx.lineTo(62, 14);
  ctx.lineTo(42, 2);
  ctx.quadraticCurveTo(32, 14, 22, 2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function crearTicket(d: DatosTicket): HTMLCanvasElement {
  const bloques: Bloque[] = [
    { texto: d.lugar ? `${d.nombre} – ${d.lugar}` : d.nombre, px: 30, negrita: true },
  ];
  if (d.telefono.trim()) {
    bloques.push({ texto: `Tel: ${d.telefono.trim()}`, px: 28, negrita: false });
  }
  if (d.referencia?.trim()) {
  bloques.push({ texto: `Ref: ${d.referencia.trim()}`, px: 28, negrita: false });
}

  const montos: Bloque[] = [];
  if (d.pedido) montos.push({ texto: `Pedido: ${dinero(d.pedido)}`, px: 28, negrita: false });
  if (d.envio) montos.push({ texto: `Envío: ${dinero(d.envio)}`, px: 28, negrita: false });
  if (montos.length > 1) {
    const total = (d.pedido ?? 0) + (d.envio ?? 0);
    montos.push({ texto: `TOTAL: ${dinero(total)}`, px: 38, negrita: true });
  }
  bloques.push(...montos);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fuente = (b: Bloque) => `${b.negrita ? 'bold ' : ''}${b.px}px sans-serif`;

  const partir = (b: Bloque): string[] => {
    ctx.font = fuente(b);
    const renglones: string[] = [];
    let actual = '';
    for (const palabra of b.texto.split(' ')) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (actual && ctx.measureText(prueba).width > ANCHO - 2 * MARGEN) {
        renglones.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    renglones.push(actual);
    return renglones;
  };

  const partes = bloques.map((b) => ({ b, renglones: partir(b) }));
  const alto =
    partes.reduce((s, p) => s + p.renglones.length * p.b.px * 1.3 + 8, 0) +
    ALTO_CAMISETA + 3 * MARGEN;

  canvas.width = ANCHO;
  canvas.height = Math.ceil(alto);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ANCHO, canvas.height);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  dibujarCamiseta(ctx, ANCHO / 2, MARGEN);

  let y = MARGEN + ALTO_CAMISETA + MARGEN;
  for (const { b, renglones } of partes) {
    ctx.font = fuente(b);
    for (const r of renglones) {
      ctx.fillText(r, ANCHO / 2, y);
      y += b.px * 1.3;
    }
    y += 8;
  }
  return canvas;
}

export async function compartirTicket(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) return;
  const archivo = new File([blob], 'ticket.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
    } catch { /* cerró el menú */ }
    return;
  }
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'ticket.png';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

// ---- Envíos recientes ----
const CLAVE_ENVIOS = 'enviosRecientes';
const ENVIOS_INICIALES = [35, 20];

export function cargarEnvios(): number[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ENVIOS) ?? 'null');
    if (Array.isArray(guardado) && guardado.every((n) => typeof n === 'number')) {
      return guardado.slice(0, 3);
    }
  } catch { /* sin almacenamiento */ }
  return [...ENVIOS_INICIALES];
}

export function recordarEnvio(valor: number | null): number[] {
  const actuales = cargarEnvios();
  if (!valor) return actuales;
  const nuevos = [valor, ...actuales.filter((n) => n !== valor)].slice(0, 3);
  try {
    localStorage.setItem(CLAVE_ENVIOS, JSON.stringify(nuevos));
  } catch { /* no pasa nada */ }
  return nuevos;
}