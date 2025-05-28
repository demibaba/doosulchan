// app/spouse-registration.tsx - 두 가지 옵션 추가
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, TextInput } from 'react-native';
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
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
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  
  // 초대 코드 입력 관련 state
  const [showInviteCodeInput, setShowInviteCodeInput] = useState(false);
  const [inputInviteCode, setInputInviteCode] = useState('');
  
  const router = useRouter();
  const currentUser = auth.currentUser;

  // CustomAlert를 띄우는 헬퍼 함수
  const showCustomAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // 초대 코드 생성 함수
  const generateInviteCode = async () => {
    const randomBytes = await Crypto.getRandomBytesAsync(6);
    return Array.from(randomBytes, byte => 
      byte.toString(36).toUpperCase()
    ).join('').substring(0, 6);
  };

  // 초대 링크 생성 및 공유
  const handleCreateInviteLink = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // 1. 초대 코드 생성
      const newInviteCode = await generateInviteCode();
      
      // 2. Firebase에 초대 정보 저장
      await setDoc(doc(db, 'invitations', newInviteCode), {
        inviterId: currentUser.uid,
        inviterName: currentUser.displayName || '사랑하는 사람',
        inviterEmail: currentUser.email,
        createdAt: new Date(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후 만료
      });
      
      // 3. 공유할 메시지 생성
      const inviteMessage = `💕 우리 부부다이어리 시작해요!
      
${currentUser.displayName || '사랑하는 사람'}님이 당신을 초대했어요.
함께 소중한 순간들을 기록해보세요 ✨

👇 링크를 클릭해서 참여하기
https://mydiary.app/invite/${newInviteCode}

📱 앱이 없다면 설치페이지로 이동됩니다.

🔐 또는 앱에서 초대코드 직접 입력: ${newInviteCode}`;

      // 4. 카톡/문자로 공유
      const shareResult = await Share.share({
        message: inviteMessage,
        title: '부부다이어리 초대 💝'
      });

      if (shareResult.action === Share.sharedAction) {
        setInviteCode(newInviteCode);
        setWaitingForPartner(true);
        
        // 상대방 응답 대기 시작
        startListeningForPartnerResponse(newInviteCode);
        
        showCustomAlert(
          "🎉 초대장을 보냈어요!",
          `상대방이 링크를 클릭하거나 초대코드 "${newInviteCode}"를 입력하면 자동으로 연결됩니다.\n\n잠시만 기다려주세요 💕`
        );
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error('초대 링크 생성 오류:', error);
      setLoading(false);
      showCustomAlert(
        "오류",
        "초대 링크 생성에 실패했어요. 다시 시도해주세요."
      );
    }
  };

  // 초대 코드로 참여하기
  const handleJoinWithCode = async () => {
    if (!inputInviteCode.trim()) {
      showCustomAlert('알림', '초대 코드를 입력해주세요.');
      return;
    }

    if (!currentUser) {
      showCustomAlert('오류', '로그인이 필요합니다.');
      return;
    }

    setLoading(true);

    try {
      // 1. 초대 코드 확인
      const inviteDoc = await getDoc(doc(db, 'invitations', inputInviteCode.toUpperCase()));
      
      if (!inviteDoc.exists()) {
        showCustomAlert('오류', '유효하지 않은 초대 코드입니다.');
        setLoading(false);
        return;
      }

      const inviteData = inviteDoc.data();
      
      // 2. 만료 확인
      if (inviteData.expiresAt.toDate() < new Date()) {
        showCustomAlert('오류', '만료된 초대 코드입니다.');
        setLoading(false);
        return;
      }

      // 3. 이미 사용된 코드 확인
      if (inviteData.status === 'accepted') {
        showCustomAlert('오류', '이미 사용된 초대 코드입니다.');
        setLoading(false);
        return;
      }

      // 4. 자기 자신 초대 방지
      if (inviteData.inviterId === currentUser.uid) {
        showCustomAlert('오류', '자신이 보낸 초대는 수락할 수 없습니다.');
        setLoading(false);
        return;
      }

      // 5. 초대 수락 처리
      await updateDoc(doc(db, 'invitations', inputInviteCode.toUpperCase()), {
        status: 'accepted',
        partnerId: currentUser.uid,
        partnerName: currentUser.displayName || '사용자',
        acceptedAt: new Date()
      });

      // 6. 양쪽 사용자 정보 업데이트
      await setDoc(doc(db, 'users', currentUser.uid), {
        spouseId: inviteData.inviterId,
        spouseEmail: inviteData.inviterEmail,
        spouseStatus: SpouseStatus.ACCEPTED,
        updatedAt: new Date()
      }, { merge: true });

      await setDoc(doc(db, 'users', inviteData.inviterId), {
        spouseId: currentUser.uid,
        spouseEmail: currentUser.email,
        spouseStatus: SpouseStatus.ACCEPTED,
        updatedAt: new Date()
      }, { merge: true });

      showCustomAlert(
        '🎉 연결 완료!',
        `${inviteData.inviterName}님과 성공적으로 연결되었습니다!\n이제 함께 다이어리를 작성해보세요 💕`
      );

      setTimeout(() => {
        router.replace('/calendar');
      }, 3000);

      setLoading(false);

    } catch (error) {
      console.error('초대 코드 처리 오류:', error);
      showCustomAlert('오류', '초대 코드 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 상대방 응답 대기
  const startListeningForPartnerResponse = (code: string) => {
    const unsubscribe = onSnapshot(doc(db, 'invitations', code), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === 'accepted' && data.partnerId) {
          handlePartnerConnected(data.partnerId, data.partnerName);
          unsubscribe();
        }
      }
    });
  };

  // 파트너 연결 완료 처리
  const handlePartnerConnected = async (partnerId: string, partnerName: string) => {
    try {
      await setDoc(doc(db, 'users', currentUser!.uid), {
        spouseId: partnerId,
        spouseStatus: SpouseStatus.ACCEPTED,
        updatedAt: new Date()
      }, { merge: true });

      showCustomAlert(
        "🎉 연결 완료!",
        `${partnerName}님과 성공적으로 연결되었습니다!\n이제 함께 다이어리를 작성해보세요 💕`
      );
      
      setTimeout(() => {
        router.replace('/calendar');
      }, 3000);
      
    } catch (error) {
      console.error('파트너 연결 오류:', error);
    }
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
        <DefaultText style={styles.title}>배우자와 함께 시작해요</DefaultText>
        
        <DefaultText style={styles.description}>
          초대 링크를 보내서 간편하게 연결하세요{'\n'}
          상대방이 링크를 클릭하면 자동으로{'\n'}
          부부다이어리가 연결됩니다 ✨
        </DefaultText>

        {!waitingForPartner && !showInviteCodeInput && (
          <>
            {/* 초대 링크 생성 버튼 */}
            <TouchableOpacity 
              style={[styles.inviteButton, loading && styles.disabledButton]}
              onPress={handleCreateInviteLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <DefaultText style={styles.inviteButtonText}>
                    💝 배우자 초대하기
                  </DefaultText>
                  <DefaultText style={styles.inviteSubText}>
                    카톡으로 초대 링크 보내기
                  </DefaultText>
                </>
              )}
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <DefaultText style={styles.dividerText}>또는</DefaultText>
              <View style={styles.dividerLine} />
            </View>

            {/* 초대 코드 입력 버튼 */}
            <TouchableOpacity 
              style={styles.inviteCodeButton}
              onPress={() => setShowInviteCodeInput(true)}
            >
              <DefaultText style={styles.inviteCodeButtonText}>
                🔐 초대 코드로 참여하기
              </DefaultText>
            </TouchableOpacity>
          </>
        )}

        {showInviteCodeInput && (
          // 초대 코드 입력 화면
          <View style={styles.inviteCodeContainer}>
            <DefaultText style={styles.inviteCodeTitle}>초대 코드 입력</DefaultText>
            <DefaultText style={styles.inviteCodeDesc}>
              상대방이 보낸 6자리 코드를 입력하세요
            </DefaultText>
            
            <TextInput
              style={styles.inviteCodeInput}
              placeholder="예: ABC123"
              placeholderTextColor="#666"
              value={inputInviteCode}
              onChangeText={setInputInviteCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            
            <TouchableOpacity
              style={[styles.joinButton, loading && styles.disabledButton]}
              onPress={handleJoinWithCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <DefaultText style={styles.joinButtonText}>
                  💕 부부다이어리 참여하기
                </DefaultText>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backToOptionsButton}
              onPress={() => setShowInviteCodeInput(false)}
            >
              <DefaultText style={styles.backToOptionsText}>← 다른 방법으로 연결하기</DefaultText>
            </TouchableOpacity>
          </View>
        )}

        {waitingForPartner && (
          // 상대방 응답 대기 화면
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" style={styles.waitingSpinner} />
            <DefaultText style={styles.waitingText}>
              상대방의 응답을 기다리고 있어요
            </DefaultText>
            <DefaultText style={styles.waitingSubText}>
              초대 코드: {inviteCode}
            </DefaultText>
          </View>
        )}

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <DefaultText style={styles.skipButtonText}>지금은 건너뛰기</DefaultText>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 24,
  },
  inviteButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  inviteSubText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#666666',
    fontSize: 14,
    paddingHorizontal: 15,
  },
  inviteCodeButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    minWidth: 280,
  },
  inviteCodeButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteCodeContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inviteCodeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  inviteCodeDesc: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
  },
  inviteCodeInput: {
    width: '100%',
    maxWidth: 200,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 15,
    color: '#FFFFFF',
    backgroundColor: '#111111',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  joinButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 280,
    marginBottom: 20,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backToOptionsButton: {
    paddingVertical: 10,
  },
  backToOptionsText: {
    color: '#888888',
    fontSize: 14,
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 30,
    backgroundColor: '#111111',
    borderRadius: 15,
    minWidth: 280,
  },
  waitingSpinner: {
    marginBottom: 20,
  },
  waitingText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  waitingSubText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#666666',
    shadowOpacity: 0,
    elevation: 0,
  },
  skipButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  skipButtonText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});