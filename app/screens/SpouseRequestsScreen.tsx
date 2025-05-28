// app/screens/SpouseRequestsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';

// SpouseStatus 열거형 직접 정의
enum SpouseStatus {
  NONE = 'none',
  UNREGISTERED = 'unregistered',
  REQUESTED = 'requested',
  PENDING = 'pending',
  ACCEPTED = 'accepted'
}

export default function SpouseRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [spouseRequests, setSpouseRequests] = useState<any[]>([]);
  const [spouseStatus, setSpouseStatus] = useState<string | null>(null);
  const [spouseName, setSpouseName] = useState<string | null>(null);
  
  // ✅ 새로 추가: 피드백 상태
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    checkSpouseStatus();
  }, []);

  // ✅ 성공 메시지 표시 함수
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    
    // 3초 후 메시지 자동 사라짐
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 3000);
  };

  const checkSpouseStatus = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // 사용자 문서 가져오기
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      setSpouseStatus(userData.spouseStatus || 'none');
      
      // 배우자가 이미 승인된 상태인 경우 배우자 정보 가져오기
      if (userData.spouseStatus === 'accepted' && userData.spouseId) {
        const spouseDoc = await getDoc(doc(db, 'users', userData.spouseId));
        if (spouseDoc.exists()) {
          setSpouseName(spouseDoc.data().displayName || spouseDoc.data().email);
        }
        setLoading(false);
        return;
      }
      
      // 배우자 등록 요청이 대기 중인 경우만 요청 목록 조회
      if (userData.spouseStatus === 'pending') {
        const requestsRef = collection(db, 'spouseRequests');
        const q = query(
          requestsRef, 
          where('recipientId', '==', user.uid),
          where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSpouseRequests(requests);
      }
    } catch (error) {
      console.error('배우자 상태 확인 오류:', error);
      // ✅ 에러 시에도 사용자에게 알림
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      // ✅ 처리 중 상태 표시
      setProcessingRequestId(requestId);
      setLoading(true);
      
      const user = auth.currentUser;
      if (!user) return;
      
      // 요청 문서 가져오기
      const requestDoc = await getDoc(doc(db, 'spouseRequests', requestId));
      if (!requestDoc.exists()) return;
      
      const requestData = requestDoc.data();
      const requesterId = requestData.requesterId;
      const requesterEmail = requestData.requesterEmail;
      
      // 요청 상태 업데이트
      await updateDoc(doc(db, 'spouseRequests', requestId), {
        status: 'accepted'
      });
      
      // 내 상태 업데이트
      await updateDoc(doc(db, 'users', user.uid), {
        spouseId: requesterId,
        spouseStatus: 'accepted',
        pendingSpouseId: null
      });
      
      // 상대방 상태 업데이트
      await updateDoc(doc(db, 'users', requesterId), {
        spouseId: user.uid,
        spouseStatus: 'accepted',
        pendingSpouseId: null
      });
      
      // ✅ 성공 메시지 표시
      showSuccessMessage(`✅ ${requesterEmail}님과의 부부 등록이 완료되었습니다!`);
      
      // ✅ Alert로도 알림
      setTimeout(() => {
        Alert.alert(
          '부부 등록 완료! 🎉', 
          `${requesterEmail}님과 함께 다이어리를 작성할 수 있습니다.`,
          [
            { 
              text: '캘린더로 이동', 
              onPress: () => router.push('/calendar')
            }
          ]
        );
      }, 1000);
      
      // 상태 다시 확인
      await checkSpouseStatus();
      
    } catch (error) {
      console.error('요청 수락 오류:', error);
      // ✅ 에러 시 사용자 친화적 메시지
      Alert.alert(
        '오류 발생', 
        '요청을 수락하는 중 오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.',
        [
          { text: '다시 시도', onPress: () => acceptRequest(requestId) },
          { text: '취소', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setProcessingRequestId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      // ✅ 거절 확인 Alert 추가
      Alert.alert(
        '요청 거절', 
        '정말 이 부부 등록 요청을 거절하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '거절', 
            style: 'destructive',
            onPress: async () => {
              // ✅ 처리 중 상태 표시
              setProcessingRequestId(requestId);
              setLoading(true);
              
              const user = auth.currentUser;
              if (!user) return;
              
              try {
                // 요청 문서 가져오기
                const requestDoc = await getDoc(doc(db, 'spouseRequests', requestId));
                if (!requestDoc.exists()) return;
                
                const requestData = requestDoc.data();
                const requesterId = requestData.requesterId;
                const requesterEmail = requestData.requesterEmail;
                
                // 요청 상태 업데이트
                await updateDoc(doc(db, 'spouseRequests', requestId), {
                  status: 'rejected'
                });
                
                // 내 상태 업데이트
                await updateDoc(doc(db, 'users', user.uid), {
                  spouseStatus: 'none',
                  pendingSpouseId: null
                });
                
                // 상대방 상태 업데이트
                await updateDoc(doc(db, 'users', requesterId), {
                  spouseStatus: 'none',
                  pendingSpouseId: null
                });
                
                // ✅ 거절 완료 메시지
                showSuccessMessage(`${requesterEmail}님의 요청을 거절했습니다.`);
                
                // 상태 다시 확인
                await checkSpouseStatus();
                
              } catch (error) {
                console.error('요청 거절 오류:', error);
                Alert.alert('오류', '요청을 거절하는 중 오류가 발생했습니다.');
              } finally {
                setLoading(false);
                setProcessingRequestId(null);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('요청 거절 오류:', error);
    }
  };

  const goToCalendar = () => {
    router.push('/calendar');
  };

  if (loading && !processingRequestId) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <DefaultText style={styles.loadingText}>불러오는 중...</DefaultText>
        </View>
      </View>
    );
  }

  // 이미 부부등록이 완료된 경우
  if (spouseStatus === 'accepted') {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <DefaultText style={styles.title}>부부 등록 완료 🎉</DefaultText>
          <DefaultText style={styles.message}>
            {spouseName ? `${spouseName}님` : '배우자'}과(와) 부부 등록이 완료되었습니다.{'\n'}
            이제 함께 다이어리를 작성할 수 있어요!
          </DefaultText>
          <TouchableOpacity style={styles.button} onPress={goToCalendar}>
            <DefaultText style={styles.buttonText}>캘린더로 돌아가기</DefaultText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 부부등록 요청이 없는 경우
  if (spouseRequests.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <DefaultText style={styles.emptyText}>수신된 부부 등록 요청이 없습니다.</DefaultText>
          <DefaultText style={styles.emptySubText}>
            상대방이 부부 등록 요청을 보내면{'\n'}여기에 나타납니다.
          </DefaultText>
          <TouchableOpacity style={styles.button} onPress={goToCalendar}>
            <DefaultText style={styles.buttonText}>캘린더로 돌아가기</DefaultText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 부부등록 요청이 있는 경우
  return (
    <View style={styles.container}>
      {/* ✅ 성공 메시지 표시 */}
      {showSuccess && (
        <View style={styles.successContainer}>
          <DefaultText style={styles.successText}>{successMessage}</DefaultText>
        </View>
      )}
      
      <DefaultText style={styles.title}>부부 등록 요청</DefaultText>
      <DefaultText style={styles.subtitle}>
        받은 요청을 검토하고 수락 또는 거절하세요.
      </DefaultText>
      
      {spouseRequests.map(request => (
        <View key={request.id} style={styles.requestItem}>
          <DefaultText style={styles.requestText}>
            {request.requesterEmail} 님이 부부 등록을 요청했습니다.
          </DefaultText>
          
          {/* ✅ 처리 중일 때 로딩 표시 */}
          {processingRequestId === request.id ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <DefaultText style={styles.processingText}>처리 중...</DefaultText>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]} 
                onPress={() => acceptRequest(request.id)}
                disabled={loading}
              >
                <DefaultText style={styles.actionButtonText}>✅ 수락</DefaultText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]} 
                onPress={() => rejectRequest(request.id)}
                disabled={loading}
              >
                <DefaultText style={styles.actionButtonText}>❌ 거절</DefaultText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFF',
  },
  // ✅ 새로 추가: 성공 메시지 스타일
  successContainer: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#2E7D32',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  // ✅ 새로 추가: 로딩 컨테이너
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  // ✅ 새로 추가: 처리 중 스타일
  processingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  processingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  // ✅ 새로 추가: 부제목
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  // ✅ 새로 추가: 빈 상태 부제목
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  requestText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});