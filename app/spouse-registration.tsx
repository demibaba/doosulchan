// app/spouse-registration.tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import DefaultText from 'app/components/DefaultText';
import CustomAlert from './components/CustomAlert';

// 배우자 상태를 정의하는 열거형
export enum SpouseStatus {
  NONE = 'none',
  UNREGISTERED = 'unregistered',
  REQUESTED = 'requested',
  PENDING = 'pending',
  ACCEPTED = 'accepted'
}

export default function SpouseRegistrationPage() {
  const router = useRouter();
  const [spouseEmail, setSpouseEmail] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // **CustomAlert** 관련 상태 (title, message, 표시여부)
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // CustomAlert를 띄우는 헬퍼 함수
  const showCustomAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // 배우자 등록 요청 핸들러
  const handleRegisterSpouse = async () => {
    if (!spouseEmail) {
      // 표준 Alert 대신 CustomAlert를 쓰고 싶다면 아래처럼:
      showCustomAlert('알림', '상대방 이메일을 입력해 주세요!');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      showCustomAlert('오류', '현재 로그인한 사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);

    try {
      // 자신에게 요청을 보내는 것 방지
      if (spouseEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        showCustomAlert('오류', '자신에게 부부 등록 요청을 보낼 수 없습니다.');
        setLoading(false);
        return;
      }

      // Firestore에서 spouseEmail과 일치하는 사용자 검색
      const q = query(collection(db, 'users'), where('email', '==', spouseEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // 상대방이 아직 가입하지 않은 경우
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            spouseEmail,
            spouseStatus: SpouseStatus.UNREGISTERED,
          },
          { merge: true }
        );

        showCustomAlert(
          '부부 등록 요청',
          '상대방이 아직 가입하지 않았지만,\n 요청을 미리 기록했습니다.\n상대방이 가입 후 승인 절차를 진행해야 합니다.'
        );
        setRegistrationSuccess(true);
        setLoading(false);
        return;
      }

      // 가입된 사용자인 경우
      const spouseDoc = querySnapshot.docs[0];
      const spouseUid = spouseDoc.id;

      // spouseRequests 컬렉션에 요청 생성
      const requestId = `${currentUser.uid}_${spouseUid}`;
      await setDoc(doc(db, 'spouseRequests', requestId), {
        requesterId: currentUser.uid,
        recipientId: spouseUid,
        requesterEmail: currentUser.email,
        recipientEmail: spouseEmail,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // 내 정보 업데이트 (요청 보냄 상태)
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          pendingSpouseId: spouseUid,
          spouseStatus: SpouseStatus.REQUESTED,
          spouseEmail,
        },
        { merge: true }
      );

      // 상대방 문서 업데이트 (요청 받음 상태)
      await setDoc(
        doc(db, 'users', spouseUid),
        {
          pendingSpouseId: currentUser.uid,
          spouseStatus: SpouseStatus.PENDING,
          spouseEmail: currentUser.email,
        },
        { merge: true }
      );

      // **여기서도 표준 Alert 대신 CustomAlert 사용**
      showCustomAlert(
        '부부 등록 요청 완료',
        '상대방이 요청을 수락하면 부부 등록이 완료됩니다.'
      );
      setRegistrationSuccess(true);
    } catch (error: any) {
      console.error('부부 등록 전체 오류:', error);
      // **에러 발생 시에도 CustomAlert 표시**
      showCustomAlert(
        '부부 초대 오류',
        '상대방에게 초대 요청을 보내는 중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 캘린더 페이지로 이동
  const handleGoToCalendar = () => {
    router.push('/calendar');
  };

  // 건너뛰기
  const handleSkip = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            spouseStatus: SpouseStatus.NONE,
            spouseEmail: null,
            pendingSpouseId: null,
          },
          { merge: true }
        );
        router.push('/calendar');
      } catch (error) {
        console.error('건너뛰기 오류:', error);
        showCustomAlert('오류', '잠시 후 다시 시도해 주세요.');
      }
    } else {
      router.push('/calendar');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <DefaultText style={styles.title}>부부 등록</DefaultText>
        
        <DefaultText style={styles.description}>
          함께 사용할 상대방 이메일을 입력해주세요.{'\n'}
          상대방이 초대를 승인하면 다이어리를 {'\n'}   
          공유할 수 있습니다.
        </DefaultText>

        <TextInput
          style={styles.input}
          placeholder="상대방 이메일 주소 입력"
          placeholderTextColor="#aaa"
          value={spouseEmail}
          onChangeText={setSpouseEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleRegisterSpouse}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <DefaultText style={styles.buttonText}>부부 초대하기</DefaultText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <DefaultText style={styles.skipButtonText}>지금은 건너뛰기</DefaultText>
        </TouchableOpacity>

        {/* {registrationSuccess && (
          <TouchableOpacity style={styles.button} onPress={handleGoToCalendar}>
            <DefaultText style={styles.buttonText}>캘린더로 이동</DefaultText>
          </TouchableOpacity>
        )} */}
      </View>

      {/* CustomAlert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
        }}
      />
    </View>
  );
}

// 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    borderRadius: 10,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
