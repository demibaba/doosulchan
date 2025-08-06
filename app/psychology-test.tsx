// app/psychology-test.tsx - 웜톤 베이지 업그레이드된 심리테스트 화면
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import DefaultText from './components/DefaultText';
import { 
  PSYCHOLOGY_QUESTIONS, 
  analyzePersonality, 
  isTestComplete,
  TestAnswers,
  PersonalityResult 
} from '../utils/psychologyTest';

export default function PsychologyTest() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [isLoading, setIsLoading] = useState(false);

  // 답변 선택 처리
  const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    const question = PSYCHOLOGY_QUESTIONS[currentQuestion];
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);

    // 마지막 질문이면 결과 계산
    if (currentQuestion === PSYCHOLOGY_QUESTIONS.length - 1) {
      calculateResult(newAnswers);
    } else {
      // 다음 질문으로
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    }
  };

  // 결과 계산 및 저장
  const calculateResult = async (finalAnswers: TestAnswers) => {
    setIsLoading(true);
    
    try {
      // 성향 분석
      const personalityResult = analyzePersonality(finalAnswers);

      // Firebase에 결과 저장
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          personalityType: personalityResult.type,
          personalityResult: personalityResult,
          testCompletedAt: new Date(),
          testAnswers: finalAnswers,
          onboardingCompleted: true
        }, { merge: true });
      }

      // ✅ 통합 결과페이지로 이동
      router.replace('/onboarding-results');
      
    } catch (error) {
      console.error('심리테스트 결과 저장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 뒤로가기
  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      router.back();
    }
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#C9B8A3" />
            <DefaultText style={styles.loadingText}>
              당신의 성향을 분석하고 있어요...
            </DefaultText>
            <DefaultText style={styles.loadingSubText}>
              결과 페이지로 이동 중 ✨
            </DefaultText>
          </View>
        </View>
      </View>
    );
  }

  // 질문 화면
  const question = PSYCHOLOGY_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / PSYCHOLOGY_QUESTIONS.length) * 100;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <DefaultText style={styles.headerTitle}>성향 분석</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          나에게 맞는 다이어리 스타일을 찾아보세요
        </DefaultText>
      </View>

      {/* 진행률 */}
      <View style={styles.progressContainer}>
        <DefaultText style={styles.progressText}>
          {currentQuestion + 1} / {PSYCHOLOGY_QUESTIONS.length}
        </DefaultText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* 질문 영역 */}
      <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
        <DefaultText style={styles.questionTitle}>{question.question}</DefaultText>
        
        <View style={styles.optionsContainer}>
          {Object.entries(question.options).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={styles.optionButton}
              onPress={() => handleAnswer(key as 'A' | 'B' | 'C' | 'D')}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionLetter}>
                  <DefaultText style={styles.optionLetterText}>{key}</DefaultText>
                </View>
                <DefaultText style={styles.optionText}>{value}</DefaultText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 뒤로가기 버튼 */}
        {currentQuestion > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <DefaultText style={styles.backButtonText}>← 이전 질문</DefaultText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF7", // 웜톤 베이지 배경
  },
  
  // 헤더 스타일
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3B3029",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#8A817C",
    textAlign: "center",
  },
  
  // 진행률 스타일
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressText: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E7E1DB",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C9B8A3",
    borderRadius: 2,
  },
  
  // 질문 영역 스타일
  questionContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3B3029",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7E1DB",
    shadowColor: "#3B3029",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#C9B8A3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionLetterText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  optionText: {
    color: "#5C3A2E",
    fontSize: 16,
    flex: 1,
    lineHeight: 24,
  },
  
  // 뒤로가기 버튼
  backButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  backButtonText: {
    color: "#8A817C",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  
  // 로딩 화면 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#3B3029",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    color: "#3B3029",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  loadingSubText: {
    color: "#8A817C",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  
  // 결과 화면 스타일
  resultContainer: {
    padding: 24,
    paddingTop: 60,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#3B3029",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  emojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F9F6F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E7E1DB",
  },
  resultEmoji: {
    fontSize: 60,
  },
  resultTitle: {
    color: "#3B3029",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  resultDescription: {
    color: "#5C3A2E",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  
  // 섹션 스타일
  characteristicsSection: {
    marginBottom: 24,
  },
  recommendationsSection: {
    marginBottom: 24,
  },
  templatesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: "#3B3029",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: "#F9F6F3",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E1DB",
  },
  characteristicItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletContainer: {
    width: 20,
    alignItems: "center",
  },
  bullet: {
    color: "#C9B8A3",
    fontSize: 16,
    fontWeight: "bold",
  },
  characteristicText: {
    color: "#5C3A2E",
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  recommendationText: {
    color: "#5C3A2E",
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  
  // 템플릿 스타일
  templateContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateChip: {
    backgroundColor: "#F9F6F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C9B8A3",
  },
  templateText: {
    color: "#C9B8A3",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // 시작 버튼
  startButton: {
    backgroundColor: "#C9B8A3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#8A817C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});