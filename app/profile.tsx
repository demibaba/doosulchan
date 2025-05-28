// app/profile.tsx - 고급 감성 웜톤 리파인 버전
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import DefaultText from './components/DefaultText';
import { Feather } from '@expo/vector-icons'; // Feather Icons 추가

// Feather Icons로 통일된 아이콘 컴포넌트들
const UserIcon = () => <Feather name="user" size={20} color="#C7A488" />;
const HeartIcon = () => <Feather name="heart" size={20} color="#C7A488" />;
const BrainIcon = () => <Feather name="compass" size={20} color="#C7A488" />;
const StatsIcon = () => <Feather name="bar-chart-2" size={20} color="#C7A488" />;
const SettingsIcon = () => <Feather name="settings" size={20} color="#C7A488" />;
const ReportIcon = () => <Feather name="file-text" size={20} color="#C7A488" />;
const RequestIcon = () => <Feather name="mail" size={20} color="#C7A488" />;

interface UserData {
  displayName?: string;
  email?: string;
  createdAt?: string;
  spouseStatus?: string;
  personalityType?: string;
  personalityResult?: any;
  profileImage?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [diaryStats, setDiaryStats] = useState({
    total: 0,
    thisMonth: 0,
    consecutiveDays: 0
  });

  useEffect(() => {
    loadUserData();
    checkPendingRequests();
    loadDiaryStats();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRequests = async () => {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'spouseRequests'),
        where('recipientId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      setPendingRequests(snapshot.size);
    } catch (error) {
      console.error('요청 확인 오류:', error);
    }
  };

  const loadDiaryStats = async () => {
    if (!auth.currentUser) return;
    
    try {
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const total = querySnapshot.size;
      
      // 이번 달 통계 계산
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      let thisMonth = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          const diaryDate = new Date(data.date);
          if (diaryDate.getMonth() === currentMonth && diaryDate.getFullYear() === currentYear) {
            thisMonth++;
          }
        }
      });
      
