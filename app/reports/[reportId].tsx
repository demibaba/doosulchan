// app/reports/[reportId].tsx - 고급 감성 웜톤 리파인 버전
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import DefaultText from "../components/DefaultText";
import Markdown from "react-native-markdown-display";
import { LineChart } from "react-native-chart-kit"; // 차트 라이브러리 활성화!

const { width } = Dimensions.get('window');

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

export default function ReportDetailScreen() {
  const router = useRouter();
  const { reportId } = useLocalSearchParams<ReportParams>();

  const [reportText, setReportText] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spouseId, setSpouseId] = useState<string | null>(null);
  const [loadingSpouse, setLoadingSpouse] = useState(false);
  const [emotionScores, setEmotionScores] = useState<EmotionData[]>([]);

  useEffect(() => {
    if (!reportId) {
      Alert.alert("오류", "레포트 ID가 없습니다.");
      setLoading(false);
      return;
    }
    
    fetchReport(reportId.toString());
  }, [reportId]);

  const fetchReport = async (id: string) => {
    try {
      console.log("레포트 ID:", id);
      const docRef = doc(db, "reports", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("레포트 데이터:", data);
        setReportData(data);
        setReportText(data.reportText || "레포트 내용이 없습니다.");
        setSpouseId(data.spouseId || null);
        
        // 감정 점수 데이터가 있다면 설정
        if (data.emotionScores) {
          console.log("저장된 감정 점수:", data.emotionScores);
          setEmotionScores(data.emotionScores);
        } else {
          // 임시로 테스트 데이터 (JSON 파싱이 안 된 경우 대비)
          console.log("감정 점수가 없어서 임시 데이터 사용");
          setEmotionScores([
            {day: "월요일", happiness: 7.2, anxiety: 3.8, sadness: 2.5, anger: 1.2, love: 8.0, overall: 7.0},
            {day: "화요일", happiness: 6.8, anxiety: 4.2, sadness: 3.1, anger: 2.0, love: 7.5, overall: 6.5},
            {day: "수요일", happiness: 8.0, anxiety: 2.5, sadness: 1.8, anger: 1.0, love: 8.5, overall: 7.8},
            {day: "목요일", happiness: 7.5, anxiety: 3.0, sadness: 2.2, anger: 1.5, love: 8.2, overall: 7.3},
            {day: "금요일", happiness: 8.5, anxiety: 2.0, sadness: 1.5, anger: 0.8, love: 9.0, overall: 8.2},
            {day: "토요일", happiness: 9.0, anxiety: 1.5, sadness: 1.0, anger: 0.5, love: 9.2, overall: 8.8},
            {day: "일요일", happiness: 8.2, anxiety: 2.2, sadness: 1.8, anger: 1.0, love: 8.8, overall: 8.0}
          ]);
        }
      } else {
        console.log("레포트 문서 없음");
        Alert.alert("오류", "해당 레포트를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("레포트 로드 오류:", error);
      Alert.alert("오류", "레포트 로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 배우자 정보 가져오기
  const fetchSpouseInfo = async (): Promise<string | null> => {
    setLoadingSpouse(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("오류", "로그인이 필요합니다.");
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
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }

      const spouseUid = await fetchSpouseInfo();
      if (!spouseUid) {
        Alert.alert("알림", "배우자와 연결된 후 공유할 수 있어요", [
          { text: "확인", style: "default" }
        ]);
        return;
      }

      const reportRef = doc(db, "reports", reportId.toString());
      await updateDoc(reportRef, { spouseId: spouseUid });
      setSpouseId(spouseUid);
      Alert.alert("💝", "레포트가 상대방에게 전달되었어요", [
        { text: "확인", style: "default" }
      ]);
    } catch (error) {
      console.error("레포트 전송 오류:", error);
      Alert.alert("오류", "전송 중 문제가 발생했어요");
    }
  };

  // 감정 그래프 렌더링 (이모지 바 차트 + 라인 차트)
  const renderEmotionChart = () => {
    if (!emotionScores || emotionScores.length === 0) return null;

    // 평균 감정 점수 계산
    const avgEmotions = {
      happiness: emotionScores.reduce((sum, item) => sum + item.happiness, 0) / emotionScores.length,
      anxiety: emotionScores.reduce((sum, item) => sum + item.anxiety, 0) / emotionScores.length,
      sadness: emotionScores.reduce((sum, item) => sum + item.sadness, 0) / emotionScores.length,
      anger: emotionScores.reduce((sum, item) => sum + item.anger, 0) / emotionScores.length,
      love: emotionScores.reduce((sum, item) => sum + item.love, 0) / emotionScores.length,
    };

    const chartData = {
      labels: emotionScores.map(item => item.day.substring(0, 1)), // 월, 화, 수...
      datasets: [
        {
          data: emotionScores.map(item => item.overall),
          color: (opacity = 1) => `rgba(181, 137, 109, ${opacity})`, // #B5896D
          strokeWidth: 3,
        }
      ],
    };

    const chartConfig = {
      backgroundColor: '#FFFBF7',
      backgroundGradientFrom: '#FFFBF7',
      backgroundGradientTo: '#F9F6F3',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(59, 48, 41, ${opacity})`, // #3B3029
      labelColor: (opacity = 1) => `rgba(138, 129, 124, ${opacity})`, // #8A817C
      style: {
        borderRadius: 20,
      },
      propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: "#B5896D"
      },
      paddingRight: 40, // 오른쪽 여백 추가
    };

    return (
      <View style={styles.chartCard}>
        <DefaultText style={styles.chartTitle}>💭 일주일간의 감정 분석</DefaultText>
        
        {/* 1. 감정 이모지 바 차트 */}
        <View style={styles.emotionBarsContainer}>
          <DefaultText style={styles.emotionBarsTitle}>주요 감정 분포</DefaultText>
          
          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionEmoji}>😊</DefaultText>
              <DefaultText style={styles.emotionName}>행복</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.happinessBar, { width: `${(avgEmotions.happiness / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.happiness.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionEmoji}>😰</DefaultText>
              <DefaultText style={styles.emotionName}>불안</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.anxietyBar, { width: `${(avgEmotions.anxiety / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.anxiety.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionEmoji}>😢</DefaultText>
              <DefaultText style={styles.emotionName}>슬픔</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.sadnessBar, { width: `${(avgEmotions.sadness / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.sadness.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionEmoji}>😡</DefaultText>
              <DefaultText style={styles.emotionName}>화남</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.angerBar, { width: `${(avgEmotions.anger / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.anger.toFixed(1)}</DefaultText>
            </View>
          </View>

          <View style={styles.emotionBar}>
            <View style={styles.emotionLabel}>
              <DefaultText style={styles.emotionEmoji}>💕</DefaultText>
              <DefaultText style={styles.emotionName}>사랑</DefaultText>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, styles.loveBar, { width: `${(avgEmotions.love / 10) * 100}%` }]} />
              <DefaultText style={styles.emotionScore}>{avgEmotions.love.toFixed(1)}</DefaultText>
            </View>
          </View>
        </View>

        {/* 2. 전체 감정 흐름 라인 차트 */}
        <View style={styles.lineChartContainer}>
          <DefaultText style={styles.lineChartTitle}>📈 전체 감정 흐름</DefaultText>
          <DefaultText style={styles.lineChartSubtitle}>
            일주일간의 전반적인 감정 변화를 보여드려요
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
          <DefaultText style={styles.legendText}>
            📊 감정 점수는 일주일 평균이며, 높을수록 해당 감정이 강했어요
          </DefaultText>
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
        <DefaultText style={styles.title}>🌙 감정 분석 레포트</DefaultText>
        {reportData && reportData.createdAt && (
          <DefaultText style={styles.dateText}>
            {formatDate(reportData.createdAt)} 작성
          </DefaultText>
        )}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 감정 그래프 */}
        {renderEmotionChart()}

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
              <DefaultText style={styles.sharedIcon}>💝</DefaultText>
              <DefaultText style={styles.sharedTitle}>
                상대방과 함께 보고 있어요
              </DefaultText>
              <DefaultText style={styles.sharedSubtitle}>
                소중한 감정을 나누고 있습니다
              </DefaultText>
            </View>
          ) : (
            <View style={styles.unsharedContainer}>
              <DefaultText style={styles.unsharedIcon}>🤍</DefaultText>
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
              <>
                <DefaultText style={styles.shareButtonText}>💝 상대방에게 전달하기</DefaultText>
              </>
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
    marginBottom: 20,
    textAlign: "center",
  },
  // 이모지 바 차트 스타일
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
  emotionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  emotionLabel: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  emotionEmoji: {
    fontSize: 18,
    marginRight: 8,
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
    backgroundColor: "#FFB74D", // 따뜻한 주황
  },
  anxietyBar: {
    backgroundColor: "#FF8A65", // 부드러운 빨강
  },
  sadnessBar: {
    backgroundColor: "#81C784", // 차분한 파랑
  },
  angerBar: {
    backgroundColor: "#E57373", // 진한 빨강
  },
  loveBar: {
    backgroundColor: "#F06292", // 따뜻한 핑크
  },
  emotionScore: {
    position: "absolute",
    right: 8,
    fontSize: 12,
    color: "#3B3029",
    fontFamily: "GmarketSansTTFBold",
  },
  // 라인 차트 스타일
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
  // 임시 텍스트 기반 차트 스타일
  tempChart: {
    marginVertical: 16,
  },
  tempChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tempChartDay: {
    width: 60,
    fontSize: 14,
    color: '#8A817C',
    fontFamily: 'GmarketSansTTFMedium',
  },
  tempChartBar: {
    flex: 1,
    height: 32,
    backgroundColor: '#F9F6F3',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  tempChartFill: {
    height: '70%',
    backgroundColor: '#B5896D',
    borderRadius: 12,
    minWidth: 20,
  },
  tempChartScore: {
    position: 'absolute',
    right: 8,
    fontSize: 12,
    color: '#3B3029',
    fontFamily: 'GmarketSansTTFBold',
  },
  chartLegend: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F9F6F3",
    borderRadius: 12,
  },
  legendText: {
    fontSize: 13,
    color: "#8A817C",
    textAlign: "center",
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
  sharedIcon: {
    fontSize: 48,
    marginBottom: 16,
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
  unsharedIcon: {
    fontSize: 48,
    marginBottom: 16,
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
});