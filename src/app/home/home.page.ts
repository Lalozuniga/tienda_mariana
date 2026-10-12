import { Component, computed, inject, signal } from '@angular/core';
import { Contacto, Firebase } from '../services/firebase';
import { AlertController, IonFab, IonFabButton, IonSearchbar } from '@ionic/angular/lazy';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

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
  addIcons({ add });
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
}
