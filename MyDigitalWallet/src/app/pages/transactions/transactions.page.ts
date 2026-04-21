import { Component, OnInit } from '@angular/core';
import { AlertController, IonItemSliding, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { CardService } from 'src/app/core/services/card.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { HapticsService } from 'src/app/core/services/haptics.service';
import { CardModel } from 'src/app/interfaces/card.interface';
import { TransactionModel } from 'src/app/interfaces/transaction.interface';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
  standalone: false
})
export class TransactionsPage implements OnInit {
  cards: CardModel[] = [];
  transactions: TransactionModel[] = [];
  selectedCardId = '';
  currentUserId = '';
  activeDateFilter = '';
  transactionsSub?: Subscription;

  showEmojiPicker = false;
  selectedTransaction: TransactionModel | null = null;
  pressTimer: any = null;

  constructor(
    private authService: AuthService,
    private cardService: CardService,
    private paymentsService: PaymentsService,
    private hapticsService: HapticsService,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

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

    this.cardService.getCardsByUser(currentUser.uid).subscribe({
      next: (cards) => {
        this.cards = cards;

        const savedCardId = localStorage.getItem(this.getSelectedCardStorageKey());
        const selectedFromStorage = cards.find(card => card.id === savedCardId);

        if (selectedFromStorage) {
          this.selectedCardId = selectedFromStorage.id || '';
        } else if (cards.length > 0) {
          this.selectedCardId = cards[0].id || '';
        }

        this.loadTransactions();
      },
      error: (error) => {
        console.error('Error cargando tarjetas:', error);
      }
    });
  }

  loadTransactions(): void {
    if (!this.currentUserId || !this.selectedCardId) {
      this.transactions = [];
      return;
    }

    this.transactionsSub?.unsubscribe();

    if (this.activeDateFilter) {
      this.transactionsSub = this.paymentsService
        .getTransactionsByCardAndDate(this.currentUserId, this.selectedCardId, this.activeDateFilter)
        .subscribe({
          next: (transactions) => {
            this.transactions = transactions;
          },
          error: (error) => {
            console.error('Error cargando transacciones por tarjeta y fecha:', error);
          }
        });
      return;
    }

    this.transactionsSub = this.paymentsService
      .getTransactionsByCard(this.currentUserId, this.selectedCardId)
      .subscribe({
        next: (transactions) => {
          this.transactions = transactions;
        },
        error: (error) => {
          console.error('Error cargando transacciones por tarjeta:', error);
        }
      });
  }

  async onCardChange(event: any): Promise<void> {
    this.selectedCardId = event?.detail?.value || '';
    localStorage.setItem(this.getSelectedCardStorageKey(), this.selectedCardId);
    await this.hapticsService.selection();
    this.loadTransactions();
  }

  filterTransactionsByDate(date: string): void {
    if (!date) {
      return;
    }

    this.activeDateFilter = date;
    this.loadTransactions();
  }

  clearDateFilter(): void {
    this.activeDateFilter = '';
    this.loadTransactions();
  }

  getSelectedCard(): CardModel | undefined {
    return this.cards.find(card => card.id === this.selectedCardId);
  }

  getMaskedCardNumber(cardNumber: string): string {
    const last4 = cardNumber.slice(-4);
    return `**** **** **** ${last4}`;
  }

  getTotalSpent(): number {
    return this.transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  }

  formatTransactionDate(dateValue: any): string {
    const date =
      dateValue?.toDate
        ? dateValue.toDate()
        : new Date(dateValue);

    return date.toLocaleString('es-CO', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  startPress(tx: TransactionModel): void {
    this.clearPress();
    this.pressTimer = setTimeout(() => {
      this.selectedTransaction = tx;
      this.showEmojiPicker = true;
    }, 2000);
  }

  clearPress(): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  async selectEmoji(event: any): Promise<void> {
    if (!this.selectedTransaction?.id) {
      this.showEmojiPicker = false;
      return;
    }

    const emoji = event?.emoji?.native || event?.emoji?.colons || '';
    if (!emoji) {
      return;
    }

    try {
      await this.paymentsService.updateTransactionEmoji(this.selectedTransaction.id, emoji);
      await this.hapticsService.light();
      await this.showToast('Emoji actualizado.', 'success');
    } catch (error) {
      console.error('Error actualizando emoji:', error);
      await this.showToast('No se pudo actualizar el emoji.', 'danger');
    } finally {
      this.showEmojiPicker = false;
      this.selectedTransaction = null;
    }
  }

  closeEmojiPicker(): void {
    this.showEmojiPicker = false;
    this.selectedTransaction = null;
  }

  async deleteTransaction(tx: TransactionModel, slidingItem?: IonItemSliding): Promise<void> {
    if (!tx.id) {
      await slidingItem?.close();
      await this.showToast('No se encontró el id de la transacción.', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar transacción',
      message: `¿Deseas eliminar la transacción de ${tx.merchant} por $ ${tx.amount.toLocaleString('es-CO')}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: async () => {
            await slidingItem?.close();
          }
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.paymentsService.deleteTransaction(tx.id!);
              await slidingItem?.close();
              await this.hapticsService.warning();
              await this.showToast('Transacción eliminada correctamente.', 'success');
            } catch (error) {
              console.error('Error eliminando transacción:', error);
              await slidingItem?.close();
              await this.showToast('No se pudo eliminar la transacción.', 'danger');
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