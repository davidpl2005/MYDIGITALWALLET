import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  isSubmitting = false;

  documentTypes: string[] = ['CC', 'TI', 'CE', 'PASAPORTE'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
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

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.registerForm.value;

      const userCredential = await this.authService.register(
        formValue.email,
        formValue.password
      );

      const uid = userCredential.user.uid;

      await this.userService.createUserProfile({
        uid,
        name: formValue.name,
        lastName: formValue.lastName,
        documentType: formValue.documentType,
        documentNumber: formValue.documentNumber,
        country: formValue.country,
        email: formValue.email,
        biometricEnabled: false,
        balance: 0,
        createdAt: new Date()
      });

      this.registerForm.reset();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error en registro:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}