export interface CardModel {
  id?: string;
  userId: string;
  holderName: string;
  cardNumber: string;
  brand: 'visa' | 'mastercard' | 'unknown';
  expiryDate: string;
  cvv: string;
  createdAt?: any;
}