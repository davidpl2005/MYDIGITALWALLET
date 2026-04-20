import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { BiometricAuthService } from 'src/app/core/services/biometric-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  showPassword = false;
  canUseBiometrics = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private biometricAuthService: BiometricAuthService,
    private toastController: ToastController,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.initForm();
    this.canUseBiometrics = await this.biometricAuthService.hasStoredCredentials();
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      const credential = await this.authService.login(email, password);

      this.userService.getUserProfile(credential.user.uid).subscribe({
        next: async (profile) => {
          if (profile?.biometricEnabled) {
            try {
              await this.biometricAuthService.saveCredentials(email, password);
              this.canUseBiometrics = true;
            } catch (error) {
              console.warn('No se pudieron guardar credenciales biométricas:', error);
            }
          }

          this.router.navigate(['/home']);
        },
        error: async () => {
          this.router.navigate(['/home']);
        }
      });
    } catch (error: any) {
      console.error('Error en login:', error);
      this.errorMessage = 'Correo o contraseña incorrectos.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      this.isSubmitting = true;
      const credential = await this.authService.loginWithGoogle();

      await this.userService.upsertGoogleUserProfile({
        uid: credential.user.uid,
        email: credential.user.email || '',
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL
      });

      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error en Google Sign-In:', error);
      this.errorMessage = 'No se pudo iniciar sesión con Google.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async loginWithBiometrics(): Promise<void> {
    try {
      const available = await this.biometricAuthService.isAvailable();

      if (!available) {
        await this.showToast('Biometría no disponible en este dispositivo.', 'danger');
        return;
      }

      const authorized = await this.biometricAuthService.authenticate('Inicia sesión con biometría');

      if (!authorized) {
        await this.showToast('Autenticación biométrica cancelada.', 'danger');
        return;
      }

      const credentials = await this.biometricAuthService.getCredentials();

      if (!credentials) {
        await this.showToast('No hay credenciales biométricas guardadas.', 'danger');
        return;
      }

      await this.authService.login(credentials.email, credentials.password);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error en login biométrico:', error);
      await this.showToast('No se pudo iniciar sesión con biometría.', 'danger');
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color,
      position: 'top'
    });

    await toast.present();
  }
}