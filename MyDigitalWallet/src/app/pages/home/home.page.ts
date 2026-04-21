import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { CardService } from 'src/app/core/services/card.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { BiometricAuthService } from 'src/app/core/services/biometric-auth.service';
import { AppUser } from 'src/app/interfaces/user.interface';
import { CardModel } from 'src/app/interfaces/card.interface';
import { TransactionModel } from 'src/app/interfaces/transaction.interface';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  user: AppUser | null = null;
  cards: CardModel[] = [];
  transactions: TransactionModel[] = [];
  featuredCard: CardModel | null = null;
  isLoading = true;

  currentUserId = '';
  selectedCardId = '';
  transactionsSub?: Subscription;

  profileModalOpen = false;
  changeCardModalOpen = false;
  editCardModalOpen = false;

  profileForm!: FormGroup;
  editCardForm!: FormGroup;

  isSavingProfile = false;
  isChangingCard = false;
  isSavingCard = false;

  currentCarouselIndex = 0;

  touchStartX = 0;
  touchEndX = 0;

  editingCard: CardModel | null = null;

  editPreviewHolderName = 'YOUR NAME';
  editPreviewCardNumber = 'XXXX XXXX XXXX XXXX';
  editPreviewExpiryDate = 'MM/YY';
  editPreviewBrand: 'visa' | 'mastercard' | 'unknown' = 'unknown';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cardService: CardService,
    private paymentsService: PaymentsService,
    private biometricAuthService: BiometricAuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initProfileForm();
    this.initEditCardForm();
    this.listenEditPreviewChanges();
    this.loadData();
  }

  initProfileForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      biometricEnabled: [false]
    });
  }

  initEditCardForm(): void {
    this.editCardForm = this.fb.group({
      holderName: ['', [Validators.required, Validators.minLength(3)]],
      cardNumber: ['', [Validators.required]],
      expiryDate: ['', [Validators.required]]
    });
  }

  listenEditPreviewChanges(): void {
    this.editCardForm.get('holderName')?.valueChanges.subscribe((value: string) => {
      this.editPreviewHolderName = value?.trim() ? value.trim() : 'YOUR NAME';
    });

    this.editCardForm.get('cardNumber')?.valueChanges.subscribe((value: string) => {
      const formatted = this.cardService.formatCardNumber(value || '');
      this.editCardForm.get('cardNumber')?.setValue(formatted, { emitEvent: false });

      this.editPreviewCardNumber = formatted || 'XXXX XXXX XXXX XXXX';
      this.editPreviewBrand = this.cardService.detectBrand(formatted);
    });

    this.editCardForm.get('expiryDate')?.valueChanges.subscribe((value: string) => {
      const formatted = this.cardService.formatExpiryDate(value || '');
      this.editCardForm.get('expiryDate')?.setValue(formatted, { emitEvent: false });

      this.editPreviewExpiryDate = formatted || 'MM/YY';
    });
  }

  loadData(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUserId = currentUser.uid;

    this.userService.getUserProfile(currentUser.uid).subscribe({
      next: (profile) => {
        this.user = profile;
        this.profileForm.patchValue({
          name: profile.name || '',
          lastName: profile.lastName || '',
          biometricEnabled: !!profile.biometricEnabled
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
        this.isLoading = false;
      }
    });

    this.cardService.getCardsByUser(currentUser.uid).subscribe({
      next: (cards) => {
        this.cards = cards;

        if (cards.length === 0) {
          this.featuredCard = null;
          this.selectedCardId = '';
          this.transactions = [];
          return;
        }

        const savedCardId = localStorage.getItem(this.getSelectedCardStorageKey());
        const selectedFromStorage = cards.find(card => card.id === savedCardId);
        const selectedCard = selectedFromStorage || cards[0];

        this.featuredCard = selectedCard;
        this.selectedCardId = selectedCard.id || '';
        this.currentCarouselIndex = this.cards.findIndex(card => card.id === this.selectedCardId);
        if (this.currentCarouselIndex < 0) {
          this.currentCarouselIndex = 0;
        }
        this.loadTransactionsForSelectedCard();
      },
      error: (error) => {
        console.error('Error cargando tarjetas:', error);
      }
    });
  }

  loadTransactionsForSelectedCard(): void {
    if (!this.currentUserId || !this.selectedCardId) {
      this.transactions = [];
      return;
    }

    this.transactionsSub?.unsubscribe();

    this.transactionsSub = this.paymentsService
      .getTransactionsByCard(this.currentUserId, this.selectedCardId)
      .subscribe({
        next: (transactions) => {
          this.transactions = transactions.slice(0, 3);
        },
        error: (error) => {
          console.error('Error cargando transacciones por tarjeta:', error);
        }
      });
  }

  getSelectedCardStorageKey(): string {
    return `selected_card_${this.currentUserId}`;
  }

  getMaskedCardNumber(cardNumber: string): string {
    const digits = (cardNumber || '').replace(/\s/g, '');
    const last4 = digits.slice(-4);
    return `**** **** **** ${last4}`;
  }

  getCardClass(card: CardModel): string {
    if (card.brand === 'visa') {
      return 'visa-card';
    }

    if (card.brand === 'mastercard') {
      return 'mastercard-card';
    }

    return 'default-card';
  }

  getCardInfo(cardId: string): string {
    const card = this.cards.find(c => c.id === cardId);

    if (!card) {
      return 'Tarjeta no encontrada';
    }

    const last4 = card.cardNumber.slice(-4);
    return `${card.brand.toUpperCase()} - **** ${last4}`;
  }

  getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    if (hour < 19) {
      return 'Buenas tardes';
    }

    return 'Buenas noches';
  }

  openChangeCardModal(): void {
    if (this.cards.length === 0) {
      this.showToast('No tienes tarjetas registradas.', 'danger');
      return;
    }

    this.currentCarouselIndex = this.cards.findIndex(card => card.id === this.selectedCardId);
    if (this.currentCarouselIndex < 0) {
      this.currentCarouselIndex = 0;
    }

    this.changeCardModalOpen = true;
  }

  closeChangeCardModal(): void {
    this.changeCardModalOpen = false;
    this.isChangingCard = false;
  }

  getCurrentCarouselCard(): CardModel | null {
    if (!this.cards.length) {
      return null;
    }

    return this.cards[this.currentCarouselIndex] || null;
  }

  onCardTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onCardTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleCardSwipe();
  }

  handleCardSwipe(): void {
    const delta = this.touchEndX - this.touchStartX;

    if (Math.abs(delta) < 50) {
      return;
    }

    if (delta < 0) {
      this.nextCarouselCard();
    } else {
      this.previousCarouselCard();
    }
  }

  nextCarouselCard(): void {
    if (!this.cards.length) {
      return;
    }

    this.currentCarouselIndex =
      this.currentCarouselIndex === this.cards.length - 1 ? 0 : this.currentCarouselIndex + 1;
  }

  previousCarouselCard(): void {
    if (!this.cards.length) {
      return;
    }

    this.currentCarouselIndex =
      this.currentCarouselIndex === 0 ? this.cards.length - 1 : this.currentCarouselIndex - 1;
  }

  async applyCurrentCarouselCard(): Promise<void> {
    const selected = this.getCurrentCarouselCard();

    if (!selected || !selected.id) {
      return;
    }

    if (selected.id === this.selectedCardId) {
      this.closeChangeCardModal();
      return;
    }

    this.isChangingCard = true;

    this.selectedCardId = selected.id;
    this.featuredCard = selected;
    localStorage.setItem(this.getSelectedCardStorageKey(), selected.id);
    this.loadTransactionsForSelectedCard();

    setTimeout(() => {
      this.closeChangeCardModal();
    }, 260);
  }

  goToAddCard(): void {
    this.router.navigate(['/add-card']);
  }

  goToPayment(): void {
    if (!this.featuredCard) {
      this.showToast('Primero agrega una tarjeta.', 'danger');
      return;
    }

    this.router.navigate(['/payment']);
  }

  goToTransactions(): void {
    if (this.selectedCardId) {
      localStorage.setItem(this.getSelectedCardStorageKey(), this.selectedCardId);
    }

    this.router.navigate(['/transactions']);
  }

  openProfileModal(): void {
    if (this.user) {
      this.profileForm.patchValue({
        name: this.user.name || '',
        lastName: this.user.lastName || '',
        biometricEnabled: !!this.user.biometricEnabled
      });
    }

    this.profileModalOpen = true;
  }

  closeProfileModal(): void {
    this.profileModalOpen = false;
  }

  openEditCardModal(card: CardModel): void {
    this.editingCard = card;

    const formattedNumber = this.cardService.formatCardNumber(card.cardNumber);

    this.editCardForm.patchValue({
      holderName: card.holderName,
      cardNumber: formattedNumber,
      expiryDate: card.expiryDate
    });

    this.editPreviewHolderName = card.holderName || 'YOUR NAME';
    this.editPreviewCardNumber = formattedNumber || 'XXXX XXXX XXXX XXXX';
    this.editPreviewExpiryDate = card.expiryDate || 'MM/YY';
    this.editPreviewBrand = card.brand || 'unknown';

    this.editCardModalOpen = true;
  }

  closeEditCardModal(): void {
    this.editCardModalOpen = false;
    this.editingCard = null;
    this.isSavingCard = false;
  }

  getEditPreviewClass(): string {
    if (this.editPreviewBrand === 'visa') {
      return 'preview-visa';
    }

    if (this.editPreviewBrand === 'mastercard') {
      return 'preview-mastercard';
    }

    return 'preview-default';
  }

  async saveEditedCard(): Promise<void> {
    if (this.editCardForm.invalid || !this.editingCard?.id) {
      this.editCardForm.markAllAsTouched();
      return;
    }

    const holderName = this.editCardForm.value.holderName.trim();
    const cardNumberFormatted = this.cardService.formatCardNumber(this.editCardForm.value.cardNumber);
    const expiryDateFormatted = this.cardService.formatExpiryDate(this.editCardForm.value.expiryDate);
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

    this.isSavingCard = true;

    try {
      await this.cardService.updateCard(this.editingCard.id, {
        holderName,
        cardNumber: cardNumberFormatted.replace(/\s/g, ''),
        expiryDate: expiryDateFormatted,
        brand: detectedBrand
      });

      if (this.featuredCard?.id === this.editingCard.id) {
        this.featuredCard = {
          ...this.featuredCard,
          holderName,
          cardNumber: cardNumberFormatted.replace(/\s/g, ''),
          expiryDate: expiryDateFormatted,
          brand: detectedBrand
        };
      }

      await this.showToast('Tarjeta actualizada correctamente.', 'success');
      this.closeEditCardModal();
    } catch (error) {
      console.error('Error actualizando tarjeta:', error);
      await this.showToast('No se pudo actualizar la tarjeta.', 'danger');
    } finally {
      this.isSavingCard = false;
    }
  }

  async askCurrentPassword(): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Confirmar contraseña',
        message: 'Para habilitar el inicio biométrico en este dispositivo, ingresa tu contraseña actual.',
        inputs: [
          {
            name: 'password',
            type: 'password',
            placeholder: 'Contraseña actual'
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: 'Guardar',
            handler: (data) => resolve((data?.password || '').trim() || null)
          }
        ]
      });

      await alert.present();
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid || !this.currentUserId || !this.user) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const previousBiometricState = !!this.user.biometricEnabled;
    const nextBiometricState = !!this.profileForm.value.biometricEnabled;

    this.isSavingProfile = true;

    try {
      if (!previousBiometricState && nextBiometricState) {
        const password = await this.askCurrentPassword();

        if (!password) {
          this.isSavingProfile = false;
          return;
        }

        await this.biometricAuthService.saveCredentials(this.user.email, password);
      }

      if (previousBiometricState && !nextBiometricState) {
        await this.biometricAuthService.clearCredentials();
      }

      const formValue = this.profileForm.value;

      await this.userService.updateUserProfile(this.currentUserId, {
        name: formValue.name,
        lastName: formValue.lastName,
        biometricEnabled: nextBiometricState
      });

      this.user = {
        ...this.user,
        name: formValue.name,
        lastName: formValue.lastName,
        biometricEnabled: nextBiometricState
      };

      await this.showToast('Perfil actualizado correctamente.', 'success');
      this.profileModalOpen = false;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      await this.showToast('No se pudo actualizar el perfil.', 'danger');
    } finally {
      this.isSavingProfile = false;
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  async deleteCard(card: CardModel): Promise<void> {
    if (!card.id) {
      await this.showToast('No se encontró el id de la tarjeta.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar tarjeta',
      message: `¿Deseas eliminar la tarjeta terminada en ${card.cardNumber.slice(-4)}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.cardService.deleteCard(card.id!);
              await this.showToast('Tarjeta eliminada correctamente.', 'success');
            } catch (error) {
              console.error('Error eliminando tarjeta:', error);
              await this.showToast('No se pudo eliminar la tarjeta.', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });

    await toast.present();
  }
}