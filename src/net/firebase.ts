// Khởi tạo Firebase một lần, đăng nhập ẩn danh nếu chưa có tài khoản.
// Chỉ được tải bằng import động (chơi một mình không mạng vẫn mở game được).
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

export function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export function auth(): Auth {
  return getAuth(app());
}

export function db(): Database {
  return getDatabase(app());
}

/** Tài khoản hiện tại; chưa có thì đăng nhập ẩn danh (tài khoản khách). */
export async function connect(): Promise<{ db: Database; uid: string }> {
  const a = auth();
  // Chờ Firebase đọc lại tài khoản đã lưu trên máy (nếu có) trước khi tạo tài khoản khách mới
  await a.authStateReady();
  const user = a.currentUser ?? (await signInAnonymously(a)).user;
  return { db: db(), uid: user.uid };
}
