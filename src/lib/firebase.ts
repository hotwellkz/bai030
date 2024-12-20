import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, runTransaction, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

let app;
let auth;
let db;

try {
  // Validate required Firebase config
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required Firebase configuration: ${missingFields.join(', ')}`);
  }

  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Provide fallback or show user-friendly error message
}

export { auth, db };

// Helper functions for tokens and lessons
export const deductTokens = async (userId: string, amount: number): Promise<boolean> => {
  if (!db || !auth) return false;

  const userRef = doc(db, 'profiles', userId);
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) return false;
      
      const currentTokens = userDoc.data().tokens;
      if (currentTokens < amount) return false;
      
      transaction.update(userRef, { tokens: currentTokens - amount });
      return true;
    });
    
    return result;
  } catch (error) {
    console.error('Error deducting tokens:', error);
    return false;
  }
};

export const markLessonComplete = async (userId: string, lessonId: string): Promise<void> => {
  if (!db || !auth) return;

  const lessonRef = doc(db, 'completed_lessons', `${userId}_${lessonId}`);
  
  await setDoc(lessonRef, {
    userId,
    lessonId,
    completedAt: new Date()
  });
};

export const getLessonStatus = async (userId: string, lessonId: string): Promise<boolean> => {
  if (!db || !auth) return false;

  const lessonRef = doc(db, 'completed_lessons', `${userId}_${lessonId}`);
  const docSnap = await getDoc(lessonRef);
  return docSnap.exists();
};