import { Service, signal } from '@angular/core';
import { Injectable } from '@angular/core';
import {  initializeApp} from 'firebase/app';
import { environment } from '../../environments/environment';
import { Signal } from '@angular/core';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  onSnapshot,
  addDoc,doc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';


export interface Contacto{
    id: string;
    nombre: string;
    telefono: string;
    telefonoLimpio: string;
    direccion: string;
    referencia: string;
    creado: number;
}

@
Service()
export class Firebase {
    private app = initializeApp(environment.firebase_key);
    private db = initializeFirestore(this.app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
        }), 
    });
    
    private col = collection(this.db, 'contactos');
    readonly contactos = signal<Contacto[]>([]);
    readonly cargando  = signal(true);

    constructor() {
        onSnapshot(this.col, (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contacto);
        this.contactos.set(lista);
        this.cargando.set(false);
        console.log('Contactos:', lista);
  });
}

guardarNuevo(nombre: string, telefono: string, direccion = '', referencia = ''): string | null {
  nombre = nombre.trim();
  const telefonoLimpio = telefono.replace(/\D/g, '');

  if (!nombre) return 'El nombre es obligatorio';
  if (!telefonoLimpio) return 'El teléfono es obligatorio';

  const repetido = this.contactos().find((c) => c.telefonoLimpio === telefonoLimpio);
  if (repetido) return `Ese teléfono ya está registrado (${repetido.nombre})`;

  addDoc(this.col, {
    nombre,
    telefono: telefono.trim(),
    telefonoLimpio,
    direccion: direccion.trim(),
    referencia: referencia.trim(),
    creado: Date.now(),
  }).catch(console.error);

  return null;
}

editar(id: string, nombre: string, telefono: string, direccion = '', referencia = ''): string | null {
  nombre = nombre.trim();
  const telefonoLimpio = telefono.replace(/\D/g, '');

  if (!nombre) return 'El nombre es obligatorio';
  if (!telefonoLimpio) return 'El teléfono es obligatorio';

  const repetido = this.contactos().find(
    (c) => c.telefonoLimpio === telefonoLimpio && c.id !== id
  );
  if (repetido) return `Ese teléfono ya está registrado (${repetido.nombre})`;

  updateDoc(doc(this.db, 'contactos', id), {
    nombre,
    telefono: telefono.trim(),
    telefonoLimpio,
    direccion: direccion.trim(),
    referencia: referencia.trim(),
  }).catch(console.error);

  return null;
}

eliminar(id: string): void {
  deleteDoc(doc(this.db, 'contactos', id)).catch(console.error);
}

}