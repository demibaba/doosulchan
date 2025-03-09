// app/screens/WeeklyDiaryScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import { generateOpenAIReport } from "../../utils/openaiApi";
import DefaultText from "app/components/DefaultText";

// 날짜 포맷 함수
function formatDateToString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WeeklyDiaryScreen() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<any[]>([]);
  const [combinedText, setCombinedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchWeekDiaries();
  }, []);

  const fetchWeekDiaries = async () => {
    if (!auth.currentUser) {
      console.log("로그인이 필요합니다.");
      return;
    }
    setLoading(true);

    const userId = auth.currentUser.uid;
    const today = new Date();
    const aWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = formatDateToString(today);
    const aWeekAgoStr = formatDateToString(aWeekAgo);

    try {
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", userId),
        where("date", ">=", aWeekAgoStr),
        where("date", "<=", todayStr)
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map((doc) => doc.data());
      setDiaries(fetched);

      const combined = fetched
        .map((d: any) => `- ${d.date}:\n${d.text}\n`)
        .join("\n");
      setCombinedText(combined);

      console.log("주간 일기 목록:", fetched);
      console.log("합쳐진 텍스트:", combined);
    } catch (err) {
      console.error("주간 다이어리 불러오기 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToAI = async () => {
    if (!combinedText) {
      Alert.alert("오류", "주간 다이어리 데이터가 없습니다.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("오류", "로그인 상태를 확인하세요.");
      return;
    }

    try {
      setAiLoading(true);
      // GPT-3.5 호출
      const aiResponse = await generateOpenAIReport(combinedText);
      console.log("AI 레포트:", aiResponse);

      // Firestore에 저장
      const ownerId = user.uid;
      const reportsRef = collection(db, "reports");
      const reportDocRef = doc(reportsRef); // 자동 문서 ID 생성
      await setDoc(reportDocRef, {
        ownerId: ownerId,
        reportText: aiResponse,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("AI 레포트", "레포트가 성공적으로 저장되었습니다.\n\n" + aiResponse);
      // 필요시 레포트 상세 페이지로 이동: router.push(`/reports/${reportDocRef.id}`);
    } catch (error) {
      console.error("AI 호출 오류:", error);
      Alert.alert("오류", "AI 레포트 생성에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <DefaultText style={styles.title}>최근 7일 다이어리</DefaultText>

      {loading ? (
        <DefaultText style={styles.loading}>불러오는 중...</DefaultText>
      ) : (
        <ScrollView style={styles.diaryList}>
          {diaries.length === 0 ? (
            <DefaultText style={styles.noDiary}>일기가 없습니다.</DefaultText>
          ) : (
            diaries.map((item, index) => (
              <View key={index} style={styles.diaryItem}>
                <DefaultText style={styles.diaryDate}>{item.date}</DefaultText>
                <DefaultText style={styles.diaryText}>{item.text}</DefaultText>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* AI 레포트 받기 버튼 */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSendToAI}
        disabled={aiLoading}
      >
        <DefaultText style={styles.buttonText}>
          {aiLoading ? "AI 레포트 생성 중..." : "AI에게 레포트 받기"}
        </DefaultText>
      </TouchableOpacity>

      {/* 돌아가기 버튼 */}
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <DefaultText style={styles.buttonText}>돌아가기</DefaultText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF", // 흰색 배경
    padding: 16,
  },
  title: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: "center",
    color: "#000", // 검정 텍스트
  },
  loading: {
    textAlign: "center",
    marginVertical: 10,
    color: "#000",
  },
  diaryList: {
    flex: 1,
    marginVertical: 10,
  },
  noDiary: {
    textAlign: "center",
    color: "#000",
    marginTop: 10,
  },
  diaryItem: {
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#FFF",
  },
  diaryDate: {
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000",
  },
  diaryText: {
    color: "#000",
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#000", // 검정 테두리
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFF", // 흰색 배경
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 18,
    color: "#000", // 검정 텍스트
  },
});
