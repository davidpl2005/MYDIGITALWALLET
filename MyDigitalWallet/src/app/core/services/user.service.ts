import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { FirestoreService } from './firestore.service';
import { AppUser } from 'src/app/interfaces/user.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private path = 'users';

  constructor(
    private firestoreService: FirestoreService,
    private firestore: Firestore
  ) {}

  createUserProfile(user: AppUser) {
    return this.firestoreService.createDocumentWithId(this.path, user.uid, user);
  }

  getUserProfile(uid: string): Observable<AppUser> {
    return this.firestoreService.getDocument(this.path, uid) as Observable<AppUser>;
  }

  updateUserProfile(uid: string, data: Partial<AppUser>) {
    return this.firestoreService.updateDocument(this.path, uid, data);
  }

  async upsertGoogleUserProfile(data: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    const fullName = (data.displayName || '').trim();
    const parts = fullName.split(' ').filter(Boolean);
    const name = parts[0] || 'Usuario';
    const lastName = parts.slice(1).join(' ') || '';

    const ref = doc(this.firestore, `${this.path}/${data.uid}`);

    await setDoc(
      ref,
      {
        uid: data.uid,
        name,
        lastName,
        documentType: '',
        documentNumber: '',
        country: '',
        email: data.email,
        photoURL: data.photoURL || '',
        biometricEnabled: false,
        balance: 0,
        createdAt: new Date()
      },
      { merge: true }
    );
  }
}