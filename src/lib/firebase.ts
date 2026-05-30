import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let warned = false

/** Firebase 환경변수가 모두 설정되어 있는지 여부 */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

/** Firestore 인스턴스. 환경변수 미설정 시 null. 호출 시 lazy init. */
export function getDb(): Firestore | null {
  if (!isFirebaseConfigured()) {
    if (!warned) {
      console.info(
        '[firebase] VITE_FIREBASE_* 환경변수 미설정 → 로컬 모드로 동작 (Firestore 미러 비활성)',
      )
      warned = true
    }
    return null
  }
  if (!app) {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId!,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId!,
    })
  }
  if (!db) {
    // ignoreUndefinedProperties: InspectionResult 의 optional 필드(confidence, defects 등)가
    // undefined 인 채로 setDoc 에 들어가도 자동으로 제외해서 저장 실패를 막는다.
    db = initializeFirestore(app, { ignoreUndefinedProperties: true })
  }
  return db
}
