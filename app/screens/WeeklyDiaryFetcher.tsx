// app/screens/WeeklyDiaryFetcher.tsx - 레포트함 연동 버전
import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig"; // 경로 수정!
import DefaultText from "../components/DefaultText";
import { generateOpenAIReport } from "../../utils/openaiApi"; // 일반 import로 변경

// 날짜를 "YYYY-MM-DD" 형식으로 포맷하는 헬퍼 함수
function formatDateToString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 감정 점수 파싱 함수 (개선)
function parseEmotionScores(reportText: string) {
  try {
    const startTag = '[EMOTION_SCORES]';
    const endTag = '[/EMOTION_SCORES]';
    
    const startIndex = reportText.indexOf(startTag);
    const endIndex = reportText.indexOf(endTag);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonString = reportText.substring(
        startIndex + startTag.length,
        endIndex
      ).trim();
      
      console.log("파싱할 JSON 문자열:", jsonString); // 디버깅용
      
      const emotionData = JSON.parse(jsonString);
      console.log("파싱된 감정 데이터:", emotionData); // 디버깅용
      
      return emotionData.emotionScores;
    } else {
      console.log("감정 점수 태그를 찾을 수 없습니다");
      return null;
    }
  } catch (error) {
    console.error('감정 점수 파싱 오류:', error);
    return null;
  }
}

// 레포트에서 감정 점수 부분 제거하는 함수 (개선)
function cleanReportText(reportText: string) {
  const startTag = '[EMOTION_SCORES]';
  const startIndex = reportText.indexOf(startTag);
  
  if (startIndex !== -1) {
    const cleanedText = reportText.substring(0, startIndex).trim();
    console.log("정리된 레포트 텍스트 길이:", cleanedText.length);
    console.log("정리된 레포트 미리보기:", cleanedText.substring(0, 100) + "...");
    return cleanedText;
  }
  
  console.log("감정 점수 태그가 없어서 원본 반환");
  return reportText;
}

