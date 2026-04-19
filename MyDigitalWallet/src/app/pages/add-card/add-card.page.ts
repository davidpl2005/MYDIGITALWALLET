import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { CardService } from 'src/app/core/services/card.service';

@Component({
  selector: 'app-add-card',
  templateUrl: './add-card.page.html',
  styleUrls: ['./add-card.page.scss'],
  standalone: false
})
export class AddCardPage implements OnInit {
  cardForm!: FormGroup;
  isSubmitting = false;
  detectedBrand: 'visa' | 'mastercard' | 'unknown' = 'unknown';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cardService: CardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.cardForm = this.fb.group({
      holderName: ['', [Validators.required]],
      cardNumber: ['', [Validators.required, Validators.minLength(19)]],
      expiryDate: ['', [Validators.required]],
      cvv: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]]
    });
  }

  get f() {
    return this.cardForm.controls;
  }

  onCardNumberInput(event: any): void {
    const formatted = this.cardService.formatCardNumber(event.target.value);
    this.cardForm.get('cardNumber')?.setValue(formatted, { emitEvent: false });
    this.detectedBrand = this.cardService.detectBrand(formatted);
  }

  onExpiryInput(event: any): void {
    const formatted = this.cardService.formatExpiryDate(event.target.value);
    this.cardForm.get('expiryDate')?.setValue(formatted, { emitEvent: false });
  }

  onCvvInput(event: any): void {
    const digits = event.target.value.replace(/\D/g, '').substring(0, 4);
    this.cardForm.get('cvv')?.setValue(digits, { emitEvent: false });
  }

  async onSubmit(): Promise<void> {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const formValue = this.cardForm.value;

    if (!this.cardService.isValidLuhn(formValue.cardNumber)) {
      this.errorMessage = 'El número de tarjeta no es válido según Luhn.';
      return;
    }

    if (!this.cardService.isValidExpiryDate(formValue.expiryDate)) {
      this.errorMessage = 'La fecha de expiración no es válida.';
      return;
    }

    if (this.detectedBrand === 'unknown') {
      this.errorMessage = 'Solo se permiten tarjetas Visa o Mastercard.';
      return;
    }

    this.isSubmitting = true;

    try {
      await this.cardService.createCard({
        userId: currentUser.uid,
        holderName: formValue.holderName,
        cardNumber: formValue.cardNumber.replace(/\s/g, ''),
        brand: this.detectedBrand,
        expiryDate: formValue.expiryDate,
        cvv: formValue.cvv,
        createdAt: new Date()
      });

      this.cardForm.reset();
      this.detectedBrand = 'unknown';
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error guardando tarjeta:', error);
      this.errorMessage = 'No se pudo guardar la tarjeta.';
    } finally {
      this.isSubmitting = false;
    }
  }
}