// app/components/SpouseStatusBar.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import DefaultText from './DefaultText';
import { useRouter } from 'expo-router';

interface SpouseStatusBarProps {
  onPress?: () => void;
}

const SpouseStatusBar: React.FC<SpouseStatusBarProps> = ({ onPress }) => {
  const router = useRouter();
  const [spouseStatus, setSpouseStatus] = useState<string | null>(null);
  const [spouseName, setSpouseName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSpouseStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        setSpouseStatus(userData.spouseStatus || 'none');

        // 배우자 정보 가져오기
        if (userData.spouseId && userData.spouseStatus === 'accepted') {
          const spouseDoc = await getDoc(doc(db, 'users', userData.spouseId));
          if (spouseDoc.exists()) {
            setSpouseName(spouseDoc.data().displayName || '배우자');
          }
        }
      } catch (error) {
        console.error('배우자 상태 확인 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSpouseStatus();
  }, []);

  if (loading || !spouseStatus) return null;

  // 상태에 따른 메시지와 스타일 결정
  let message = '';
  let backgroundColor = '#f0f0f0';
  let textColor = '#333';

  // if-else 구문으로 변경하여 타입 오류 방지
  if (spouseStatus === 'accepted') {
    message = `${spouseName || '배우자'}님과 함께 사용 중입니다`;
    backgroundColor = '#fff'; // 연한 녹색
    textColor = '#000'; // 검은색
  } else if (spouseStatus === 'requested') {
    message = '부부 등록 요청을 보냈습니다';
    backgroundColor = '#fff9c4'; // 연한 노랑
    textColor = '#f57f17'; // 주황색
  } else if (spouseStatus === 'pending') {
    message = '부부 등록 요청이 도착했습니다';
    backgroundColor = '#ffebee'; // 연한 빨강
    textColor = '#c62828'; // 진한 빨강
  } else if (spouseStatus === 'unregistered') {
    message = '초대한 배우자가 아직 가입하지 않았습니다';
    backgroundColor = '#f5f5f5';
    textColor = '#757575';
  } else {
    // none인 경우 또는 기타 상태
    return null; // 상태가 없으면 표시하지 않음
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if ((spouseStatus as string) === 'pending') {
      // 경로 확인 후 수정 - 파일 구조에 맞게 조정
      router.push('../spouse-requests');
    } else if ((spouseStatus as string) === 'none') {
      // 경로 확인 후 수정 - 파일 구조에 맞게 조정
      router.push('../spouse-registration');
    }
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor }]} onPress={handlePress}>
      <DefaultText style={[styles.text, { color: textColor }]}>{message}</DefaultText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  text: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SpouseStatusBar;