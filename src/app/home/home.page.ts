import { Component, computed, inject, signal } from '@angular/core';
import { Contacto, Firebase } from '../services/firebase';
import { AlertController, IonFab, IonFabButton, IonSearchbar } from '@ionic/angular/lazy';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, print } from 'ionicons/icons';
import { crearTicket, compartirTicket, ENVIO_POR_DEFECTO, cargarEnvios, recordarEnvio } from '../services/ticket';

//normaliza los acentos de las palabras
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

//orden disponible
type Orden = 'reciente' | 'antiguo' | 'az' | 'za';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  protected svc = inject(Firebase)

  protected busqueda = signal('');
  protected orden = signal<Orden>('reciente');
  protected modalAbierto = signal(false);
  protected error = signal('');
  protected form = { nombre: '', telefono: '', direccion: '', referencia: '' };
  protected editandoId = signal<string | null>(null);
  private alertCtrl = inject(AlertController);

//mas variables 
protected modalTicket = signal(false);
protected errorTicket = signal('');
protected contactoTicket: Contacto | null = null;
protected pedido: number | null = null;
protected envio: number | null = ENVIO_POR_DEFECTO;
protected enviosRecientes = signal<number[]>(cargarEnvios());


// El total se calcula solo mientras escribes
protected get totalTicket(): number {
  return (parseFloat(String(this.pedido ?? '')) || 0) + (parseFloat(String(this.envio ?? '')) || 0);
}

protected visibles = computed(() => {
  const q = norm(this.busqueda().trim());
  let lista = this.svc.contactos();

  if (q) {
    lista = lista.filter((c) =>
      norm(`${c.nombre} ${c.telefono} ${c.direccion} ${c.referencia}`).includes(q)
    );
  }

  return [...lista].sort((a, b) => {
    switch (this.orden()) {
      case 'reciente': return b.creado - a.creado;
      case 'antiguo':  return a.creado - b.creado;
      case 'az':       return a.nombre.localeCompare(b.nombre, 'es');
      case 'za':       return b.nombre.localeCompare(a.nombre, 'es');
    }
  });
});

  constructor() {
  addIcons({ add, print });
  
  }

  protected nuevo() {
  this.editandoId.set(null);
  this.form = { nombre: '', telefono: '', direccion: '', referencia: '' };
  this.error.set('');
  this.modalAbierto.set(true);
}

protected cerrar() {
  this.modalAbierto.set(false);
}

protected guardar() {
  const id = this.editandoId();
  const err = id
    ? this.svc.editar(id, this.form.nombre, this.form.telefono, this.form.direccion, this.form.referencia)
    : this.svc.guardarNuevo(this.form.nombre, this.form.telefono, this.form.direccion, this.form.referencia);

  if (err) {
    this.error.set(err);
    return;
  }
  this.cerrar();
}

protected editar(c: Contacto) {
  this.editandoId.set(c.id);
  this.form = {
    nombre: c.nombre,
    telefono: c.telefono,
    direccion: c.direccion,
    referencia: c.referencia,
  };
  this.error.set('');
  this.modalAbierto.set(true);
}
protected async confirmarEliminar() {
  const id = this.editandoId();
  if (!id) return;

  const alert = await this.alertCtrl.create({
    header: 'Eliminar contacto',
    message: `¿Eliminar a ${this.form.nombre}? No se puede deshacer.`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: () => {
          this.svc.eliminar(id);
          this.cerrar();
        },
      },
    ],
  });
  await alert.present();
}


//capricho mio no me gustaba como estaba la barra 
protected barraOculta = signal(false);
private ultimoScroll = 0;

protected alScroll(ev: CustomEvent) {
  const y: number = ev.detail.scrollTop;
  const delta = y - this.ultimoScroll;

  if (y < 60) this.barraOculta.set(false);          // arriba del todo: siempre visible
  else if (delta > 4) this.barraOculta.set(true);   // bajando: ocultar
  else if (delta < -4) this.barraOculta.set(false); // subiendo: mostrar

  this.ultimoScroll = y;
}

// Se ejecuta al tocar el botón azul de la tarjeta: solo abre la ventanita
protected imprimir(c: Contacto) {
  this.contactoTicket = c;
  this.pedido = null;                  // vacío: lo escribe el usuario
  this.envio = ENVIO_POR_DEFECTO;      // 35 por defecto, editable
  this.errorTicket.set('');
  this.modalTicket.set(true);
}



// Se ejecuta al tocar "Imprimir" dentro de la ventanita
protected async confirmarImpresion() {
  const c = this.contactoTicket;
  if (!c) return;

  const pedido = parseFloat(String(this.pedido ?? ''));
  const envio = parseFloat(String(this.envio ?? ''));

  if (isNaN(pedido) || pedido < 0) {
    this.errorTicket.set('Escribe el costo del pedido');
    return;
  }
  if (isNaN(envio) || envio < 0) {
    this.errorTicket.set('El envío no es válido');
    return;
  }

  const canvas = crearTicket({
    nombre: c.nombre,
    lugar: c.direccion,
    telefono: c.telefono,
    pedido,
    envio,
  });
  this.cerrarTicket();
  await compartirTicket(canvas);
}



protected cerrarTicket() {
  this.modalTicket.set(false);
}

private prepararTicket(): HTMLCanvasElement | null {
  const c = this.contactoTicket;
  if (!c) return null;

  const leer = (v: unknown): number | null => {
    const t = String(v ?? '').trim();
    if (t === '') return null;
    const n = parseFloat(t);
    return isNaN(n) || n < 0 ? NaN : n;
  };
  const pedido = leer(this.pedido);
  const envio = leer(this.envio);

  if (Number.isNaN(pedido) || Number.isNaN(envio)) {
    this.errorTicket.set('Revisa los montos: deben ser números positivos');
    return null;
  }

  this.enviosRecientes.set(recordarEnvio(envio));
  return crearTicket({
    nombre: c.nombre,
    lugar: c.direccion,
    telefono: c.telefono,
    pedido,
    envio,
  });
}

protected async imprimirCompartir() {
  const canvas = this.prepararTicket();
  if (!canvas) return;
  this.cerrarTicket();
  await compartirTicket(canvas);
}

protected async imprimirBluetooth() {
  const canvas = this.prepararTicket();
  if (!canvas) return;
  try {
    const { CatPrinter } = await import('@opuu/cat-printer');
    const printer = new CatPrinter({ debug: true });
    await printer.connect();
    await printer.printImage(canvas.toDataURL('image/png'), { dither: 'threshold' });
    await printer.feed(100);
    await printer.disconnect();
    this.cerrarTicket();
  } catch (e) {
    console.error('Bluetooth:', e);
    this.errorTicket.set('Bluetooth: ' + (e instanceof Error ? e.message : String(e)));
  }
}
}
