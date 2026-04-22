import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { CardService } from 'src/app/core/services/card.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { UserService } from 'src/app/core/services/user.service';
import { BiometricAuthService } from 'src/app/core/services/biometric-auth.service';
import { HapticsService } from 'src/app/core/services/haptics.service';
import { ToastNativeService } from 'src/app/core/services/toast-native.service';
import { CardModel } from 'src/app/interfaces/card.interface';
import { AppUser } from 'src/app/interfaces/user.interface';
import { NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: false
})
export class PaymentPage implements OnInit {
  cards: CardModel[] = [];
  selectedCard!: CardModel;

  merchant = '';
  amount = 0;

  currentUserId = '';
  isLoading = true;
  userProfile: AppUser | null = null;

  constructor(
    private authService: AuthService,
    private cardService: CardService,
    private notificationService: NotificationService,
    private paymentsService: PaymentsService,
    private userService: UserService,
    private biometricAuthService: BiometricAuthService,
    private hapticsService: HapticsService,
    private toastNativeService: ToastNativeService,
    private toastController: ToastController,
    private router: Router

  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  getSelectedCardStorageKey(): string {
    return `selected_card_${this.currentUserId}`;
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
        this.userProfile = profile;
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
      }
    });

    this.cardService.getCardsByUser(currentUser.uid).subscribe({
      next: (cards) => {
        this.cards = cards;

        if (!cards.length) {
          this.isLoading = false;
          return;
        }

        const savedCardId = localStorage.getItem(this.getSelectedCardStorageKey());
        const selectedFromStorage = cards.find(card => card.id === savedCardId);

        this.selectedCard = selectedFromStorage || cards[0];

        this.generateSimulation();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando tarjetas:', error);
        this.isLoading = false;
      }
    });
  }

  generateSimulation(): void {
    this.merchant = this.paymentsService.getRandomMerchant();
    this.amount = this.paymentsService.getRandomAmount();
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

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  async confirmPayment(): Promise<void> {
    if (!this.selectedCard || !this.selectedCard.id) {
      await this.showToast('No tienes tarjeta seleccionada.', 'danger');
      return;
    }

    if (this.userProfile?.biometricEnabled) {
      const authorized = await this.biometricAuthService.authenticate('Confirma tu identidad para procesar el pago');

      if (!authorized) {
        await this.hapticsService.error();
        await this.toastNativeService.error('Pago cancelado: autenticación requerida');
        await this.showToast('Pago cancelado: autenticación requerida.', 'danger');
        return;
      }
    }

    try {
      await this.paymentsService.createTransaction({
        userId: this.currentUserId,
        cardId: this.selectedCard.id,
        merchant: this.merchant,
        amount: this.amount,
        date: new Date(),
        type: 'payment'
      });
      
      await this.notificationService.sendPaymentNotification(this.merchant, this.amount);

      await this.hapticsService.success();
      await this.toastNativeService.success('Pago realizado correctamente');
      await this.showToast('Pago realizado correctamente.', 'success');
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error al procesar pago:', error);
      await this.toastNativeService.error('Error al procesar pago');
      await this.showToast('Error al procesar pago.', 'danger');
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