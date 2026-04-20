import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  query,
  where,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
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
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<TransactionModel[]>;
  }

  getRecentTransactionsByUser(userId: string): Observable<TransactionModel[]> {
    return this.getTransactionsByUser(userId);
  }

  getTransactionsByCard(userId: string, cardId: string): Observable<TransactionModel[]> {
    const ref = collection(this.firestore, this.path);
    const q = query(
      ref,
      where('userId', '==', userId),
      where('cardId', '==', cardId),
      orderBy('date', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<TransactionModel[]>;
  }

  getTransactionsByUserAndDate(userId: string, selectedDate: string): Observable<TransactionModel[]> {
    const { start, end } = this.buildLocalDayRange(selectedDate);

    const ref = collection(this.firestore, this.path);
    const q = query(
      ref,
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<TransactionModel[]>;
  }

  getTransactionsByCardAndDate(userId: string, cardId: string, selectedDate: string): Observable<TransactionModel[]> {
    const { start, end } = this.buildLocalDayRange(selectedDate);

    const ref = collection(this.firestore, this.path);
    const q = query(
      ref,
      where('userId', '==', userId),
      where('cardId', '==', cardId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<TransactionModel[]>;
  }

  private buildLocalDayRange(selectedDate: string): { start: Date; end: Date } {
    const [year, month, day] = selectedDate.split('-').map(Number);

    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);

    return { start, end };
  }

  deleteTransaction(transactionId: string) {
    return this.firestoreService.deleteDocument(this.path, transactionId);
  }

  updateTransactionEmoji(transactionId: string, emoji: string) {
    return this.firestoreService.updateDocument(this.path, transactionId, { emoji });
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