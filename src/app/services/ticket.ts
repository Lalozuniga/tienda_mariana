export const ENVIO_POR_DEFECTO = 35; // si algún día cambia, se cambia aquí

export interface DatosTicket {
  nombre: string;
  lugar: string;     // el campo "direccion" del contacto
  telefono: string;  // puede venir vacío
  pedido: number;
  envio: number;
}

interface Bloque { texto: string; px: number; negrita: boolean; }

const ANCHO = 384;  // píxeles; se ajusta tras la primera impresión real
const MARGEN = 12;
const ALTO_CAMISETA = 64;

const dinero = (n: number) => '$' + n.toFixed(2).replace(/\.00$/, '');

// Dibuja una camiseta sencilla, solo contorno
function dibujarCamiseta(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x - 32, y); // centrada en x
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
  ctx.quadraticCurveTo(32, 14, 22, 2); // el cuello
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function crearTicket(d: DatosTicket): HTMLCanvasElement {
  const total = d.pedido + d.envio;

  const bloques: Bloque[] = [
    { texto: d.lugar ? `${d.nombre} – ${d.lugar}` : d.nombre, px: 30, negrita: true },
  ];
  if (d.telefono.trim()) {
    bloques.push({ texto: `Tel: ${d.telefono.trim()}`, px: 28, negrita: false });
  }
  bloques.push(
    { texto: `Pedido: ${dinero(d.pedido)}`, px: 28, negrita: false },
    { texto: `Envío: ${dinero(d.envio)}`, px: 28, negrita: false },
    { texto: `TOTAL: ${dinero(total)}`, px: 38, negrita: true },
  );

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fuente = (b: Bloque) => `${b.negrita ? 'bold ' : ''}${b.px}px sans-serif`;

  // Parte un texto largo en varios renglones para que quepa en el papel
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

  // Al cambiar el tamaño del canvas se reinicia su estilo, por eso se define todo después
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

  // Menú "Compartir" del celular: ahí debería aparecer Fun iPrint
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
    } catch {
      /* el usuario cerró el menú; no es un error */
    }
    return;
  }
  // Plan B (por ejemplo en la PC): descargar la imagen
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'ticket.png';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
