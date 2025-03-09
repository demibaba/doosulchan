// app/screens/spouse-requests.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  useEffect(() => {
    checkSpouseStatus();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;
      
      // 요청 문서 가져오기
      const requestDoc = await getDoc(doc(db, 'spouseRequests', requestId));
      if (!requestDoc.exists()) return;
      
      const requestData = requestDoc.data();
      const requesterId = requestData.requesterId;
      
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
      
      // 상태 다시 확인
      await checkSpouseStatus();
      
    } catch (error) {
      console.error('요청 수락 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;
      
      // 요청 문서 가져오기
      const requestDoc = await getDoc(doc(db, 'spouseRequests', requestId));
      if (!requestDoc.exists()) return;
      
      const requestData = requestDoc.data();
      const requesterId = requestData.requesterId;
      
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
      
      // 상태 다시 확인
      await checkSpouseStatus();
      
    } catch (error) {
      console.error('요청 거절 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToCalendar = () => {
    router.push('/calendar');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // 이미 부부등록이 완료된 경우
  if (spouseStatus === 'accepted') {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <DefaultText style={styles.title}>부부 등록 완료</DefaultText>
          <DefaultText style={styles.message}>
            {spouseName ? `${spouseName}님` : '배우자'}과(와) 부부 등록이 완료되었습니다.
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
      <DefaultText style={styles.title}>부부 등록 요청</DefaultText>
      {spouseRequests.map(request => (
        <View key={request.id} style={styles.requestItem}>
          <DefaultText style={styles.requestText}>
            {request.requesterEmail} 님이 부부 등록을 요청했습니다.
          </DefaultText>
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]} 
              onPress={() => acceptRequest(request.id)}
            >
              <DefaultText style={styles.actionButtonText}>수락</DefaultText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={() => rejectRequest(request.id)}
            >
              <DefaultText style={styles.actionButtonText}>거절</DefaultText>
            </TouchableOpacity>
          </View>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  requestItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  requestText: {
    fontSize: 16,
    marginBottom: 12,
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