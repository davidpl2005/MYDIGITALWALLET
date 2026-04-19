import { Injectable } from '@angular/core';
import { collection, collectionData, Firestore, query, where, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { TransactionModel } from 'src/app/interfaces/transaction.interface';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private path = 'transactions';

  constructor(
    private firestore: Firestore,
    private firestoreService: FirestoreService
  ) {}

  createTransaction(transaction: TransactionModel) {
    return this.firestoreService.createDocument(this.path, transaction);
  }

  getTransactionsByUser(userId: string): Observable<TransactionModel[]> {
    const ref = collection(this.firestore, this.path);
    const q = query(ref, where('userId', '==', userId), orderBy('date', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<TransactionModel[]>;
  }

  deleteTransaction(transactionId: string) {
    return this.firestoreService.deleteDocument(this.path, transactionId);
  }

  getRandomMerchant(): string {
    const merchants = [
      'Amazon',
      'Netflix',
      'Spotify',
      'McDonald’s',
      'KFC',
      'Falabella',
      'Éxito',
      'D1',
      'Ara',
      'Mercado Libre'
    ];

    return merchants[Math.floor(Math.random() * merchants.length)];
  }

  getRandomAmount(): number {
    return Math.floor(Math.random() * 200000) + 1000;
  }
}