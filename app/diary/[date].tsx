// app/diary/[date].tsx - 심리학 기반 감정 스티커 + 웜톤 베이지 스타일
import React, { useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import DefaultText from "../components/DefaultText";

// 심리학 기반 최적화된 감정 스티커 (커플 관계 특화)
const EMOTION_STICKERS = [
  { id: 'love', emoji: '🥰', label: '사랑', color: '#F4E4C1', description: '따뜻한 애정' },
  { id: 'happy', emoji: '😊', label: '행복', color: '#F9E8D8', description: '기쁜 마음' },
  { id: 'grateful', emoji: '🙏', label: '감사', color: '#F0D5A8', description: '고마운 마음' },
  { id: 'calm', emoji: '😌', label: '평온', color: '#E8D5B7', description: '차분한 상태' },
  { id: 'anxious', emoji: '😰', label: '불안', color: '#D4C5A9', description: '걱정되는 마음' },
  { id: 'jealous', emoji: '😔', label: '질투', color: '#C9B8A3', description: '시기하는 마음' },
  { id: 'lonely', emoji: '💔', label: '외로움', color: '#BDA990', description: '혼자인 느낌' },
  { id: 'sorry', emoji: '🙏', label: '미안함', color: '#B39C7D', description: '죄송한 마음' },
  { id: 'sad', emoji: '😢', label: '슬픔', color: '#A08B6F', description: '우울한 기분' },
  { id: 'stressed', emoji: '😤', label: '스트레스', color: '#8D7A65', description: '압박감' },
];

// 요일 한국어 변환
const getKoreanDayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr);
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[date.getDay()];
};

