import { Component, computed, inject, signal } from '@angular/core';
import { Firebase } from '../services/firebase';
import { IonSearchbar } from '@ionic/angular/lazy';

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

protected visibles = computed(() => {
  const q = norm(this.busqueda().trim());
  const lista = this.svc.contactos();
  if (!q) return lista;
  return lista.filter((c) =>
    norm(`${c.nombre} ${c.telefono} ${c.direccion} ${c.referencia}`).includes(q)
  );
});

  constructor() {
    
  }
}
