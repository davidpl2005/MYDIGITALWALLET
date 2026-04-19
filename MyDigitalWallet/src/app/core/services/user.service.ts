import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AppUser } from 'src/app/interfaces/user.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private path = 'users';

  constructor(private firestoreService: FirestoreService) {}

  createUserProfile(user: AppUser) {
    return this.firestoreService.createDocumentWithId(this.path, user.uid, user);
  }

  getUserProfile(uid: string): Observable<AppUser> {
    return this.firestoreService.getDocument(this.path, uid) as Observable<AppUser>;
  }

  updateUserProfile(uid: string, data: Partial<AppUser>) {
    return this.firestoreService.updateDocument(this.path, uid, data);
  }
}