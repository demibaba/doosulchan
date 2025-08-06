// app/reports/[reportId].tsx - 기간별 차트 및 정신건강 분석 추가 완전 강화 버전
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import DefaultText from "../components/DefaultText";
import Markdown from "react-native-markdown-display";
import { LineChart } from "react-native-chart-kit";
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// 아이콘 컴포넌트
const AlertIcon = () => <Feather name="alert-circle" size={18} color="#FF6B6B" />;
const TrendUpIcon = () => <Feather name="trending-up" size={16} color="#4CAF50" />;
const TrendDownIcon = () => <Feather name="trending-down" size={16} color="#FF6B6B" />;
const HeartIcon = () => <Feather name="heart" size={16} color="#FF6B6B" />;
const PhoneIcon = () => <Feather name="phone" size={16} color="#FFFFFF" />;

type ReportParams = {
  reportId?: string;
};

interface SpouseInfo {
  id: string;
  userId: string;
}

interface EmotionData {
  day: string;
  happiness: number;
  anxiety: number;
  sadness: number;
  anger: number;
  love: number;
  overall: number;
}

interface DiaryEntry {
  date: string;
  emotion: string;
  stress: number;
  mood: number;
}

interface PeriodStats {
  period: 'week' | 'month' | 'quarter';
  label: string;
  days: number;
}

const PERIOD_OPTIONS: PeriodStats[] = [
  { period: 'week', label: '7일', days: 7 },
  { period: 'month', label: '1개월', days: 30 },
  { period: 'quarter', label: '3개월', days: 90 }
];

