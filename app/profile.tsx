// app/profile.tsx - 하이브리드 방식 간단 차트 + 상세보기 연결 버전
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import DefaultText from './components/DefaultText';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Feather Icons로 통일된 아이콘 컴포넌트들
const UserIcon = () => <Feather name="user" size={20} color="#C7A488" />;
const HeartIcon = () => <Feather name="heart" size={20} color="#C7A488" />;
const BrainIcon = () => <Feather name="compass" size={20} color="#C7A488" />;
const StatsIcon = () => <Feather name="bar-chart-2" size={20} color="#C7A488" />;
const SettingsIcon = () => <Feather name="settings" size={20} color="#C7A488" />;
const ReportIcon = () => <Feather name="file-text" size={20} color="#C7A488" />;
const RequestIcon = () => <Feather name="mail" size={20} color="#C7A488" />;
const LinkIcon = () => <Feather name="link" size={20} color="#C7A488" />;
const AlertIcon = () => <Feather name="alert-circle" size={18} color="#FF6B6B" />;
const TrendUpIcon = () => <Feather name="trending-up" size={16} color="#4CAF50" />;
const TrendDownIcon = () => <Feather name="trending-down" size={16} color="#FF6B6B" />;
const AnalyticsIcon = () => <Feather name="activity" size={20} color="#C7A488" />;

interface AttachmentInfo {
  name: string;
  description: string;
  color: string;
  percentage: string;
  strengths: string[];
  tips: string[];
}

interface UserData {
  displayName?: string;
  email?: string;
  createdAt?: string;
  spouseStatus?: string;
  personalityType?: string;
  personalityResult?: any;
  profileImage?: string;
  attachmentType?: string;
  attachmentInfo?: AttachmentInfo;
}