      setDiaryStats({
        total,
        thisMonth,
        consecutiveDays: 0 // 연속 일수는 나중에 구현
      });
    } catch (error) {
      console.error('다이어리 통계 로드 실패:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "안녕히 가세요",
      "정말 로그아웃하시겠어요?\n언제든 다시 돌아와 주세요 🤍",
      [
        { text: "머물기", style: "cancel" },
        { 
          text: "로그아웃", 
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/AuthScreen');
            } catch (error) {
              Alert.alert("앗, 문제가 생겼어요", "잠시 후 다시 시도해주세요");
            }
          }
        }
      ]
    );
  };

  const getPersonalityEmoji = (type: string) => {
    const emojiMap: { [key: string]: string } = {
      'romantic_dreamer': '🌸',
      'deep_communicator': '💎',
      'warm_daily': '🏠',
      'energy_pumper': '⚡'
    };
    return emojiMap[type] || '✨';
  };

  const getPersonalityTitle = (type: string) => {
    const titleMap: { [key: string]: string } = {
      'romantic_dreamer': '로맨틱 드리머',
      'deep_communicator': '깊이있는 소통가',
      'warm_daily': '따뜻한 일상러',
      'energy_pumper': '에너지 뿜뿜이'
    };
    return titleMap[type] || '아직 알아가는 중';
  };

  const getSpouseStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '함께하고 있어요';
      case 'pending': return '연결 대기중';
      case 'none': return '아직 혼자예요';
      default: return '아직 혼자예요';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DefaultText style={styles.loadingText}>잠시만 기다려주세요...</DefaultText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <DefaultText style={styles.headerTitle}>나의 공간</DefaultText>
        <DefaultText style={styles.headerSubtitle}>소중한 이야기들이 담긴 곳</DefaultText>
      </View>

      {/* 프로필 카드 */}
      <View style={styles.card}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {userData?.profileImage ? (
              <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultProfileImage}>
                <DefaultText style={styles.profileImageText}>
                  {userData?.displayName ? 
                    userData.displayName.length > 1 ? 
                      userData.displayName.slice(-2)
                      : userData.displayName.charAt(0) 
                    : '👤'}
                </DefaultText>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <DefaultText style={styles.userName}>
              안녕하세요, {userData?.displayName || '익명'}님
            </DefaultText>
            <DefaultText style={styles.userEmail} numberOfLines={2} ellipsizeMode="tail">
              {userData?.email}
            </DefaultText>
            <DefaultText style={styles.joinDate}>
              {userData?.createdAt ? 
                `${new Date(userData.createdAt).getFullYear()}년 ${new Date(userData.createdAt).getMonth() + 1}월부터 함께` 
                : '함께한 시간을 기록하고 있어요'}
            </DefaultText>
          </View>
        </View>
      </View>

      {/* 심리테스트 결과 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BrainIcon />
          <DefaultText style={styles.cardTitle}>나의 관계 성향</DefaultText>
        </View>
        {userData?.personalityType ? (
          <View style={styles.personalityContent}>
            <View style={styles.personalityMain}>
              <DefaultText style={styles.personalityEmoji}>
                {getPersonalityEmoji(userData.personalityType)}
              </DefaultText>
              <DefaultText style={styles.personalityTitle}>
                {getPersonalityTitle(userData.personalityType)}
              </DefaultText>
            </View>
            <DefaultText style={styles.personalityDescription}>
              {userData.personalityResult?.description || '당신만의 특별한 이야기가 있어요'}
            </DefaultText>
            <TouchableOpacity 
              style={styles.retestButton}
              onPress={() => router.push('/psychology-test')}
            >
              <DefaultText style={styles.retestButtonText}>다시 알아보기</DefaultText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noPersonalityContent}>
            <DefaultText style={styles.noPersonalityText}>
              어떤 분이신지 더 알고 싶어요{'\n'}3분이면 충분해요
            </DefaultText>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => router.push('/psychology-test')}
            >
              <DefaultText style={styles.testButtonText}>성향 알아보기</DefaultText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 부부 연결 상태 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <HeartIcon />
          <DefaultText style={styles.cardTitle}>우리 이야기</DefaultText>
        </View>
        <View style={styles.spouseContent}>
          <View style={styles.spouseStatus}>
            <DefaultText style={styles.statusLabel}>현재 상태</DefaultText>
            <View style={[
              styles.statusBadge, 
              userData?.spouseStatus === 'connected' && styles.statusConnected,
              userData?.spouseStatus === 'pending' && styles.statusPending
            ]}>
              <DefaultText style={[
                styles.statusText,
                userData?.spouseStatus === 'connected' && styles.statusTextConnected
              ]}>
                {getSpouseStatusText(userData?.spouseStatus || 'none')}
              </DefaultText>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.spouseButton}
            onPress={() => router.push('/spouse-registration')}
          >
            <DefaultText style={styles.spouseButtonText}>
              {userData?.spouseStatus === 'connected' ? '함께하는 사람 보기' : '소중한 사람과 연결하기'}
            </DefaultText>
          </TouchableOpacity>

          {/* 부부 요청 확인 버튼 추가 */}
          {pendingRequests > 0 && (
            <TouchableOpacity 
              style={styles.requestButton}
              onPress={() => router.push('/screens/spouse-requests')}
            >
              <RequestIcon />
              <DefaultText style={styles.requestButtonText}>
                새로운 연결 요청이 있어요 ({pendingRequests}개)
              </DefaultText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 나의 기록 통계 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ReportIcon />
          <DefaultText style={styles.cardTitle}>나의 기록들</DefaultText>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <DefaultText style={styles.statNumber}>{diaryStats.total}</DefaultText>
            <DefaultText style={styles.statLabel}>총 다이어리</DefaultText>
          </View>
          <View style={styles.statItem}>
            <DefaultText style={styles.statNumber}>{diaryStats.thisMonth}</DefaultText>
            <DefaultText style={styles.statLabel}>이번 달</DefaultText>
          </View>
          <View style={styles.statItem}>
            <DefaultText style={styles.statNumber}>{diaryStats.consecutiveDays}</DefaultText>
            <DefaultText style={styles.statLabel}>연속 기록</DefaultText>
          </View>
        </View>
        
        {/* 내 레포트함 버튼 추가 */}
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => router.push('/reports')}
        >
          <StatsIcon />
          <DefaultText style={styles.reportButtonText}>내 레포트함 보기</DefaultText>
        </TouchableOpacity>
      </View>

      {/* 설정 메뉴 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <SettingsIcon />
          <DefaultText style={styles.cardTitle}>개인 설정</DefaultText>
        </View>
        <View style={styles.settingsContent}>
          <TouchableOpacity style={styles.settingItem}>
            <DefaultText style={styles.settingText}>알림과 소식</DefaultText>
            <DefaultText style={styles.settingArrow}>›</DefaultText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <DefaultText style={styles.settingText}>화면 테마</DefaultText>
            <DefaultText style={styles.settingArrow}>›</DefaultText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <DefaultText style={styles.settingText}>도움이 필요해요</DefaultText>
            <DefaultText style={styles.settingArrow}>›</DefaultText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 로그아웃 카드 */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <DefaultText style={styles.logoutText}>잠시 떠나기</DefaultText>
        </TouchableOpacity>
      </View>

      {/* 하단 여백 */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7', // 따뜻한 아이보리
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFBF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingText: {
    color: '#8A817C',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '400',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 32,
    paddingHorizontal: 28,
    backgroundColor: '#FFFBF7',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B3029',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8A817C',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#3B3029',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F9F6F3',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B3029',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  // iconText 스타일 제거 (Feather Icons 사용으로 불필요)
  // 프로필 섹션
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 20,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  defaultProfileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#B5896D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#3B3029',
    marginBottom: 6,
    lineHeight: 28,
  },
  userEmail: {
    fontSize: 12, // 더 작게 만들어서 깔끔하게
    color: '#8A817C',
    marginBottom: 4,
    fontWeight: '400',
    lineHeight: 16, // 줄 간격 추가
  },
  joinDate: {
    fontSize: 13,
    color: '#B5896D',
    fontWeight: '400',
    lineHeight: 18,
  },
  // 심리테스트 섹션
  personalityContent: {
    alignItems: 'center',
  },
  personalityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  personalityEmoji: {
    fontSize: 28, // 더 작게 조정
    marginRight: 12, // 간격 약간 줄임
  },
  personalityTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#3B3029',
  },
  personalityDescription: {
    fontSize: 15,
    color: '#8A817C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  retestButton: {
    backgroundColor: '#F9F6F3', // 연한 배경으로 통일
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  retestButtonText: {
    color: '#C7A488', // 텍스트 색상
    fontSize: 15,
    fontWeight: '500',
  },
  noPersonalityContent: {
    alignItems: 'center',
  },
  noPersonalityText: {
    fontSize: 15,
    color: '#8A817C',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  testButton: {
    backgroundColor: '#F9F6F3', // 연한 배경으로 통일
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  testButtonText: {
    color: '#C7A488', // 텍스트 색상
    fontSize: 16,
    fontWeight: '600',
  },
  // 부부 연결 섹션
  spouseContent: {
    gap: 20,
  },
  spouseStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: '#3B3029',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#F9F6F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  statusConnected: {
    backgroundColor: '#B5896D',
    borderColor: '#B5896D',
  },
  statusPending: {
    backgroundColor: '#F9F6F3',
    borderColor: '#B5896D',
  },
  statusText: {
    fontSize: 13,
    color: '#8A817C',
    fontWeight: '500',
  },
  statusTextConnected: {
    color: '#FFFFFF',
  },
  spouseButton: {
    backgroundColor: '#F9F6F3', // 연한 배경으로 통일
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  spouseButtonText: {
    color: '#C7A488', // 텍스트 색상
    fontSize: 16,
    fontWeight: '500',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F6F3', // 이미 통일된 스타일
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB', // 기존과 동일
  },
  requestButtonText: {
    color: '#C7A488', // 버튼 텍스트도 통일된 색상으로
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  // 통계 섹션
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#C7A488', // 통계 숫자도 통일된 색상으로
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#8A817C',
    fontWeight: '400',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F6F3',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  reportButtonText: {
    color: '#C7A488', // 버튼 텍스트도 통일된 색상으로
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  // 설정 섹션
  settingsContent: {
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F6F3',
  },
  settingText: {
    fontSize: 16,
    color: '#3B3029',
    fontWeight: '400',
  },
  settingArrow: {
    fontSize: 20,
    color: '#B5896D',
    fontWeight: '300',
  },
  // 로그아웃 섹션 - 더 작고 깔끔하게
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // 더 작게
  },
  logoutText: {
    fontSize: 14, // 더 작은 폰트
    color: '#8A817C',
    fontWeight: '400',
    // marginLeft 제거 (이모티콘 없으므로)
  },
  bottomSpacing: {
    height: 60,
  },
});