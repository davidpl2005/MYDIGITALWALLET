import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { CardService } from 'src/app/core/services/card.service';
import { HapticsService } from 'src/app/core/services/haptics.service';
import { CardModel } from 'src/app/interfaces/card.interface';

@Component({
  selector: 'app-add-card',
  templateUrl: './add-card.page.html',
  styleUrls: ['./add-card.page.scss'],
  standalone: false
})
export class AddCardPage implements OnInit {
  cardForm!: FormGroup;
  isSubmitting = false;

  previewHolderName = 'YOUR NAME';
  previewCardNumber = 'XXXX XXXX XXXX XXXX';
  previewExpiryDate = 'MM/YY';
  previewBrand: 'visa' | 'mastercard' | 'unknown' = 'unknown';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cardService: CardService,
    private hapticsService: HapticsService,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.listenPreviewChanges();
  }

  initForm(): void {
    this.cardForm = this.fb.group({
      holderName: ['', [Validators.required, Validators.minLength(3)]],
      cardNumber: ['', [Validators.required]],
      expiryDate: ['', [Validators.required]],
      cvv: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]]
    });
  }

  get f() {
    return this.cardForm.controls;
  }

  listenPreviewChanges(): void {
    this.cardForm.get('holderName')?.valueChanges.subscribe((value: string) => {
      this.previewHolderName = value?.trim() ? value.trim().toUpperCase() : 'YOUR NAME';
    });

    this.cardForm.get('cardNumber')?.valueChanges.subscribe((value: string) => {
      const formatted = this.cardService.formatCardNumber(value || '');
      this.cardForm.get('cardNumber')?.setValue(formatted, { emitEvent: false });

      this.previewCardNumber = formatted || 'XXXX XXXX XXXX XXXX';
      this.previewBrand = this.cardService.detectBrand(formatted);
    });

    this.cardForm.get('expiryDate')?.valueChanges.subscribe((value: string) => {
      const formatted = this.cardService.formatExpiryDate(value || '');
      this.cardForm.get('expiryDate')?.setValue(formatted, { emitEvent: false });

      this.previewExpiryDate = formatted || 'MM/YY';
    });

    this.cardForm.get('cvv')?.valueChanges.subscribe((value: string) => {
      const digits = (value || '').replace(/\D/g, '').substring(0, 4);
      this.cardForm.get('cvv')?.setValue(digits, { emitEvent: false });
    });
  }

  getPreviewCardClass(): string {
    if (this.previewBrand === 'visa') {
      return 'preview-visa';
    }

    if (this.previewBrand === 'mastercard') {
      return 'preview-mastercard';
    }

    return 'preview-default';
  }

  async onSubmit(): Promise<void> {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      await this.showToast('Sesión no válida.', 'danger');
      this.router.navigate(['/login']);
      return;
    }

    const holderName = this.cardForm.value.holderName.trim();
    const cardNumberFormatted = this.cardService.formatCardNumber(this.cardForm.value.cardNumber);
    const expiryDateFormatted = this.cardService.formatExpiryDate(this.cardForm.value.expiryDate);
    const cvv = this.cardForm.value.cvv;
    const detectedBrand = this.cardService.detectBrand(cardNumberFormatted);

    if (!this.cardService.isValidLuhn(cardNumberFormatted)) {
      await this.showToast('Número de tarjeta inválido.', 'danger');
      return;
    }

    if (!this.cardService.isValidExpiryDate(expiryDateFormatted)) {
      await this.showToast('Fecha de expiración inválida.', 'danger');
      return;
    }

    if (detectedBrand === 'unknown') {
      await this.showToast('Solo se permiten Visa o Mastercard.', 'danger');
      return;
    }

    this.isSubmitting = true;

    try {
      const cardData: CardModel = {
        userId: currentUser.uid,
        holderName,
        cardNumber: cardNumberFormatted.replace(/\s/g, ''),
        expiryDate: expiryDateFormatted,
        cvv,
        brand: detectedBrand,
        createdAt: new Date()
      };

      await this.cardService.createCard(cardData);
      await this.hapticsService.success();
      await this.showToast('Tarjeta agregada correctamente.', 'success');

      this.cardForm.reset();
      this.previewHolderName = 'YOUR NAME';
      this.previewCardNumber = 'XXXX XXXX XXXX XXXX';
      this.previewExpiryDate = 'MM/YY';
      this.previewBrand = 'unknown';

      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error agregando tarjeta:', error);
      await this.showToast('No se pudo agregar la tarjeta.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
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