interface DiaryEntry {
  date: string;
  emotion: string;
  stress: number;
  mood: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [attachmentInfo, setAttachmentInfo] = useState<AttachmentInfo | null>(null);
  const [recentEmotionData, setRecentEmotionData] = useState<DiaryEntry[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [diaryStats, setDiaryStats] = useState({
    total: 0,
    thisMonth: 0,
    consecutiveDays: 0
  });

  useEffect(() => {
    loadUserData();
    checkPendingRequests();
    loadDiaryStats();
    loadRecentEmotionData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          
          // 애착유형 정보도 함께 저장
          if (data.attachmentInfo) {
            setAttachmentInfo(data.attachmentInfo);
          }
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

  // 최근 7일 간단 데이터 로드
  const loadRecentEmotionData = async () => {
    if (!auth.currentUser) return;
    
    setChartLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", auth.currentUser.uid),
        where("date", ">=", startDate.toISOString().split('T')[0]),
        orderBy("date", "desc"),
        limit(7)
      );
      
      const querySnapshot = await getDocs(q);
      const entries: DiaryEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          date: data.date,
          emotion: data.emotion || '😐',
          stress: data.stress || 3,
          mood: data.mood || 3
        });
      });
      
      setRecentEmotionData(entries.reverse()); // 시간순으로 정렬
    } catch (error) {
      console.error('최근 감정 데이터 로드 실패:', error);
    } finally {
      setChartLoading(false);
    }
  };

  // 간단 감정 분석
  const getQuickMoodAnalysis = () => {
    if (recentEmotionData.length === 0) return { averageMood: 0, trend: 'stable', status: '기록 없음' };
    
    const averageMood = recentEmotionData.reduce((sum, entry) => sum + entry.mood, 0) / recentEmotionData.length;
    
    // 트렌드 분석 (최근 3일 vs 이전 4일)
    const recent = recentEmotionData.slice(-3);
    const earlier = recentEmotionData.slice(0, -3);
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.mood, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, entry) => sum + entry.mood, 0) / earlier.length : recentAvg;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > earlierAvg + 0.3) trend = 'up';
    else if (recentAvg < earlierAvg - 0.3) trend = 'down';
    
    const getMoodStatus = (avg: number) => {
      if (avg >= 4.5) return '매우 좋음';
      if (avg >= 3.5) return '좋음';
      if (avg >= 2.5) return '보통';
      if (avg >= 1.5) return '힘듦';
      return '매우 힘듦';
    };
    
    return { 
      averageMood, 
      trend, 
      status: getMoodStatus(averageMood),
      needsAttention: averageMood < 2.5 && recentEmotionData.length >= 5
    };
  };

  const getEmotionColor = (emotion: string) => {
    const colorMap: { [key: string]: string } = {
      '😊': '#4CAF50', '😄': '#4CAF50', '🥰': '#E91E63', '😍': '#E91E63',
      '🤗': '#FF9800', '😌': '#4CAF50', '✨': '#FFD700', '💕': '#E91E63',
      '😐': '#9E9E9E', '🤔': '#9E9E9E', '😑': '#9E9E9E',
      '😢': '#2196F3', '😰': '#FF6B6B', '😡': '#F44336', '😔': '#607D8B',
      '😞': '#607D8B', '🥺': '#FF6B6B', '😩': '#FF6B6B', '😤': '#FF5722'
    };
    return colorMap[emotion] || '#9E9E9E';
  };

  // 간단 차트 렌더링
  const renderQuickChart = () => {
    const analysis = getQuickMoodAnalysis();

    if (chartLoading) {
      return (
        <View style={styles.quickChartLoading}>
          <DefaultText style={styles.quickChartLoadingText}>불러오는 중...</DefaultText>
        </View>
      );
    }

    if (recentEmotionData.length === 0) {
      return (
        <View style={styles.noQuickDataContainer}>
          <DefaultText style={styles.noQuickDataText}>최근 7일간 기록이 없어요</DefaultText>
          <DefaultText style={styles.noQuickDataSubtext}>다이어리를 작성해보세요</DefaultText>
        </View>
      );
    }

    return (
      <View style={styles.quickAnalysisContainer}>
        {/* 현재 상태 요약 */}
        <View style={styles.moodSummary}>
          <View style={styles.moodScoreContainer}>
            <DefaultText style={styles.moodScore}>{analysis.averageMood.toFixed(1)}</DefaultText>
            <DefaultText style={styles.moodStatus}>{analysis.status}</DefaultText>
          </View>
          <View style={styles.trendContainer}>
            {analysis.trend === 'up' && <TrendUpIcon />}
            {analysis.trend === 'down' && <TrendDownIcon />}
            <DefaultText style={[
              styles.trendText,
              analysis.trend === 'up' && styles.trendUp,
              analysis.trend === 'down' && styles.trendDown
            ]}>
              {analysis.trend === 'up' && '좋아지고 있어요'}
              {analysis.trend === 'down' && '힘든 시간이네요'}
              {analysis.trend === 'stable' && '안정적이에요'}
            </DefaultText>
          </View>
        </View>

        {/* 간단 차트 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChart}>
          {recentEmotionData.map((entry, index) => (
            <View key={index} style={styles.quickEmotionItem}>
              <View style={styles.quickEmotionBar}>
                <View 
                  style={[
                    styles.quickEmotionBarFill, 
                    { 
                      height: `${(entry.mood / 5) * 100}%`,
                      backgroundColor: getEmotionColor(entry.emotion)
                    }
                  ]} 
                />
              </View>
              <DefaultText style={styles.quickEmotionEmoji}>{entry.emotion}</DefaultText>
            </View>
          ))}
        </ScrollView>

        {/* 주의 필요 알림 */}
        {analysis.needsAttention && (
          <View style={styles.quickAlert}>
            <AlertIcon />
            <DefaultText style={styles.quickAlertText}>
              최근 기분이 많이 힘드시네요. 상세 분석을 확인해보세요.
            </DefaultText>
          </View>
        )}

        {/* 상세보기 버튼 */}
        <TouchableOpacity 
          style={styles.detailAnalysisButton}
          onPress={() => router.push('/reports')}
        >
          <AnalyticsIcon />
          <DefaultText style={styles.detailAnalysisButtonText}>상세 분석 보기</DefaultText>
          <Feather name="arrow-right" size={16} color="#C7A488" />
        </TouchableOpacity>
      </View>
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "안녕히 가세요",
      "정말 로그아웃하시겠어요?\n언제든 다시 돌아와 주세요",
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

      {/* 최근 감정 분석 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <StatsIcon />
          <DefaultText style={styles.cardTitle}>최근 7일 감정 분석</DefaultText>
        </View>
        {renderQuickChart()}
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

      {/* 애착유형 결과 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <LinkIcon />
          <DefaultText style={styles.cardTitle}>나의 애착유형</DefaultText>
        </View>
        {attachmentInfo ? (
          <View style={styles.attachmentContent}>
            <View style={styles.attachmentMain}>
              <View style={[styles.attachmentDot, { backgroundColor: attachmentInfo.color }]} />
              <DefaultText style={[styles.attachmentTypeName, { color: attachmentInfo.color }]}>
                {attachmentInfo.name}
              </DefaultText>
            </View>
            <DefaultText style={styles.attachmentDescription}>
              {attachmentInfo.description}
            </DefaultText>
            <DefaultText style={styles.attachmentPercentage}>
              {attachmentInfo.percentage}가 이 유형입니다
            </DefaultText>
            
            <View style={styles.attachmentStrengths}>
              <DefaultText style={styles.strengthsTitle}>연애 강점</DefaultText>
              {attachmentInfo.strengths.slice(0, 2).map((strength: string, index: number) => (
                <DefaultText key={index} style={styles.strengthText}>
                  • {strength}
                </DefaultText>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.retestButton}
              onPress={() => router.push('../attachment-test')}
            >
              <DefaultText style={styles.retestButtonText}>다시 테스트하기</DefaultText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noAttachmentContent}>
            <DefaultText style={styles.noAttachmentText}>
              당신의 연애 스타일을 알아보세요{'\n'}관계에서의 특성을 파악할 수 있어요
            </DefaultText>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => router.push('../attachment-test')}
            >
              <DefaultText style={styles.testButtonText}>애착유형 알아보기</DefaultText>
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
    backgroundColor: '#FFFBF7',
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
    fontSize: 12,
    color: '#8A817C',
    marginBottom: 4,
    fontWeight: '400',
    lineHeight: 16,
  },
  joinDate: {
    fontSize: 13,
    color: '#B5896D',
    fontWeight: '400',
    lineHeight: 18,
  },
  // 간단 감정 분석 섹션
  quickAnalysisContainer: {
    gap: 16,
  },
  quickChartLoading: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChartLoadingText: {
    color: '#8A817C',
    fontSize: 14,
  },
  noQuickDataContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noQuickDataText: {
    fontSize: 15,
    color: '#8A817C',
    textAlign: 'center',
    marginBottom: 4,
  },
  noQuickDataSubtext: {
    fontSize: 13,
    color: '#B5896D',
    textAlign: 'center',
  },
  // 기분 요약
  moodSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F9F6F3',
    borderRadius: 12,
  },
  moodScoreContainer: {
    alignItems: 'center',
  },
  moodScore: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C7A488',
  },
  moodStatus: {
    fontSize: 13,
    color: '#8A817C',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  trendUp: {
    color: '#4CAF50',
  },
  trendDown: {
    color: '#FF6B6B',
  },
  // 간단 차트
  quickChart: {
    height: 80,
    paddingVertical: 8,
  },
  quickEmotionItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 32,
  },
  quickEmotionBar: {
    width: 6,
    height: 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  quickEmotionBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  quickEmotionEmoji: {
    fontSize: 14,
  },
  // 간단 알림
  quickAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  quickAlertText: {
    fontSize: 13,
    color: '#8B0000',
    marginLeft: 8,
    flex: 1,
  },
  // 상세보기 버튼
  detailAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F6F3',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
    gap: 8,
  },
  detailAnalysisButtonText: {
    color: '#C7A488',
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 28,
    marginRight: 12,
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
    backgroundColor: '#F9F6F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  retestButtonText: {
    color: '#C7A488',
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
    backgroundColor: '#F9F6F3',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  testButtonText: {
    color: '#C7A488',
    fontSize: 16,
    fontWeight: '600',
  },
  // 애착유형 섹션
  attachmentContent: {
    alignItems: 'center',
  },
  attachmentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attachmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  attachmentTypeName: {
    fontSize: 22,
    fontWeight: '600',
  },
  attachmentDescription: {
    fontSize: 15,
    color: '#8A817C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  attachmentPercentage: {
    fontSize: 13,
    color: '#B5896D',
    textAlign: 'center',
    marginBottom: 20,
  },
  attachmentStrengths: {
    width: '100%',
    marginBottom: 20,
  },
  strengthsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B3029',
    marginBottom: 12,
    textAlign: 'center',
  },
  strengthText: {
    fontSize: 14,
    color: '#5C3A2E',
    lineHeight: 20,
    marginBottom: 4,
    textAlign: 'left',
  },
  noAttachmentContent: {
    alignItems: 'center',
  },
  noAttachmentText: {
    fontSize: 15,
    color: '#8A817C',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
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
    backgroundColor: '#F9F6F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  spouseButtonText: {
    color: '#C7A488',
    fontSize: 16,
    fontWeight: '500',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F6F3',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
  },
  requestButtonText: {
    color: '#C7A488',
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
    color: '#C7A488',
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
    color: '#C7A488',
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
  // 로그아웃 섹션
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    color: '#8A817C',
    fontWeight: '400',
  },
  bottomSpacing: {
    height: 0,
  },
});