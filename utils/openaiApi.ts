// utils/openaiApi.ts - 애착유형 맞춤형 레포트 시스템
import { OPENAI_API_KEY } from "../config/openaiConfig";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

// GPT-3.5 Turbo 엔드포인트
const OPENAI_COMPLETION_URL = "https://api.openai.com/v1/chat/completions";

// 마크다운 제거 함수
function removeMarkdown(text: string): string {
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');  // 굵은 텍스트
  text = text.replace(/\*(.*?)\*/g, '$1');      // 이탤릭
  text = text.replace(/__(.*?)__/g, '$1');      // 밑줄
  text = text.replace(/_(.*?)_/g, '$1');        // 이탤릭
  text = text.replace(/#{1,6}\s?(.*)/g, '$1');  // 헤딩
  text = text.replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // 코드 블록
  text = text.replace(/^\s*-\s+/gm, '• ');      // 리스트
  text = text.replace(/^\s*\*\s+/gm, '• ');     // 리스트
  return text;
}

// 사용자의 애착유형 가져오기
const getUserAttachmentType = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      return userData?.attachmentType || 'secure';
    }
  } catch (error) {
    console.error("애착유형 조회 실패:", error);
  }
  return 'secure';
};

// 애착유형별 맞춤 프롬프트 생성
const createAttachmentAwarePrompt = (attachmentType: string) => {
  const typeInfo = {
    secure: {
      name: '안정형',
      characteristics: '관계에서 안정감을 느끼고 균형 잡힌 감정 표현',
      patterns: '일관된 감정 상태, 갈등 시 건설적 해결',
      advice: '현재의 안정성 유지하며 상대방 지지'
    },
    anxious: {
      name: '불안형',
      characteristics: '상대방의 반응에 민감하고 확인 욕구가 강함',
      patterns: '감정 기복, 과도한 걱정, 즉시 반응 경향',
      advice: '10분 기다리기, 자기 진정 연습'
    },
    avoidant: {
      name: '회피형',
      characteristics: '독립성을 중시하고 감정 표현을 어려워함',
      patterns: '감정 억제, 거리두기, 혼자만의 시간 선호',
      advice: '작은 감정부터 표현 연습, 점진적 친밀감 늘리기'
    },
    disorganized: {
      name: '혼란형',
      characteristics: '일관되지 않은 애착 행동과 감정 변화',
      patterns: '예측 불가한 감정 반응, 접근-회피 반복',
      advice: '감정 패턴 인식, 안정적 루틴 만들기'
    }
  };

  const info = typeInfo[attachmentType as keyof typeof typeInfo] || typeInfo.secure;

  return `
당신은 커플 심리학과 애착이론 전문가입니다. 
사용자의 애착유형은 ${info.name}입니다.

${info.name}의 특성: ${info.characteristics}
전형적 패턴: ${info.patterns}

${info.name}의 관점에서 일주일 일기를 분석해 맞춤형 레포트를 작성하세요.

형식:
1. 요약
${info.name}인 당신의 이번 주는... (애착 특성을 고려한 분석 2-3문장)

2. ${info.name} 관점에서의 감정분석
- 주요감정: (3개)
- 애착 패턴: ${info.name}의 전형적 특성이 어떻게 나타났는지 분석
- 감정 변화: 애착유형 관점에서의 해석 (2-3문장)
- 현재 상태: ${info.name}의 관계 욕구 충족도 평가

3. ${info.name}를 위한 맞춤 조언
- 상대방 권장 행동: ${info.name}에게 도움이 되는 구체적 행동
- 본인 개선점: ${info.name} 특성을 고려한 성장 방향
- ${info.name} 맞춤 실천법: 
  1) ${info.advice}와 관련된 구체적 방법
  2) 애착 안정성 향상을 위한 실천법

4. 다음 주 ${info.name} 관계 미션
- ${info.name} 특성에 맞는 관계 개선 과제 3가지

반드시 마지막에 완전한 7일 JSON:
[EMOTION_SCORES]
{"emotionScores":[{"day":"월요일","happiness":7.5,"anxiety":3.2,"sadness":2.1,"anger":1.5,"love":8.0,"overall":7.2},{"day":"화요일","happiness":8.0,"anxiety":2.0,"sadness":1.8,"anger":1.0,"love":8.5,"overall":7.9},{"day":"수요일","happiness":7.8,"anxiety":3.5,"sadness":3.0,"anger":2.0,"love":7.0,"overall":6.8},{"day":"목요일","happiness":6.5,"anxiety":4.0,"sadness":4.5,"anger":3.2,"love":5.0,"overall":4.8},{"day":"금요일","happiness":5.0,"anxiety":6.0,"sadness":6.5,"anger":4.0,"love":3.0,"overall":4.9},{"day":"토요일","happiness":4.5,"anxiety":7.0,"sadness":7.8,"anger":5.0,"love":2.5,"overall":5.6},{"day":"일요일","happiness":3.5,"anxiety":7.8,"sadness":8.4,"anger":6.2,"love":2.0,"overall":4.9}]}
[/EMOTION_SCORES]

${info.name}의 특성을 충분히 활용해 전문적이고 개인화된 분석을 제공하세요.`;
};

