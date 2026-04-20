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
  profileForm!: FormGroup;
  isSavingProfile = false;

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
    this.loadData();
  }

  initProfileForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      biometricEnabled: [false]
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
    const last4 = cardNumber.slice(-4);
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

  async openChangeCard(): Promise<void> {
    if (this.cards.length === 0) {
      await this.showToast('No tienes tarjetas registradas.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Seleccionar tarjeta',
      inputs: this.cards.map((card) => ({
        type: 'radio',
        label: `${card.brand.toUpperCase()} - ${this.getMaskedCardNumber(card.cardNumber)}`,
        value: card.id,
        checked: card.id === this.selectedCardId
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Seleccionar',
          handler: (selectedId: string) => {
            const selected = this.cards.find(card => card.id === selectedId);
            if (!selected) {
              return false;
            }

            this.selectedCardId = selectedId;
            this.featuredCard = selected;
            localStorage.setItem(this.getSelectedCardStorageKey(), selectedId);
            this.loadTransactionsForSelectedCard();
            return true;
          }
        }
      ]
    });

    await alert.present();
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

  async editCard(card: CardModel): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Editar tarjeta',
      inputs: [
        {
          name: 'holderName',
          type: 'text',
          placeholder: 'Nombre del titular',
          value: card.holderName
        },
        {
          name: 'cardNumber',
          type: 'text',
          placeholder: 'Número de tarjeta',
          value: this.cardService.formatCardNumber(card.cardNumber)
        },
        {
          name: 'expiryDate',
          type: 'text',
          placeholder: 'MM/YY',
          value: card.expiryDate
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            const formattedNumber = this.cardService.formatCardNumber(data.cardNumber || '');
            const formattedExpiry = this.cardService.formatExpiryDate(data.expiryDate || '');
            const detectedBrand = this.cardService.detectBrand(formattedNumber);

            if (!data.holderName || !formattedNumber || !formattedExpiry) {
              await this.showToast('Todos los campos son obligatorios.', 'danger');
              return false;
            }

            if (!this.cardService.isValidLuhn(formattedNumber)) {
              await this.showToast('Número de tarjeta inválido.', 'danger');
              return false;
            }

            if (!this.cardService.isValidExpiryDate(formattedExpiry)) {
              await this.showToast('Fecha de expiración inválida.', 'danger');
              return false;
            }

            if (detectedBrand === 'unknown') {
              await this.showToast('Solo se permiten Visa o Mastercard.', 'danger');
              return false;
            }

            if (!card.id) {
              await this.showToast('No se encontró el id de la tarjeta.', 'danger');
              return false;
            }

            try {
              await this.cardService.updateCard(card.id, {
                holderName: data.holderName,
                cardNumber: formattedNumber.replace(/\s/g, ''),
                expiryDate: formattedExpiry,
                brand: detectedBrand
              });

              await this.showToast('Tarjeta actualizada correctamente.', 'success');
              return true;
            } catch (error) {
              console.error('Error actualizando tarjeta:', error);
              await this.showToast('No se pudo actualizar la tarjeta.', 'danger');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
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