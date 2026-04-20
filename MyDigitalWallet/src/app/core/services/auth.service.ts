import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private googleInitialized = false;

  constructor(private auth: Auth) {}

  register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async loginWithGoogle(): Promise<UserCredential> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      const provider = new GoogleAuthProvider();
      return signInWithPopup(this.auth, provider);
    }

    if (!this.googleInitialized) {
      await GoogleSignIn.initialize({
        clientId: environment.googleWebClientId
      });
      this.googleInitialized = true;
    }

    const result = await GoogleSignIn.signIn();
    const credential = GoogleAuthProvider.credential(result.idToken);
    return signInWithCredential(this.auth, credential);
  }

  async logout(): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      if (platform !== 'web') {
        await GoogleSignIn.signOut();
      }
    } catch (error) {
      console.warn('No fue posible cerrar sesión de Google plugin:', error);
    }

    return signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  authState(): Observable<User | null> {
    return new Observable((observer) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        observer.next(user);
      });

      return () => unsubscribe();
    });
  }
}