// 날짜 포맷팅 함수
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
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
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 컴포넌트가 처음 렌더링될 때 다이어리 불러오기
  useEffect(() => {
    const loadDiary = async () => {
      if (!auth.currentUser || !date) return;
      try {
        const paddedDate = padDateParam(date as string);
        const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
        const diarySnap = await getDoc(diaryRef);
        if (diarySnap.exists()) {
          const data = diarySnap.data();
          setDiaryText(data.text || "");
          setSelectedStickers(data.emotionStickers || []);
        }
      } catch (error) {
        console.error("다이어리 로드 오류:", error);
      }
    };
    loadDiary();
  }, [date]);

  // 감정 스티커 선택/해제
  const toggleSticker = (stickerId: string) => {
    setSelectedStickers(prev => {
      if (prev.includes(stickerId)) {
        return prev.filter(id => id !== stickerId);
      } else {
        return [...prev, stickerId];
      }
    });
  };

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
          emotionStickers: selectedStickers,
          date: paddedDate,
          userId: auth.currentUser.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      Alert.alert("완료", "다이어리를 저장했습니다!");
      router.push("/calendar");
    } catch (error) {
      console.error("다이어리 저장 오류:", error);
      Alert.alert("오류", "다이어리를 저장할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!date) {
    return (
      <View style={styles.container}>
        <DefaultText style={styles.errorText}>날짜 정보가 없습니다.</DefaultText>
      </View>
    );
  }

  const paddedDate = padDateParam(date as string);
  const dayOfWeek = getKoreanDayOfWeek(paddedDate);
  const formattedDate = formatDate(date as string);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 날짜와 요일 표시 - 웜톤 베이지 헤더 */}
      <View style={styles.dateSection}>
        <DefaultText style={styles.dateText}>{formattedDate}</DefaultText>
        <DefaultText style={styles.dayText}>{dayOfWeek}</DefaultText>
        <View style={styles.decorativeLine} />
      </View>

      {/* 감정 스티커 섹션 - 웜톤 베이지 카드 */}
      <View style={styles.stickerSection}>
        <DefaultText style={styles.sectionTitle}>오늘의 마음은 어떠셨나요?</DefaultText>
        <DefaultText style={styles.sectionSubtitle}>
          여러 감정을 함께 선택하셔도 좋아요
        </DefaultText>
        
        <View style={styles.stickersGrid}>
          {EMOTION_STICKERS.map((sticker) => {
            const isSelected = selectedStickers.includes(sticker.id);
            return (
              <TouchableOpacity
                key={sticker.id}
                style={[
                  styles.stickerButton,
                  isSelected && {
                    backgroundColor: sticker.color,
                    borderColor: '#8D7A65',
                    borderWidth: 2,
                    transform: [{ scale: 1.05 }],
                    shadowColor: '#8D7A65',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }
                ]}
                onPress={() => toggleSticker(sticker.id)}
              >
                <DefaultText style={styles.stickerEmoji}>{sticker.emoji}</DefaultText>
                <DefaultText style={[
                  styles.stickerLabel,
                  isSelected && styles.selectedStickerLabel
                ]}>
                  {sticker.label}
                </DefaultText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 선택된 스티커 미리보기 - 웜톤 베이지 */}
      {selectedStickers.length > 0 && (
        <View style={styles.selectedSection}>
          <DefaultText style={styles.selectedTitle}>선택하신 오늘의 감정</DefaultText>
          <View style={styles.selectedStickers}>
            {selectedStickers.map(stickerId => {
              const sticker = EMOTION_STICKERS.find(s => s.id === stickerId);
              return sticker ? (
                <View key={stickerId} style={[styles.selectedSticker, { backgroundColor: sticker.color }]}>
                  <DefaultText style={styles.selectedEmoji}>{sticker.emoji}</DefaultText>
                  <DefaultText style={styles.selectedLabel}>{sticker.label}</DefaultText>
                </View>
              ) : null;
            })}
          </View>
        </View>
      )}

      {/* 다이어리 작성 섹션 - 웜톤 베이지 */}
      <View style={styles.textSection}>
        <DefaultText style={styles.sectionTitle}>오늘의 이야기</DefaultText>
        <DefaultText style={styles.textSubtitle}>
          오늘의 사건과 감정이 있다면 편안하게 적어주세요.{'\n'}
          작은 일상도 소중한 기록이 됩니다.
        </DefaultText>
        
        <TextInput
          style={styles.textInput}
          placeholder="어떤 하루를 보내셨나요? 마음 속 이야기를 들려주세요..."
          placeholderTextColor="#A08B6F"
          multiline
          value={diaryText}
          onChangeText={setDiaryText}
          textAlignVertical="top"
        />
      </View>

      {/* 저장 버튼 - 웜톤 베이지 */}
      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
        onPress={handleSaveDiary} 
        disabled={loading}
      >
        <DefaultText style={styles.saveButtonText}>
          {loading ? "소중히 저장하는 중..." : "마음을 저장하기"}
        </DefaultText>
      </TouchableOpacity>

      {/* 하단 여백 */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3E9", // 웜톤 베이지 메인 배경
  },
  
  // 날짜 섹션 - 웜톤 베이지 헤더
  dateSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 25,
    backgroundColor: '#F4E4C1', // 연한 베이지
    marginBottom: 20,
  },
  dateText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#5D4E37', // 다크 브라운
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#8D7A65', // 미디엄 브라운
    fontWeight: '500',
    marginBottom: 15,
  },
  decorativeLine: {
    width: 60,
    height: 3,
    backgroundColor: '#C9B8A3',
    borderRadius: 2,
  },

  // 감정 스티커 섹션 - 웜톤 베이지 카드
  stickerSection: {
    backgroundColor: '#FAF6F0', // 아이보리
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0D5A8',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8D7A65',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  stickersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stickerButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#F7F3E9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#E8D5B7',
  },
  stickerEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  stickerLabel: {
    fontSize: 10,
    color: '#8D7A65',
    textAlign: 'center',
    fontWeight: '600',
  },
  selectedStickerLabel: {
    color: '#5D4E37',
    fontWeight: 'bold',
  },

  // 선택된 스티커 미리보기 - 웜톤 베이지
  selectedSection: {
    backgroundColor: '#FAF6F0',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0D5A8',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 15,
    textAlign: 'center',
  },
  selectedStickers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  selectedSticker: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
    minWidth: 70,
  },
  selectedEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  selectedLabel: {
    fontSize: 11,
    color: '#5D4E37',
    fontWeight: '600',
  },

  // 텍스트 작성 섹션 - 웜톤 베이지
  textSection: {
    backgroundColor: '#FAF6F0',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0D5A8',
  },
  textSubtitle: {
    fontSize: 14,
    color: '#8D7A65',
    marginBottom: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  textInput: {
    minHeight: 200,
    borderWidth: 1.5,
    borderColor: '#E8D5B7',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#5D4E37',
    backgroundColor: '#F7F3E9',
    lineHeight: 26,
  },

  // 저장 버튼 - 웜톤 베이지
  saveButton: {
    marginHorizontal: 20,
    backgroundColor: '#C9B8A3',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#BDA990',
  },
  saveButtonDisabled: {
    backgroundColor: '#E8D5B7',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
  },

  // 기타
  errorText: {
    fontSize: 16,
    color: '#A08B6F',
    textAlign: 'center',
    marginTop: 100,
  },
  bottomSpace: {
    height: 40,
  },
});