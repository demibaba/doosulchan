// app/diary/[date].tsx
import React, { useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import DefaultText from "../components/DefaultText";

// app/diary/[date].tsx에 이 함수를 추가하세요 (파일 맨 위, import 아래)
export function openDiaryEntry(dateParam: string) {
  // 가능한 모든 기능 수행
  console.log("다이어리 열기:", dateParam);
  // 기존 코드는 그대로 유지
}
// "2025-2-20" → "2025-02-20"로 변환하는 함수
function padDateParam(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export default function DiaryEntryPage() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();

  const [diaryText, setDiaryText] = useState("");
  const [loading, setLoading] = useState(false);

  // 컴포넌트가 처음 렌더링될 때 또는 date가 바뀔 때 Firestore에서 다이어리 불러오기
  useEffect(() => {
    const loadDiary = async () => {
      if (!auth.currentUser || !date) return;
      try {
        const paddedDate = padDateParam(date as string);
        // 문서 ID는 "userUid_paddedDate" 형태로 지정
        const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
        const diarySnap = await getDoc(diaryRef);
        if (diarySnap.exists()) {
          const data = diarySnap.data();
          setDiaryText(data.text || "");
        }
      } catch (error) {
        console.error("다이어리 로드 오류:", error);
      }
    };
    loadDiary();
  }, [date]);

  // 다이어리 저장 함수
  const handleSaveDiary = async () => {
    if (!date) {
      Alert.alert("오류", "날짜 정보가 없어요!");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("오류", "로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    try {
      const paddedDate = padDateParam(date as string);
      const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
      await setDoc(
        diaryRef,
        {
          text: diaryText,
          date: paddedDate, // "YYYY-MM-DD" 형식으로 저장
          userId: auth.currentUser.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      Alert.alert("성공", "다이어리를 저장했습니다!");
      router.push("/calendar");
    } catch (error) {
      console.error("다이어리 저장 오류:", error);
      Alert.alert("오류", "다이어리를 저장할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 선택된 날짜와 함께 제목 표시 */}
      <DefaultText style={styles.title}>다이어리 작성 - {date}</DefaultText>

      {/* 다이어리 입력창 */}
      <TextInput
        style={styles.textInput}
        placeholder="오늘의 이야기를 작성하세요..."
        placeholderTextColor="#aaa"
        multiline
        value={diaryText}
        onChangeText={setDiaryText}
      />

      {/* 저장 버튼 */}
      <TouchableOpacity style={styles.button} onPress={handleSaveDiary} disabled={loading}>
        <DefaultText style={styles.buttonText}>
          {loading ? "저장 중..." : "다이어리 저장"}
        </DefaultText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFF", // 흰색 배경
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#000", // 검정 텍스트
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000", // 검정 테두리
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    marginBottom: 20,
    color: "#000", // 입력 텍스트 검정색
    backgroundColor: "#FFF",
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#000", // 검정 테두리
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFF", // 흰색 배경
  },
  buttonText: {
    fontSize: 18,
    color: "#000", // 검정 텍스트
  },
});