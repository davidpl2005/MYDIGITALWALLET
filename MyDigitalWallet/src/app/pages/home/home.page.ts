import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, IonItemSliding } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { CardService } from 'src/app/core/services/card.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
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
  isLoading = true;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cardService: CardService,
    private paymentsService: PaymentsService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
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

    this.userService.getUserProfile(currentUser.uid).subscribe({
      next: (profile) => {
        this.user = profile;
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
      },
      error: (error) => {
        console.error('Error cargando tarjetas:', error);
      }
    });

    this.paymentsService.getTransactionsByUser(currentUser.uid).subscribe({
      next: (transactions) => {
        this.transactions = transactions;
      },
      error: (error) => {
        console.error('Error cargando transacciones:', error);
      }
    });
  }

  getMaskedCardNumber(cardNumber: string): string {
    const last4 = cardNumber.slice(-4);
    return `**** **** **** ${last4}`;
  }

  getCardInfo(cardId: string): string {
    const card = this.cards.find(c => c.id === cardId);

    if (!card) {
      return 'Tarjeta no encontrada';
    }

    const last4 = card.cardNumber.slice(-4);
    return `${card.brand.toUpperCase()} - **** ${last4}`;
  }

  goToAddCard(): void {
    this.router.navigate(['/add-card']);
  }

  goToPayment(): void {
    this.router.navigate(['/payment']);
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