// app/index.tsx - 애착유형 온보딩 추가 버전
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { auth, db } from '../config/firebaseConfig'; // Firebase 설정
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DefaultText from './components/DefaultText';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // 로그인된 사용자의 온보딩 상태 확인
        setCheckingOnboarding(true);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          
          if (userData?.onboardingCompleted) {
            setOnboardingCompleted(true);
          } else {
            setOnboardingCompleted(false);
          }
        } catch (error) {
          console.error('온보딩 상태 확인 실패:', error);
          // 에러 시 온보딩 미완료로 처리
          setOnboardingCompleted(false);
        } finally {
          setCheckingOnboarding(false);
        }
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // 로딩 중이거나 온보딩 상태 확인 중
  if (loading || checkingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <DefaultText style={styles.appTitle}>EMOTION DIARY</DefaultText>
        <DefaultText style={styles.appSubtitle}>BE BETTER MARRIED</DefaultText>
        
        <ActivityIndicator 
          size="large" 
          color="#FFF" 
          style={styles.spinner}
        />
        
        <DefaultText style={styles.loadingText}>
          {loading ? '로딩 중...' : '사용자 정보 확인 중...'}
        </DefaultText>
      </View>
    );
  }

  // 라우팅 로직
  if (user) {
    // 로그인됨 → 온보딩 상태에 따라 분기
    if (onboardingCompleted) {
      return <Redirect href="/calendar" />; // 메인 화면으로
    } else {
      return <Redirect href="/attachment-test" />; // 애착유형 테스트로
    }
  } else {
    // 로그인 안 됨 → 로그인 화면으로
    return <Redirect href="/AuthScreen" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // AuthScreen과 동일한 검은 배경
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 50,
    textAlign: 'center',
  },
  spinner: {
    marginVertical: 20,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});