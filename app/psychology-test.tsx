// app/psychology-test.tsx - 심리테스트 화면
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
  const [result, setResult] = useState<PersonalityResult | null>(null);

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
      setResult(personalityResult);

      // Firebase에 결과 저장
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          personalityType: personalityResult.type,
          personalityResult: personalityResult,
          testCompletedAt: new Date(),
          testAnswers: finalAnswers
        }, { merge: true });
      }
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

  // 메인 화면으로 이동
  const goToMain = () => {
    router.replace('/calendar');
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <DefaultText style={styles.loadingText}>
            당신의 성향을 분석하고 있어요...
          </DefaultText>
          <DefaultText style={styles.loadingSubText}>
            잠시만 기다려주세요 ✨
          </DefaultText>
        </View>
      </View>
    );
  }

  // 결과 화면
  if (result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContainer}>
        <View style={styles.resultHeader}>
          <DefaultText style={styles.resultEmoji}>{result.emoji}</DefaultText>
          <DefaultText style={styles.resultTitle}>{result.title}</DefaultText>
          <DefaultText style={styles.resultDescription}>{result.description}</DefaultText>
        </View>

        <View style={styles.characteristicsSection}>
          <DefaultText style={styles.sectionTitle}>✨ 당신의 특징</DefaultText>
          {result.characteristics.map((characteristic, index) => (
            <View key={index} style={styles.characteristicItem}>
              <DefaultText style={styles.bullet}>•</DefaultText>
              <DefaultText style={styles.characteristicText}>{characteristic}</DefaultText>
            </View>
          ))}
        </View>

        <View style={styles.recommendationsSection}>
          <DefaultText style={styles.sectionTitle}>💡 추천 활동</DefaultText>
          {result.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <DefaultText style={styles.bullet}>•</DefaultText>
              <DefaultText style={styles.recommendationText}>{recommendation}</DefaultText>
            </View>
          ))}
        </View>

        <View style={styles.templatesSection}>
          <DefaultText style={styles.sectionTitle}>📝 추천 템플릿</DefaultText>
          <View style={styles.templateContainer}>
            {result.templates.map((template, index) => (
              <View key={index} style={styles.templateChip}>
                <DefaultText style={styles.templateText}>{template}</DefaultText>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={goToMain}>
          <DefaultText style={styles.startButtonText}>🚀 다이어리 시작하기</DefaultText>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // 질문 화면
  const question = PSYCHOLOGY_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / PSYCHOLOGY_QUESTIONS.length) * 100;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <DefaultText style={styles.backButtonText}>←</DefaultText>
        </TouchableOpacity>
        <DefaultText style={styles.questionCounter}>
          {currentQuestion + 1} / {PSYCHOLOGY_QUESTIONS.length}
        </DefaultText>
      </View>

      {/* 진행률 바 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* 질문 영역 */}
      <View style={styles.questionContainer}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  questionCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLetterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#999999',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  resultContainer: {
    padding: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  characteristicsSection: {
    marginBottom: 32,
  },
  recommendationsSection: {
    marginBottom: 32,
  },
  templatesSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  characteristicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    color: '#FF6B6B',
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  characteristicText: {
    color: '#CCCCCC',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  recommendationText: {
    color: '#CCCCCC',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  templateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  templateText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});