// 메인 레포트 생성 함수
export async function generateOpenAIReport(userDiaryText: string): Promise<string> {
  try {
    console.log("OpenAI API 호출 시작...");
    
    // 사용자의 애착유형 가져오기
    const attachmentType = await getUserAttachmentType();
    const systemPrompt = createAttachmentAwarePrompt(attachmentType);
    
    console.log("사용자 애착유형:", attachmentType);
    
    // 입력 텍스트 최적화
    const trimmedInput = userDiaryText.slice(0, 600);
    
    const response = await fetch(OPENAI_COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `일주일 일기 분석:\n\n${trimmedInput}`,
          },
        ],
        max_tokens: 1800,
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 0.6,
        presence_penalty: 0.4,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API 오류:", errorData);
      throw new Error(`OpenAI API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    let aiText = data.choices?.[0]?.message?.content || "응답을 가져올 수 없습니다.";
    
    console.log("OpenAI 원본 응답:", aiText);
    
    // JSON 완성도 검증 및 복구
    const hasStartTag = aiText.includes('[EMOTION_SCORES]');
    const hasEndTag = aiText.includes('[/EMOTION_SCORES]');
    
    if (hasStartTag && !hasEndTag) {
      console.log("JSON 자동 복구 시도");
      const startIndex = aiText.indexOf('[EMOTION_SCORES]');
      const jsonPart = aiText.substring(startIndex);
      const lastCompleteObject = jsonPart.lastIndexOf(',"overall":');
      
      if (lastCompleteObject !== -1) {
        const afterOverall = jsonPart.indexOf('}', lastCompleteObject);
        if (afterOverall !== -1) {
          const beforeJson = aiText.substring(0, startIndex);
          const completeJson = jsonPart.substring(0, afterOverall + 1) + ']}';
          aiText = beforeJson + '[EMOTION_SCORES]\n' + completeJson + '\n[/EMOTION_SCORES]';
          console.log("JSON 자동 복구 완료");
        }
      }
    }
    
    // 마크다운 제거
    aiText = removeMarkdown(aiText);
    
    console.log("애착유형 맞춤 레포트 생성 완료");
    return aiText;
    
  } catch (error) {
    console.error("generateOpenAIReport 오류:", error);
    
    // 개발용 애착유형별 모크 데이터
    if (__DEV__) {
      const attachmentType = await getUserAttachmentType();
      const typeNames = {
        secure: '안정형',
        anxious: '불안형',
        avoidant: '회피형',
        disorganized: '혼란형'
      };
      
      const typeName = typeNames[attachmentType as keyof typeof typeNames] || '안정형';
      
      return `1. 요약
${typeName}인 당신의 이번 주는 초반에는 안정적이었지만 주 후반으로 갈수록 ${typeName}의 특성이 뚜렷하게 나타나며 감정적 어려움을 겪었습니다. ${typeName}의 전형적인 패턴이 관찰되었습니다.

2. ${typeName} 관점에서의 감정분석
- 주요감정: 행복, 사랑, 불안
- 애착 패턴: ${typeName}의 특성인 관계에서의 민감성과 확인 욕구가 이번 주 내내 나타났습니다. 특히 상대방의 반응에 대한 과도한 걱정이 불안감을 증폭시켰습니다.
- 감정 변화: 초기 안정감에서 점진적 불안 증가는 ${typeName}의 전형적 패턴으로, 관계 안정성에 대한 확신이 흔들릴 때 나타나는 반응입니다.
- 현재 상태: ${typeName}의 핵심 욕구인 안정적 연결감이 충족되지 않아 정서적 회복이 필요한 상태입니다.

3. ${typeName}를 위한 맞춤 조언
- 상대방 권장 행동: ${typeName}에게는 일관된 관심 표현과 예측 가능한 소통 패턴이 도움됩니다. 불안할 때 즉시 안심시켜 주세요.
- 본인 개선점: ${typeName}의 특성을 이해하고 즉시 반응하는 습관을 개선해보세요. 감정이 올라올 때 10분 기다리기를 연습하세요.
- ${typeName} 맞춤 실천법:
  1) 불안한 순간에 즉시 연락하는 대신 10분 심호흡 후 차분하게 소통하기
  2) 매일 관계에서 좋았던 점 3가지 적어보며 긍정 강화하기

4. 다음 주 ${typeName} 관계 미션
- 매일 감정 체크인: "지금 내가 느끼는 것은?" 하루 3번 물어보기
- 확인 욕구 조절: 궁금한 것 있을 때 바로 묻지 말고 하루 모아서 정리해서 대화하기
- 자기 돌봄 루틴: ${typeName}에게 필요한 안정감을 위해 규칙적인 개인 시간 갖기

[EMOTION_SCORES]
{"emotionScores":[{"day":"월요일","happiness":7.5,"anxiety":3.2,"sadness":2.1,"anger":1.5,"love":8.0,"overall":7.2},{"day":"화요일","happiness":8.0,"anxiety":2.0,"sadness":1.8,"anger":1.0,"love":8.5,"overall":7.9},{"day":"수요일","happiness":7.8,"anxiety":3.5,"sadness":3.0,"anger":2.0,"love":7.0,"overall":6.8},{"day":"목요일","happiness":6.5,"anxiety":4.0,"sadness":4.5,"anger":3.2,"love":5.0,"overall":4.8},{"day":"금요일","happiness":5.0,"anxiety":6.0,"sadness":6.5,"anger":4.0,"love":3.0,"overall":4.9},{"day":"토요일","happiness":4.5,"anxiety":7.0,"sadness":7.8,"anger":5.0,"love":2.5,"overall":5.6},{"day":"일요일","happiness":3.5,"anxiety":7.8,"sadness":8.4,"anger":6.2,"love":2.0,"overall":4.9}]}
[/EMOTION_SCORES]`;
    }
    
    throw error;
  }
}