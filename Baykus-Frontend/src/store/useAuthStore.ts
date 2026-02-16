import { create } from 'zustand';
// 👇 DÜZELTME 1: Bizim User tipimiz için 'import type' eklendi
import type { User } from '../types';
// 👇 DÜZELTME 2: Firebase User tipi için 'import type' eklendi
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
  user: User | null;          
  firebaseUser: FirebaseUser | null; 
  isLoading: boolean;         
  
  setUser: (user: User | null) => void;
  setFirebaseUser: (fbUser: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: true, 

  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setLoading: (isLoading) => set({ isLoading }),
  
  logout: () => set({ user: null, firebaseUser: null, isLoading: false }),
}));