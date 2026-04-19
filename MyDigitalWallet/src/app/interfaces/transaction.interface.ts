export interface TransactionModel {
  id?: string;
  userId: string;
  cardId: string;
  merchant: string;
  amount: number;
  date: any;
  type: 'payment' | 'topup' | 'transfer';
  emoji?: string;
}