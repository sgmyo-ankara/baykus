import axios from 'axios';
import { auth } from '../lib/firebase';

// Backend Adresi (Doğru adres olduğundan emin ol)
const BASE_URL = "https://api.baykus.live";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR (İstek Atılmadan Önce Araya Gir)
// Burası her isteğe otomatik olarak Token ekler.
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  
  if (user) {
    // Firebase'den güncel token'ı al
    const token = await user.getIdToken();
    
    // Header'a ekle: "Authorization: Bearer <TOKEN>"
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});