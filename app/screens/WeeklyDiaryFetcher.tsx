// app/screens/WeeklyDiaryFetcher.tsx
import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import DefaultText from "app/components/DefaultText";

// 날짜를 "YYYY-MM-DD" 형식으로 포맷하는 헬퍼 함수
function formatDateToString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WeeklyDiaryFetcher() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [combinedText, setCombinedText] = useState<string>("");

  // 1주일치 다이어리 불러오기 함수
  const handleFetchWeekDiaries = async () => {
    if (!auth.currentUser) {
      console.log("로그인이 필요합니다.");
      return;
    }
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
    }
  };

  // AI 전송 버튼 (현재는 콘솔에 텍스트 출력)
  const handleSendToAI = () => {
    if (!combinedText) {
      console.log("일주일치 텍스트가 없습니다.");
      return;
    }
    console.log("AI에게 보낼 텍스트:", combinedText);
    // TODO: AI API 호출 로직 추가
  };

  return (
    <View style={styles.container}>
      <DefaultText style={styles.title}>
        1주일치 다이어리 가져오기 테스트
      </DefaultText>

      {/* 7일치 불러오기 버튼 */}
      <TouchableOpacity style={styles.customButton} onPress={handleFetchWeekDiaries}>
        <DefaultText style={styles.buttonText}>가져오기</DefaultText>
      </TouchableOpacity>

      {/* 불러온 일기 목록 */}
      <ScrollView style={styles.diaryList}>
        {diaries.length === 0 ? (
          <DefaultText style={styles.noDiary}>데이터가 없습니다.</DefaultText>
        ) : (
          diaries.map((item, index) => (
            <View key={index} style={styles.diaryItem}>
              <DefaultText style={styles.diaryDate}>{item.date}</DefaultText>
              <DefaultText style={styles.diaryText}>{item.text}</DefaultText>
            </View>
          ))
        )}
      </ScrollView>

      {/* AI에게 레포트 요청 버튼 */}
      <TouchableOpacity style={styles.customButton} onPress={handleSendToAI}>
        <DefaultText style={styles.buttonText}>AI에게 레포트 받기</DefaultText>
      </TouchableOpacity>

      <DefaultText style={styles.note}>
        콘솔에서 7일치 목록 및 합쳐진 텍스트를 확인해보세요.
      </DefaultText>
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
    fontWeight: "bold",
  },
  diaryList: {
    flex: 1,
    marginVertical: 16,
  },
  noDiary: {
    marginTop: 12,
    textAlign: "center",
    color: "#000",
  },
  diaryItem: {
    marginBottom: 10,
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
  customButton: {
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
    color: "#000",
  },
  note: {
    marginTop: 12,
    textAlign: "center",
    color: "#000",
  },
});
