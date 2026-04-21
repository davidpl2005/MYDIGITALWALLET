import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { AppUser } from 'src/app/interfaces/user.interface';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      documentType: ['', [Validators.required]],
      documentNumber: ['', [Validators.required]],
      country: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const formValue = this.registerForm.value;

      const credential = await this.authService.register(
        formValue.email,
        formValue.password
      );

      const userProfile: AppUser = {
        uid: credential.user.uid,
        name: formValue.name,
        lastName: formValue.lastName,
        documentType: formValue.documentType,
        documentNumber: formValue.documentNumber,
        country: formValue.country,
        email: formValue.email,
        biometricEnabled: false,
        balance: 0,
        createdAt: new Date()
      };

      await this.userService.createUserProfile(userProfile);

      await this.showToast('Cuenta creada correctamente.', 'success');
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error en registro:', error);

      if (error?.code === 'auth/email-already-in-use') {
        this.errorMessage = 'Este correo ya está registrado.';
      } else if (error?.code === 'auth/invalid-email') {
        this.errorMessage = 'El correo no es válido.';
      } else if (error?.code === 'auth/weak-password') {
        this.errorMessage = 'La contraseña es demasiado débil.';
      } else {
        this.errorMessage = 'No se pudo crear la cuenta.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
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