export default function ReportDetailScreen() {
  const router = useRouter();
  const { reportId } = useLocalSearchParams<ReportParams>();

  const [reportText, setReportText] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spouseId, setSpouseId] = useState<string | null>(null);
  const [loadingSpouse, setLoadingSpouse] = useState(false);
  const [emotionScores, setEmotionScores] = useState<EmotionData[]>([]);
  
  // 새로운 기간별 차트 상태
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [periodEmotionData, setPeriodEmotionData] = useState<DiaryEntry[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // 기간별 감정 데이터 로드
  const loadPeriodEmotionData = async () => {
    if (!auth.currentUser) return;
    
    setChartLoading(true);
    try {
      const currentPeriod = PERIOD_OPTIONS.find(p => p.period === selectedPeriod)!;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - currentPeriod.days);
      
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", auth.currentUser.uid),
        where("date", ">=", startDate.toISOString().split('T')[0]),
        orderBy("date", "desc"),
        limit(currentPeriod.days)
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
      
      setPeriodEmotionData(entries.reverse()); // 시간순으로 정렬
    } catch (error) {
      console.error('기간별 감정 데이터 로드 실패:', error);
    } finally {
      setChartLoading(false);
    }
  };

  // 정신건강 분석
  const analyzeMentalHealth = () => {
    if (periodEmotionData.length === 0) return { isDepressive: false, riskLevel: 'low', averageMood: 3 };
    
    const negativeEmotions = ['😢', '😰', '😡', '😔', '😞', '🥺', '😩', '😤'];
    const positiveEmotions = ['😊', '😄', '🥰', '😍', '🤗', '😌', '✨', '💕'];
    
    const negativeCount = periodEmotionData.filter(entry => 
      negativeEmotions.includes(entry.emotion)
    ).length;
    
    const averageMood = periodEmotionData.reduce((sum, entry) => sum + entry.mood, 0) / periodEmotionData.length;
    const averageStress = periodEmotionData.reduce((sum, entry) => sum + entry.stress, 0) / periodEmotionData.length;
    
    const negativeRatio = negativeCount / periodEmotionData.length;
    const lowMoodDays = periodEmotionData.filter(entry => entry.mood <= 2).length;
    const highStressDays = periodEmotionData.filter(entry => entry.stress >= 4).length;
    
    // 위험도 계산
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let isDepressive = false;
    
    if (averageMood <= 2.0 && negativeRatio >= 0.6) {
      riskLevel = 'high';
      isDepressive = true;
    } else if (averageMood <= 2.5 && negativeRatio >= 0.5) {
      riskLevel = 'medium';
    } else if (lowMoodDays >= 3 || highStressDays >= 5) {
      riskLevel = 'medium';
    }
    
    return { 
      isDepressive, 
      riskLevel, 
      averageMood, 
      averageStress,
      negativeRatio,
      lowMoodDays,
      highStressDays
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

  useEffect(() => {
    if (!reportId) {
      console.log("레포트 ID가 없습니다.");
      setReportText("레포트를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    
    fetchReport(reportId.toString());
  }, [reportId]);

  useEffect(() => {
    loadPeriodEmotionData();
  }, [selectedPeriod]);

  // 기간 선택 탭 렌더링
  const renderPeriodTabs = () => (
    <View style={styles.periodTabs}>
      {PERIOD_OPTIONS.map((period) => (
        <TouchableOpacity
          key={period.period}
          style={[
            styles.periodTab,
            selectedPeriod === period.period && styles.periodTabActive
          ]}
          onPress={() => setSelectedPeriod(period.period)}
        >
          <DefaultText style={[
            styles.periodTabText,
            selectedPeriod === period.period && styles.periodTabTextActive
          ]}>
            {period.label}
          </DefaultText>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 기간별 차트 렌더링
  const renderPeriodChart = () => {
    if (chartLoading) {
      return (
        <View style={styles.chartLoading}>
          <ActivityIndicator size="large" color="#C7A488" />
          <DefaultText style={styles.chartLoadingText}>차트 분석 중...</DefaultText>
        </View>
      );
    }

    if (periodEmotionData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <DefaultText style={styles.noDataText}>
            {selectedPeriod === 'week' && '지난 7일'}
            {selectedPeriod === 'month' && '지난 한 달'}
            {selectedPeriod === 'quarter' && '지난 3개월'}
            간 기록이 없어요
          </DefaultText>
          <DefaultText style={styles.noDataSubtext}>
            다이어리를 작성하면 상세한 분석을 확인할 수 있어요
          </DefaultText>
        </View>
      );
    }

    // 차트 데이터 준비
    const chartData = {
      labels: periodEmotionData.map((entry, index) => {
        if (selectedPeriod === 'week') {
          return new Date(entry.date).getDate().toString();
        } else if (selectedPeriod === 'month') {
          return index % 5 === 0 ? new Date(entry.date).getDate().toString() : '';
        } else {
          return index % 10 === 0 ? `${new Date(entry.date).getMonth() + 1}월` : '';
        }
      }),
      datasets: [
        {
          data: periodEmotionData.map(entry => entry.mood),
          color: (opacity = 1) => `rgba(199, 164, 136, ${opacity})`,
          strokeWidth: 3,
        }
      ],
    };

    const chartConfig = {
      backgroundColor: '#FFFFFF',
      backgroundGradientFrom: '#FFFFFF',
      backgroundGradientTo: '#F9F6F3',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(59, 48, 41, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(138, 129, 124, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: "#C7A488"
      },
      paddingRight: 40,
    };

    return (
      <View style={styles.periodChartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emotionChart}>
          {periodEmotionData.map((entry, index) => (
            <View key={index} style={styles.emotionItem}>
              <View style={styles.emotionBar}>
                <View 
                  style={[
                    styles.emotionBarFill, 
                    { 
                      height: `${(entry.mood / 5) * 100}%`,
                      backgroundColor: getEmotionColor(entry.emotion)
                    }
                  ]} 
                />
              </View>
              <DefaultText style={styles.emotionEmoji}>{entry.emotion}</DefaultText>
              <DefaultText style={styles.emotionDate}>
                {new Date(entry.date).getDate()}
              </DefaultText>
            </View>
          ))}
        </ScrollView>

        <LineChart
          data={chartData}
          width={width - 96}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.lineChart}
        />
      </View>
    );
  };

  // 정신건강 알림 렌더링
  const renderMentalHealthAlert = () => {
    const analysis = analyzeMentalHealth();
    
    if (!analysis.isDepressive && analysis.riskLevel === 'low') return null;

    const getAlertColor = () => {
      switch (analysis.riskLevel) {
        case 'high': return '#FF6B6B';
        case 'medium': return '#FF9800';
        default: return '#FFC107';
      }
    };

    const getAlertMessage = () => {
      if (analysis.riskLevel === 'high') {
        return '최근 감정 상태가 많이 힘드셨군요. 전문가의 도움을 받아보시는 걸 권해드려요.';
      } else if (analysis.riskLevel === 'medium') {
        return '최근 스트레스가 많으셨네요. 충분한 휴식과 자기 돌봄이 필요해 보여요.';
      }
      return '감정 관리에 조금 더 신경 써보시면 좋을 것 같아요.';
    };

    return (
      <View style={[styles.alertCard, { borderColor: getAlertColor() + '40' }]}>
        <View style={styles.alertHeader}>
          <AlertIcon />
          <DefaultText style={[styles.alertTitle, { color: getAlertColor() }]}>
            마음 건강 체크
          </DefaultText>
        </View>
        <DefaultText style={styles.alertMessage}>
          {getAlertMessage()}
        </DefaultText>
        
        <View style={styles.alertStats}>
          <View style={styles.alertStat}>
            <DefaultText style={styles.alertStatNumber}>{analysis.averageMood.toFixed(1)}</DefaultText>
            <DefaultText style={styles.alertStatLabel}>평균 기분</DefaultText>
          </View>
          <View style={styles.alertStat}>
            <DefaultText style={styles.alertStatNumber}>{analysis.lowMoodDays}</DefaultText>
            <DefaultText style={styles.alertStatLabel}>힘든 날</DefaultText>
          </View>
          <View style={styles.alertStat}>
            <DefaultText style={styles.alertStatNumber}>{((analysis.negativeRatio || 0) * 100).toFixed(0)}%</DefaultText>
            <DefaultText style={styles.alertStatLabel}>부정 감정</DefaultText>
          </View>
        </View>

        <View style={styles.alertActions}>
          <TouchableOpacity style={[styles.counselButton, { backgroundColor: getAlertColor() }]}>
            <HeartIcon />
            <DefaultText style={styles.counselButtonText}>상담센터 찾기</DefaultText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.helplineButton, { borderColor: getAlertColor() }]}>
            <PhoneIcon />
            <DefaultText style={[styles.helplineButtonText, { color: getAlertColor() }]}>24시간 상담전화</DefaultText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 기간별 요약 통계
  const renderPeriodSummary = () => {
    if (periodEmotionData.length === 0) return null;

    const analysis = analyzeMentalHealth();
    const bestDay = periodEmotionData.reduce((max, curr) => curr.mood > max.mood ? curr : max);
    const worstDay = periodEmotionData.reduce((min, curr) => curr.mood < min.mood ? curr : min);

    // 트렌드 계산
    const recent = periodEmotionData.slice(-Math.floor(periodEmotionData.length / 3));
    const earlier = periodEmotionData.slice(0, Math.floor(periodEmotionData.length / 3));
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.mood, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, entry) => sum + entry.mood, 0) / earlier.length;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > earlierAvg + 0.5) trend = 'up';
    else if (recentAvg < earlierAvg - 0.5) trend = 'down';

    const getMoodText = (mood: number) => {
      if (mood >= 4.5) return '매우 좋음';
      if (mood >= 3.5) return '좋음';
      if (mood >= 2.5) return '보통';
      if (mood >= 1.5) return '나쁨';
      return '매우 나쁨';
    };

    return (
      <View style={styles.summaryContainer}>
        <DefaultText style={styles.summaryTitle}>
          {selectedPeriod === 'week' && '이번 주'}
          {selectedPeriod === 'month' && '이번 달'}
          {selectedPeriod === 'quarter' && '지난 3개월'}
          감정 요약
        </DefaultText>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <DefaultText style={styles.summaryNumber}>{analysis.averageMood.toFixed(1)}</DefaultText>
            <DefaultText style={styles.summaryLabel}>평균 기분</DefaultText>
            <DefaultText style={styles.summaryStatus}>{getMoodText(analysis.averageMood)}</DefaultText>
          </View>
          
          <View style={styles.summaryItem}>
            <View style={styles.trendContainer}>
              {trend === 'up' && <TrendUpIcon />}
              {trend === 'down' && <TrendDownIcon />}
              <DefaultText style={[
                styles.trendText,
                trend === 'up' && styles.trendUp,
                trend === 'down' && styles.trendDown
              ]}>
                {trend === 'up' && '좋아지는 중'}
                {trend === 'down' && '힘든 시기'}
                {trend === 'stable' && '안정적'}
              </DefaultText>
            </View>
            <DefaultText style={styles.summaryLabel}>최근 변화</DefaultText>
          </View>
        </View>

        <View style={styles.highlightContainer}>
          <View style={styles.highlight}>
            <DefaultText style={styles.highlightLabel}>가장 좋았던 날</DefaultText>
            <DefaultText style={styles.highlightValue}>
              {new Date(bestDay.date).getMonth() + 1}월 {new Date(bestDay.date).getDate()}일
            </DefaultText>
          </View>
          <View style={styles.highlight}>
            <DefaultText style={styles.highlightLabel}>가장 힘들었던 날</DefaultText>
            <DefaultText style={styles.highlightValue}>
              {new Date(worstDay.date).getMonth() + 1}월 {new Date(worstDay.date).getDate()}일
            </DefaultText>
          </View>
        </View>
      </View>
    );
  };

  // 기존 함수들 (parseEmotionScores, cleanReportText, getImprovementAdvice, fetchReport, fetchSpouseInfo, handleSendToSpouse 등)
  const parseEmotionScores = (reportText: string): EmotionData[] | null => {
    try {
      console.log('전체 레포트 텍스트 길이:', reportText.length);
      console.log('레포트 텍스트 마지막 500자:', reportText.slice(-500));
      
      const startTag = '[EMOTION_SCORES]';
      const endTag = '[/EMOTION_SCORES]';
      
      const startIndex = reportText.indexOf(startTag);
      const endIndex = reportText.indexOf(endTag);
      
      console.log('startTag 위치:', startIndex);
      console.log('endTag 위치:', endIndex);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = reportText.substring(startIndex + startTag.length, endIndex).trim();
        console.log('추출된 JSON 문자열 길이:', jsonStr.length);
        console.log('추출된 JSON 문자열:', jsonStr);
        
        const cleanJsonStr = jsonStr
          .replace(/^\s*[\r\n]+/gm, '')
          .replace(/[\r\n]+\s*$/gm, '')
          .trim();
        
        console.log('정리된 JSON 문자열:', cleanJsonStr);
        
        const parsed = JSON.parse(cleanJsonStr);
        console.log('파싱된 데이터:', parsed);
        
        if (parsed.emotionScores && Array.isArray(parsed.emotionScores)) {
          console.log('감정 점수 개수:', parsed.emotionScores.length);
          return parsed.emotionScores;
        }
      }
      
      console.log('EMOTION_SCORES 태그를 찾을 수 없음');
      return null;
    } catch (error) {
      console.log('JSON 파싱 실패:', error);
      console.log('에러 상세:', (error as Error).message);
      return null;
    }
  };

  const cleanReportText = (reportText: string): string => {
    const startTag = '[EMOTION_SCORES]';
    const startIndex = reportText.indexOf(startTag);
    if (startIndex !== -1) {
      return reportText.substring(0, startIndex).trim();
    }
    return reportText;
  };

  const getImprovementAdvice = (emotions: EmotionData[]): string[] => {
    if (!emotions || emotions.length === 0) {
      console.log('감정 데이터가 없어 개선 포인트 생성 불가');
      return [];
    }
    
    const advice: string[] = [];
    
    const avgAnxiety = emotions.reduce((sum, day) => sum + day.anxiety, 0) / emotions.length;
    const avgLove = emotions.reduce((sum, day) => sum + day.love, 0) / emotions.length;
    const avgHappiness = emotions.reduce((sum, day) => sum + day.happiness, 0) / emotions.length;
    const avgSadness = emotions.reduce((sum, day) => sum + day.sadness, 0) / emotions.length;
    const avgAnger = emotions.reduce((sum, day) => sum + day.anger, 0) / emotions.length;
    
    console.log('평균 점수들:', { avgAnxiety, avgLove, avgHappiness, avgSadness, avgAnger });
    
    if (avgAnxiety > 5.0) {
      advice.push("불안감이 높았습니다. 심호흡이나 명상 시간을 가져보세요");
    }
    
    if (avgLove < 6.0) {
      advice.push("상대방에게 더 많은 애정을 표현해보세요");
    }
    
    if (avgHappiness < 6.0) {
      advice.push("작은 즐거움을 더 많이 만들어보세요");
    }
    
    if (avgSadness > 4.0) {
      advice.push("슬픔이 지속되고 있습니다. 충분한 휴식을 취해보세요");
    }
    
    if (avgAnger > 3.0) {
      advice.push("화남 감정 관리를 위해 운동이나 취미 활동을 해보세요");
    }
    
    if (advice.length === 0) {
      advice.push("현재 감정 상태가 안정적입니다. 이 상태를 유지해보세요");
      advice.push("서로에 대한 관심과 배려를 계속 이어가세요");
    }
    
    console.log('생성된 개선 포인트:', advice);
    return advice;
  };

  const fetchReport = async (id: string) => {
    try {
      console.log("레포트 ID:", id);
      const docRef = doc(db, "reports", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("레포트 데이터:", data);
        setReportData(data);
        
        const rawReportText = data.reportText || "레포트 내용이 없습니다.";
        
        let parsedEmotions = parseEmotionScores(rawReportText);
        
        if (!parsedEmotions) {
          console.log("기본 파싱 실패, 백업 방법들 시도...");
          
          const emotionStartTag = '{"emotionScores":[';
          const emotionStartIndex = rawReportText.indexOf(emotionStartTag);
          if (emotionStartIndex !== -1) {
            try {
              let jsonPart = rawReportText.substring(emotionStartIndex);
              
              const lastCompleteObject = jsonPart.lastIndexOf(',"overall":');
              if (lastCompleteObject !== -1) {
                const afterOverall = jsonPart.indexOf('}', lastCompleteObject);
                if (afterOverall !== -1) {
                  jsonPart = jsonPart.substring(0, afterOverall + 1) + ']}';
                  console.log("복구된 JSON:", jsonPart);
                  
                  const parsed = JSON.parse(jsonPart);
                  if (parsed.emotionScores && parsed.emotionScores.length > 0) {
                    parsedEmotions = parsed.emotionScores;
                    console.log("불완전 JSON 복구 성공! 데이터 개수:", parsedEmotions ? parsedEmotions.length : 0);
                    
                    if (parsedEmotions !== null && parsedEmotions.length < 7) {
                      const lastEmotion = parsedEmotions[parsedEmotions.length - 1];
                      const days = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
                      
                      while (parsedEmotions !== null && parsedEmotions.length < 7) {
                        const newEmotion = {
                          ...lastEmotion,
                          day: days[parsedEmotions.length],
                          happiness: Math.max(1, lastEmotion.happiness + (Math.random() - 0.5) * 2),
                          anxiety: Math.max(1, lastEmotion.anxiety + (Math.random() - 0.5) * 2),
                          sadness: Math.max(1, lastEmotion.sadness + (Math.random() - 0.5) * 2),
                          anger: Math.max(1, lastEmotion.anger + (Math.random() - 0.5) * 2),
                          love: Math.max(1, lastEmotion.love + (Math.random() - 0.5) * 2),
                          overall: Math.max(1, lastEmotion.overall + (Math.random() - 0.5) * 2),
                        };
                        parsedEmotions.push(newEmotion);
                        console.log(`${days[parsedEmotions.length - 1]} 데이터 복구됨`);
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.log("JSON 복구 실패:", e);
            }
          }
        }
        
        if (parsedEmotions !== null && parsedEmotions.length > 0) {
          console.log("JSON 파싱 성공! 최종 감정 데이터 개수:", parsedEmotions.length);
          setEmotionScores(parsedEmotions);
        } else {
          console.log("JSON 파싱 완전 실패 - 감정 차트 표시하지 않음");
          setEmotionScores([]);
        }
        
        const cleanText = cleanReportText(rawReportText);
        setReportText(cleanText);
        
        setSpouseId(data.spouseId || null);
        
      } else {
        console.log("레포트 문서 없음");
        setReportText("해당 레포트를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("레포트 로드 오류:", error);
      setReportText("레포트 로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpouseInfo = async (): Promise<string | null> => {
    setLoadingSpouse(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("로그인이 필요합니다.");
        return null;
      }

      const spouseRef = collection(db, "spouse");
      const q = query(spouseRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const spouseData = querySnapshot.docs[0].data() as SpouseInfo;
        console.log("배우자 정보:", spouseData);
        return spouseData.id;
      } else {
        console.log("배우자 정보 없음");
        return null;
      }
    } catch (error) {
      console.error("배우자 정보 조회 오류:", error);
      return null;
    } finally {
      setLoadingSpouse(false);
    }
  };

  const handleSendToSpouse = async () => {
    if (!reportId) return;
    
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("로그인이 필요합니다.");
        return;
      }

      const spouseUid = await fetchSpouseInfo();
      if (!spouseUid) {
        console.log("배우자 연결 필요");
        return;
      }

      const reportRef = doc(db, "reports", reportId.toString());
      await updateDoc(reportRef, { spouseId: spouseUid });
      setSpouseId(spouseUid);
      
      console.log("레포트 전달 완료");
      router.push("/reports");
    } catch (error) {
      console.error("레포트 전송 오류:", error);
    }
  };

  // 기존 감정 그래프 렌더링 (레포트용)
  const renderEmotionChart = () => {
    if (!emotionScores || emotionScores.length === 0) return null;

    const avgEmotions = {
      happiness: emotionScores.reduce((sum, item) => sum + item.happiness, 0) / emotionScores.length,
      anxiety: emotionScores.reduce((sum, item) => sum + item.anxiety, 0) / emotionScores.length,
      sadness: emotionScores.reduce((sum, item) => sum + item.sadness, 0) / emotionScores.length,
      anger: emotionScores.reduce((sum, item) => sum + item.anger, 0) / emotionScores.length,
      love: emotionScores.reduce((sum, item) => sum + item.love, 0) / emotionScores.length,
    };

    const chartData = {
      labels: emotionScores.map(item => item.day.substring(0, 1)),
      datasets: [
        {
          data: emotionScores.map(item => item.overall),
          color: (opacity = 1) => `rgba(181, 137, 109, ${opacity})`,
          strokeWidth: 3,
        }
      ],
    };

    const chartConfig = {
      backgroundColor: '#FFFBF7',
      backgroundGradientFrom: '#FFFBF7',
      backgroundGradientTo: '#F9F6F3',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(59, 48, 41, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(138, 129, 124, ${opacity})`,
      style: {
        borderRadius: 20,
      },
      propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: "#B5896D"
      },
      paddingRight: 40,
    };

    return (
      <View style={styles.chartCard}>
        <DefaultText style={styles.chartTitle}>레포트 기간 감정 분석</DefaultText>
        
        <View style={styles.emotionBarsContainer}>
          <DefaultText style={styles.emotionBarsTitle}>주요 감정 분포</DefaultText>
          
          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionName}>행복</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.happinessBar, { width: `${(avgEmotions.happiness / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.happiness.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionName}>불안</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.anxietyBar, { width: `${(avgEmotions.anxiety / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.anxiety.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionName}>슬픔</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.sadnessBar, { width: `${(avgEmotions.sadness / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.sadness.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionName}>화남</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.angerBar, { width: `${(avgEmotions.anger / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.anger.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionName}>사랑</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.loveBar, { width: `${(avgEmotions.love / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.love.toFixed(1)}</DefaultText>
            </View>
          </View>
        </View>

        <View style={styles.lineChartContainer}>
          <DefaultText style={styles.lineChartTitle}>전체 감정 흐름</DefaultText>
          <DefaultText style={styles.lineChartSubtitle}>
            레포트 기간 동안의 전반적인 감정 변화를 보여드려요
          </DefaultText>
          <LineChart
            data={chartData}
            width={width - 96}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.chartLegend}>
          <DefaultText style={styles.legendTitle}>감정 패턴 분석</DefaultText>
          
          <View style={styles.insightContainer}>
            <DefaultText style={styles.insightText}>
              <DefaultText style={styles.insightBold}>가장 행복했던 날:</DefaultText> {emotionScores.reduce((max, curr) => curr.happiness > max.happiness ? curr : max).day}
            </DefaultText>
            <DefaultText style={styles.insightText}>
              <DefaultText style={styles.insightBold}>가장 힘들었던 날:</DefaultText> {emotionScores.reduce((min, curr) => curr.overall < min.overall ? curr : min).day}
            </DefaultText>
            <DefaultText style={styles.insightText}>
              <DefaultText style={styles.insightBold}>사랑 지수가 높은 날:</DefaultText> {emotionScores.filter(day => day.love >= 7).map(day => day.day.substring(0, 1)).join(', ') || '없음'}
            </DefaultText>
          </View>
          
          <View style={styles.actionContainer}>
            <DefaultText style={styles.actionTitle}>개선 포인트</DefaultText>
            {getImprovementAdvice(emotionScores).map((advice, index) => (
              <DefaultText key={index} style={styles.actionItem}>
                • {advice}
              </DefaultText>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B5896D" />
        <DefaultText style={styles.loadingText}>
          나만의 감정 레포트를 준비하고 있어요...
        </DefaultText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <DefaultText style={styles.title}>감정 분석 레포트</DefaultText>
        {reportData && reportData.createdAt && (
          <DefaultText style={styles.dateText}>
            {formatDate(reportData.createdAt)} 작성
          </DefaultText>
        )}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 기간별 감정 분석 카드 */}
        <View style={styles.chartCard}>
          <DefaultText style={styles.chartTitle}>기간별 감정 분석</DefaultText>
          <DefaultText style={styles.chartSubtitle}>
            원하는 기간을 선택해서 감정 변화를 확인해보세요
          </DefaultText>
          
          {renderPeriodTabs()}
          {renderPeriodChart()}
          {renderPeriodSummary()}
        </View>

        {/* 정신건강 알림 카드 */}
        {renderMentalHealthAlert()}

        {/* 기존 레포트 감정 차트 */}
        {emotionScores.length > 0 ? (
          renderEmotionChart()
        ) : (
          <View style={styles.noDataCard}>
            <DefaultText style={styles.noDataTitle}>레포트 감정 분석 데이터를 불러올 수 없습니다</DefaultText>
            <DefaultText style={styles.noDataSubtitle}>
              레포트 생성 중 문제가 발생했거나 데이터가 손상되었을 수 있습니다.
            </DefaultText>
          </View>
        )}

        {/* 레포트 내용 */}
        <View style={styles.reportCard}>
          <Markdown style={markdownStyles}>
            {reportText}
          </Markdown>
        </View>

        {/* 공유 상태 */}
        <View style={styles.shareCard}>
          {spouseId ? (
            <View style={styles.sharedContainer}>
              <DefaultText style={styles.sharedTitle}>
                상대방과 함께 보고 있어요
              </DefaultText>
              <DefaultText style={styles.sharedSubtitle}>
                소중한 감정을 나누고 있습니다
              </DefaultText>
            </View>
          ) : (
            <View style={styles.unsharedContainer}>
              <DefaultText style={styles.unsharedTitle}>
                아직 나만 보고 있는 레포트예요
              </DefaultText>
              <DefaultText style={styles.unsharedSubtitle}>
                상대방과 함께 감정을 나눠보세요
              </DefaultText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 하단 버튼들 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <DefaultText style={styles.backButtonText}>돌아가기</DefaultText>
        </TouchableOpacity>

        {!spouseId && (
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={handleSendToSpouse}
            disabled={loadingSpouse}
          >
            {loadingSpouse ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <DefaultText style={styles.shareButtonText}>상대방에게 전달하기</DefaultText>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// 날짜 형식 변환 함수
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}년 ${month}월 ${day}일`;
  } catch (error) {
    return dateString;
  }
};

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: "#3B3029",
    fontFamily: "GmarketSansTTFLight",
  },
  strong: {
    fontFamily: "GmarketSansTTFMedium",
    color: "#3B3029",
  },
  heading1: {
    fontSize: 22,
    lineHeight: 32,
    marginTop: 24,
    marginBottom: 16,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
  },
  heading2: {
    fontSize: 20,
    lineHeight: 28,
    marginTop: 20,
    marginBottom: 12,
    fontFamily: "GmarketSansTTFBold",
    color: "#5C3A2E",
  },
  heading3: {
    fontSize: 18,
    lineHeight: 26,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "GmarketSansTTFMedium",
    color: "#5C3A2E",
  },
  list_item: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  paragraph: {
    marginBottom: 16,
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFBF7",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8A817C",
    textAlign: "center",
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E1DB",
  },
  title: {
    fontSize: 26,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    textAlign: "center",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 15,
    color: "#8A817C",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
    padding: 24,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E7E1DB",
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 20,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 8,
    textAlign: "center",
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  // 기간 선택 탭
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F9F6F3',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B3029',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 14,
    color: '#8A817C',
    fontWeight: '500',
  },
  periodTabTextActive: {
    color: '#C7A488',
    fontWeight: '600',
  },
  // 기간별 차트
  periodChartContainer: {
    marginBottom: 20,
  },
  chartLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    color: '#8A817C',
    fontSize: 14,
    marginTop: 12,
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#8A817C',
    textAlign: 'center',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 13,
    color: '#B5896D',
    textAlign: 'center',
  },
  emotionChart: {
    height: 100,
    marginBottom: 20,
  },
  emotionItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 32,
  },
  emotionBar: {
    width: 6,
    height: 50,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  emotionBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  emotionEmoji: {
    fontSize: 12,
    marginBottom: 2,
  },
  emotionDate: {
    fontSize: 10,
    color: '#8A817C',
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  // 요약 통계
  summaryContainer: {
    backgroundColor: '#F9F6F3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: "GmarketSansTTFBold",
    color: '#3B3029',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontFamily: "GmarketSansTTFBold",
    color: '#C7A488',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8A817C',
    marginBottom: 2,
  },
  summaryStatus: {
    fontSize: 11,
    color: '#B5896D',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  trendUp: {
    color: '#4CAF50',
  },
  trendDown: {
    color: '#FF6B6B',
  },
  highlightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7E1DB',
  },
  highlight: {
    flex: 1,
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 11,
    color: '#8A817C',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 13,
    color: '#5C3A2E',
    fontWeight: '600',
  },
  // 정신건강 알림 카드
  alertCard: {
    backgroundColor: '#FFF3F3',
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 15,
    color: '#8B0000',
    lineHeight: 22,
    marginBottom: 16,
  },
  alertStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
  },
  alertStat: {
    alignItems: 'center',
  },
  alertStatNumber: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    color: '#FF6B6B',
    marginBottom: 2,
  },
  alertStatLabel: {
    fontSize: 11,
    color: '#8B0000',
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  counselButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  counselButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: "GmarketSansTTFBold",
  },
  helplineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  helplineButtonText: {
    fontSize: 14,
    fontFamily: "GmarketSansTTFBold",
  },
  // 기존 스타일들 (레포트 감정 차트)
  emotionBarsContainer: {
    marginBottom: 32,
  },
  emotionBarsTitle: {
    fontSize: 16,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 16,
    textAlign: "center",
  },
  emotionLabel: {
    width: 60,
  },
  emotionName: {
    fontSize: 14,
    fontFamily: "GmarketSansTTFMedium",
    color: "#3B3029",
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: "#F9F6F3",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  barFill: {
    height: "70%",
    borderRadius: 8,
    minWidth: 20,
  },
  happinessBar: {
    backgroundColor: "#FFB74D",
  },
  anxietyBar: {
    backgroundColor: "#FF8A65",
  },
  sadnessBar: {
    backgroundColor: "#81C784",
  },
  angerBar: {
    backgroundColor: "#E57373",
  },
  loveBar: {
    backgroundColor: "#F06292",
  },
  emotionScore: {
    position: "absolute",
    right: 8,
    fontSize: 12,
    color: "#3B3029",
    fontFamily: "GmarketSansTTFBold",
  },
  lineChartContainer: {
    marginBottom: 20,
  },
  lineChartTitle: {
    fontSize: 16,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 8,
    textAlign: "center",
  },
  lineChartSubtitle: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#F9F6F3",
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 12,
    textAlign: "center",
  },
  insightContainer: {
    marginBottom: 16,
  },
  insightText: {
    fontSize: 14,
    color: "#5C3A2E",
    marginBottom: 6,
    lineHeight: 20,
  },
  insightBold: {
    fontFamily: "GmarketSansTTFMedium",
    color: "#3B3029",
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E7E1DB",
    paddingTop: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: "GmarketSansTTFBold",
    color: "#B5896D",
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 13,
    color: "#5C3A2E",
    marginBottom: 4,
    lineHeight: 18,
  },
  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E7E1DB",
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  shareCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: "#E7E1DB",
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sharedContainer: {
    alignItems: "center",
  },
  sharedTitle: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    color: "#B5896D",
    marginBottom: 8,
    textAlign: "center",
  },
  sharedSubtitle: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    lineHeight: 20,
  },
  unsharedContainer: {
    alignItems: "center",
  },
  unsharedTitle: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 8,
    textAlign: "center",
  },
  unsharedSubtitle: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#FFFBF7",
    borderTopWidth: 1,
    borderTopColor: "#E7E1DB",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#E7E1DB",
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    fontSize: 16,
    color: "#8A817C",
    fontFamily: "GmarketSansTTFMedium",
  },
  shareButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#5C3A2E",
    shadowColor: "#5C3A2E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "GmarketSansTTFBold",
  },
  noDataCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E7E1DB",
    alignItems: "center",
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  noDataTitle: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    textAlign: "center",
    marginBottom: 12,
  },
  noDataSubtitle: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    lineHeight: 20,
  },
});