import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBr8Ch1B8YCx6AC7uTcrZIhD5D3s-iSxy4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sanad-3c558.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sanad-3c558",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sanad-3c558.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "554367915579",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:554367915579:web:4f84e49e0f5de028372e1e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-J65ZVM25ND",
}

// تهيئة تطبيق Firebase بشكل آمن يمنع التكرار ويدعم SSR في Next.js
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

// خدمة التحقق والمصادقة (Google + Phone Auth)
export const auth: Auth = getAuth(app)
auth.useDeviceLanguage()

// موفّر تسجيل الدخول المباشر بحساب Google
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account',
})
