import { initializeApp } from "firebase/app"; 
import { 
  initializeAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import { getFirestore, initializeFirestore, enableNetwork } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Firebase 설정 (Firebase 콘솔에서 복사한 값)
const firebaseConfig = {
  apiKey: "AIzaSyAG2bCoMJpTWpEeZkHWWNs6HSrRryYREKc",
  authDomain: "emotion-diary-ca91e.firebaseapp.com",
  projectId: "emotion-diary-ca91e",
  storageBucket: "emotion-diary-ca91e.appspot.com",
  messagingSenderId: "232207972245",
  appId: "1:232207972245:web:c6ca804f71cfcaade2289c",
};

// ✅ Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// ✅ React Native 환경에서 로그인 상태를 유지하려면 initializeAuth + getReactNativePersistence(AsyncStorage)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Firestore DB (HTTP 폴링 설정 - 네트워크 환경에 따라 필요할 수 있음)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // WebSocket 대신 HTTP 폴링 사용 (필요한 경우에만)
});

// ✅ Firestore 네트워크 활성화 - 한 번만 호출
enableNetwork(db)
  .then(() => console.log("✅ Firestore 네트워크가 활성화되었습니다."))
  .catch((error) => console.error("❌ Firestore 네트워크 활성화 실패:", error));

// ✅ Google 로그인 제공자
const googleProvider = new GoogleAuthProvider();

// ✅ Google OAuth 클라이언트 ID (Expo 사용 시 필요)
export const GOOGLE_CLIENT_ID =
  "232207972245-2pu2jbh2sobm09q0usrndkqg8okl56d8.apps.googleusercontent.com"; // Web Client ID로 복구

// ✅ 내보내기
export { app, auth, db, googleProvider, AsyncStorage };