import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  docData,
  updateDoc,
  deleteDoc,
  setDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) {}

  createDocument(path: string, data: any) {
    const ref = collection(this.firestore, path);
    return addDoc(ref, data);
  }

  createDocumentWithId(path: string, id: string, data: any) {
    const ref = doc(this.firestore, `${path}/${id}`);
    return setDoc(ref, data);
  }

  getCollection(path: string): Observable<any[]> {
    const ref = collection(this.firestore, path);
    return collectionData(ref, { idField: 'id' }) as Observable<any[]>;
  }

  getDocument(path: string, id: string): Observable<any> {
    const ref = doc(this.firestore, `${path}/${id}`);
    return docData(ref, { idField: 'id' }) as Observable<any>;
  }

  updateDocument(path: string, id: string, data: any) {
    const ref = doc(this.firestore, `${path}/${id}`);
    return updateDoc(ref, data);
  }

  deleteDocument(path: string, id: string) {
    const ref = doc(this.firestore, `${path}/${id}`);
    return deleteDoc(ref);
  }
}