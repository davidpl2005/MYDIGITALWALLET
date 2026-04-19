import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { CardService } from 'src/app/core/services/card.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { CardModel } from 'src/app/interfaces/card.interface';

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

  constructor(
    private authService: AuthService,
    private cardService: CardService,
    private paymentsService: PaymentsService,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUserId = currentUser.uid;

    this.cardService.getCardsByUser(currentUser.uid).subscribe({
      next: (cards) => {
        this.cards = cards;

        if (cards.length > 0) {
          this.selectedCard = cards[0];
        }

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

  changeCard(card: CardModel): void {
    this.selectedCard = card;
  }

  async confirmPayment(): Promise<void> {
    if (!this.selectedCard || !this.selectedCard.id) {
      await this.showToast('No tienes tarjeta seleccionada', 'danger');
      return;
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

      await this.showToast('Pago realizado correctamente', 'success');
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error al procesar pago:', error);
      await this.showToast('Error al procesar pago', 'danger');
    }
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