import { Injectable } from '@angular/core';
import { collection, collectionData, Firestore, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { CardModel } from 'src/app/interfaces/card.interface';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private path = 'cards';

  constructor(
    private firestore: Firestore,
    private firestoreService: FirestoreService
  ) {}

  createCard(card: CardModel) {
    return this.firestoreService.createDocument(this.path, card);
  }

  getCardsByUser(userId: string): Observable<CardModel[]> {
    const ref = collection(this.firestore, this.path);
    const q = query(ref, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<CardModel[]>;
  }

  updateCard(cardId: string, data: Partial<CardModel>) {
    return this.firestoreService.updateDocument(this.path, cardId, data);
  }

  deleteCard(cardId: string) {
    return this.firestoreService.deleteDocument(this.path, cardId);
  }

  detectBrand(cardNumber: string): 'visa' | 'mastercard' | 'unknown' {
    const cleanNumber = cardNumber.replace(/\s/g, '');

    if (/^4/.test(cleanNumber)) {
      return 'visa';
    }

    const firstTwo = parseInt(cleanNumber.substring(0, 2), 10);
    const firstFour = parseInt(cleanNumber.substring(0, 4), 10);

    if (
      (firstTwo >= 51 && firstTwo <= 55) ||
      (firstFour >= 2221 && firstFour <= 2720)
    ) {
      return 'mastercard';
    }

    return 'unknown';
  }

  isValidLuhn(cardNumber: string): boolean {
    const cleanNumber = cardNumber.replace(/\s/g, '');

    if (!/^\d+$/.test(cleanNumber)) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, '').substring(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiryDate(value: string): string {
    const digits = value.replace(/\D/g, '').substring(0, 4);

    if (digits.length <= 2) {
      return digits;
    }

    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
  }

  isValidExpiryDate(expiry: string): boolean {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      return false;
    }

    const [monthStr, yearStr] = expiry.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(`20${yearStr}`, 10);

    if (month < 1 || month > 12) {
      return false;
    }

    const now = new Date();
    const expiryDate = new Date(year, month);
    return expiryDate > now;
  }
}