export default function WeeklyDiaryFetcher() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<any[]>([]);
  const [combinedText, setCombinedText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 1주일치 다이어리 불러오기 함수
  const handleFetchWeekDiaries = async () => {
    if (!auth.currentUser) {
      Alert.alert("알림", "로그인이 필요해요");
      return;
    }
    
    setLoading(true);
    const userId = auth.currentUser.uid;
    const today = new Date();
    const aWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = formatDateToString(today);
    const aWeekAgoStr = formatDateToString(aWeekAgo);

    const diariesRef = collection(db, "diaries");
    const q = query(
      diariesRef,
      where("userId", "==", userId),
      where("date", ">=", aWeekAgoStr),
      where("date", "<=", todayStr)
    );

    try {
      const querySnap = await getDocs(q);
      const fetched = querySnap.docs.map((docSnap) => docSnap.data());
      console.log("가져온 다이어리 목록:", fetched);

      if (fetched.length === 0) {
        Alert.alert("알림", "분석할 다이어리가 없어요\n일주일간 다이어리를 작성해주세요 📝");
        setLoading(false);
        return;
      }

      // UI에 표시할 일기 목록
      setDiaries(fetched);

      // 합쳐진 텍스트 만들기
      const combined = fetched
        .map((d: any) => `- ${d.date}:\n${d.text}\n`)
        .join("\n");
      console.log("1주일치 다이어리 텍스트:", combined);
      setCombinedText(combined);
    } catch (err) {
      console.error("1주일치 다이어리 불러오기 오류:", err);
      Alert.alert("오류", "다이어리를 불러오는 중 문제가 발생했어요");
    } finally {
      setLoading(false);
    }
  };

  // AI 레포트 생성 및 저장
  const handleSendToAI = async () => {
    if (!combinedText) {
      Alert.alert("알림", "먼저 일주일치 다이어리를 불러와주세요");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("알림", "로그인이 필요해요");
      return;
    }

    setLoading(true);

    try {
      // 실제 OpenAI API 호출 (일반 import 사용)
      const aiResponse = await generateOpenAIReport(combinedText);
      console.log("=== AI 원본 응답 ===");
      console.log(aiResponse);
      console.log("=== 응답 끝 ===");

      // 감정 점수 파싱
      const emotionScores = parseEmotionScores(aiResponse);
      const cleanedReportText = cleanReportText(aiResponse);
      
      console.log("=== 정리된 레포트 텍스트 ===");
      console.log(cleanedReportText);
      console.log("=== 정리된 텍스트 끝 ===");

      // Firestore에 레포트 저장
      console.log("=== Firestore 저장 시작 ===");
      console.log("사용자 ID:", auth.currentUser.uid);
      console.log("정리된 레포트 텍스트 길이:", cleanedReportText.length);
      console.log("감정 점수 데이터:", emotionScores);
      
      const reportData = {
        ownerId: auth.currentUser.uid,
        reportText: cleanedReportText,
        emotionScores: emotionScores,
        createdAt: new Date().toISOString(),
        spouseId: null,
      };
      
      console.log("저장할 데이터:", reportData);

      const docRef = await addDoc(collection(db, "reports"), reportData);
      console.log("레포트 저장 완료! 문서 ID:", docRef.id);
      console.log("=== Firestore 저장 끝 ===");

      // 저장 직후 바로 확인해보기
      console.log("=== 저장 확인 테스트 ===");
      const testQuery = query(
        collection(db, "reports"),
        where("ownerId", "==", auth.currentUser.uid)
      );
      const testSnapshot = await getDocs(testQuery);
      console.log("내가 저장한 레포트 개수:", testSnapshot.size);
      testSnapshot.forEach((doc) => {
        console.log("레포트 ID:", doc.id, "데이터:", doc.data());
      });
      console.log("=== 저장 확인 끝 ===");

      // 성공 알림만! 내용은 절대 안 보여줌
      Alert.alert(
        "✨ 감정 분석 완료!",
        "새로운 레포트가 생성되었어요",
        [
          {
            text: "레포트 보기",
            onPress: () => {
              router.push(`/reports/${docRef.id}`);
            },
          },
          {
            text: "레포트함 가기", 
            onPress: () => {
              router.push('/reports/index');
            },
          },
          { text: "나중에 보기", style: "cancel" }
        ]
      );

    } catch (error) {
      console.error("AI 레포트 생성 오류:", error);
      Alert.alert("오류", "레포트 생성 중 문제가 발생했어요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <DefaultText style={styles.title}>
          🧠 감정 분석 레포트
        </DefaultText>
        <DefaultText style={styles.subtitle}>
          일주일간의 감정을 분석해드려요
        </DefaultText>
      </View>

      {/* 1단계: 다이어리 불러오기 */}
      <View style={styles.stepCard}>
        <DefaultText style={styles.stepTitle}>📋 1단계: 다이어리 불러오기</DefaultText>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleFetchWeekDiaries}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <DefaultText style={styles.buttonText}>일주일치 다이어리 가져오기</DefaultText>
          )}
        </TouchableOpacity>
      </View>

      {/* 불러온 일기 목록 */}
      {diaries.length > 0 && (
        <View style={styles.stepCard}>
          <DefaultText style={styles.stepTitle}>
            📝 분석할 다이어리 ({diaries.length}개)
          </DefaultText>
          <ScrollView style={styles.diaryList} showsVerticalScrollIndicator={false}>
            {diaries.map((item, index) => (
              <View key={index} style={styles.diaryItem}>
                <DefaultText style={styles.diaryDate}>{item.date}</DefaultText>
                <DefaultText style={styles.diaryText} numberOfLines={2}>
                  {item.text}
                </DefaultText>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 2단계: AI 분석 */}
      {combinedText && (
        <View style={styles.stepCard}>
          <DefaultText style={styles.stepTitle}>🤖 2단계: AI 감정 분석</DefaultText>
          <DefaultText style={styles.stepDescription}>
            수집된 다이어리를 바탕으로 전문적인 감정 분석을 시작해요
          </DefaultText>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]} 
            onPress={handleSendToAI}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <DefaultText style={styles.loadingText}>분석 중...</DefaultText>
              </View>
            ) : (
              <DefaultText style={styles.buttonText}>🧠 감정 분석 시작하기</DefaultText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF7",
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8A817C",
    textAlign: "center",
    lineHeight: 22,
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
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
  stepTitle: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 14,
    color: "#8A817C",
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#8A817C",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "GmarketSansTTFBold",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontFamily: "GmarketSansTTFMedium",
  },
  diaryList: {
    maxHeight: 200,
  },
  diaryItem: {
    backgroundColor: "#F9F6F3",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  diaryDate: {
    fontSize: 14,
    fontFamily: "GmarketSansTTFBold",
    color: "#5C3A2E",
    marginBottom: 8,
  },
  diaryText: {
    fontSize: 14,
    color: "#3B3029",
    lineHeight: 20,
  },
});