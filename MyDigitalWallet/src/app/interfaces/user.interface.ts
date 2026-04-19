export interface AppUser {
  uid: string;
  name: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  country: string;
  email: string;
  photoURL?: string;
  biometricEnabled?: boolean;
  balance?: number;
  createdAt?: any;
}