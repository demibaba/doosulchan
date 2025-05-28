// app/index.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { auth } from '../config/firebaseConfig'; // Firebase 설정
import { onAuthStateChanged, User } from 'firebase/auth';
import DefaultText from './components/DefaultText';

export default function Index() {
  const [user, setUser] = useState<User | null>(null); // ✅ 타입 명시
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 기존: if (loading) return null; // 로딩 화면
  // 개선: 예쁜 로딩 화면 표시
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DefaultText style={styles.appTitle}>EMOTION DIARY</DefaultText>
        <DefaultText style={styles.appSubtitle}>BE BETTER MARRIED</DefaultText>
        
        <ActivityIndicator 
          size="large" 
          color="#FFF" 
          style={styles.spinner}
        />
        
        <DefaultText style={styles.loadingText}>로딩 중...</DefaultText>
      </View>
    );
  }

  // 로그인 상태에 따른 분기
  if (user) {
    return <Redirect href="/calendar" />; // 메인 화면으로
  } else {
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