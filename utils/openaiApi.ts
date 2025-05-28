// utils/openaiApi.ts - 감정 점수 포함 개선 버전
import { OPENAI_API_KEY } from "../config/openaiConfig";

// GPT-3.5 Turbo 엔드포인트
const OPENAI_COMPLETION_URL = "https://api.openai.com/v1/chat/completions";

// 마크다운 제거 함수 (보완)
function removeMarkdown(text: string): string {
  // 별표로 둘러싸인 텍스트에서 별표 제거 (굵은 텍스트와 이탤릭)
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');  // 굵은 텍스트 (**텍스트**)
  text = text.replace(/\*(.*?)\*/g, '$1');      // 이탤릭 (*텍스트*)
  
  // 다른 마크다운 서식 제거
  text = text.replace(/__(.*?)__/g, '$1');      // 밑줄 (__텍스트__)
  text = text.replace(/_(.*?)_/g, '$1');        // 이탤릭 (_텍스트_)
  text = text.replace(/#{1,6}\s?(.*)/g, '$1');  // 헤딩 (# 제거)
  text = text.replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // 코드 블록
  text = text.replace(/^\s*-\s+/gm, '• ');      // 리스트 (-를 •로)
  text = text.replace(/^\s*\*\s+/gm, '• ');     // 리스트 (*를 •로)
  
  return text;
}

// 토큰 최적화된 간단 프롬프트 (기존 800토큰 → 약 150토큰!)
const systemPrompt = `
당신은 관계 상담 전문가입니다. 일주일 일기를 분석해 간단한 레포트를 작성하세요.

출력 형식:
1. 일기 요약 (핵심 2-3문장)

2. 감정 분석
◆ 주요 감정: (3개 키워드)
◆ 감정 변화: (간단히 2-3문장)
◆ 심리 상태: (현재 상태 2-3문장)

3. 관계 조언
◆ 상대방 권장 행동: (구체적 1개)
◆ 본인 개선점: (구체적 1개) 
◆ 실천 조언: 
1) (간단한 조언 1)
2) (간단한 조언 2)

마지막에 감정점수 JSON 필수:
[EMOTION_SCORES]
{"emotionScores":[{"day":"월요일","happiness":7.5,"anxiety":3.2,"sadness":2.1,"anger":1.5,"love":8.0,"overall":7.2},...]}
[/EMOTION_SCORES]

주의: 마크다운(*,#,_) 사용금지, 간결하게 작성
`;

// 함수: 사용자 프롬프트(실제 다이어리 텍스트)를 받아 GPT의 응답을 반환
export async function generateOpenAIReport(userDiaryText: string): Promise<string> {
  try {
    console.log("OpenAI API 호출 시작...");
    
    const response = await fetch(OPENAI_COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          // 시스템 메시지: 프롬프트 지시사항
          {
            role: "system",
            content: systemPrompt,
          },
          // 유저 메시지: 간단하게 요청
          {
            role: "user",
            content: `일주일 일기 분석해주세요:\n\n${userDiaryText}`,
          },
        ],
        max_tokens: 1000, // 2000 → 1000으로 축소 (출력 토큰도 절약)
        temperature: 0.7,
        top_p: 1.0,
        frequency_penalty: 0.3, // 중복 표현 줄이기
        presence_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API 오류 상세:", errorData);
      throw new Error(`OpenAI API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let aiText = data.choices?.[0]?.message?.content || "응답을 가져올 수 없습니다.";
    
    console.log("OpenAI 원본 응답:", aiText);
    
    // 마크다운 제거 함수를 적용
    aiText = removeMarkdown(aiText);
    
    console.log("OpenAI API 호출 완료");
    return aiText;
    
  } catch (error) {
    console.error("generateOpenAIReport 오류:", error);
    
    // 개발용 모크 응답 (API 오류시 테스트용)
    if (__DEV__) {
      console.log("개발 모드: 모크 데이터 반환");
      return `
1. 일기 요약

이번 주는 전반적으로 안정적인 감정 상태를 보여주셨습니다. 일상의 작은 기쁨들을 찾으려는 노력이 보이며, 관계에 대한 고민도 함께 나타났습니다.


2. 심층 감정 분석

◆ 주요 감정 키워드: 행복, 안정감, 약간의 불안, 사랑, 만족

◆ 감정의 변화 과정:
주초에는 약간의 불안감이 있었지만, 중반부터 점차 안정되는 모습을 보였습니다. 주말로 갈수록 행복감과 만족감이 증가했습니다.

◆ 현재 심리 상태 평가:
전반적으로 건강한 심리 상태를 유지하고 계십니다. 자신의 감정을 잘 인식하고 표현하는 능력이 있어 보입니다.

◆ 심리적 원인 분석:
일상의 작은 성취들과 소중한 사람과의 교감이 긍정적인 감정의 주요 원인으로 보입니다.


3. 관계 조언 및 전문적 근거

◆ 현재 관계 상태 진단:
서로에 대한 애정과 관심이 충분히 표현되고 있는 건강한 관계 상태입니다.

◆ 상대방에게 추천하는 행동:
→ 구체적 행동: 더 적극적인 감정 표현과 공감적 듣기
→ 전문적 근거: 고트만 박사의 연구에 따르면 긍정적 상호작용이 관계 만족도를 높입니다.

◆ 사용자가 개선하면 좋은 점:
→ 구체적 행동: 감정을 더 구체적으로 표현하기
→ 전문적 근거: 명확한 감정 표현은 관계의 투명성과 친밀감을 증진시킵니다.

◆ 실천 가능한 조언:

1) 첫 번째 조언: 매일 감사한 일 3가지 나누기
   • 전문적 근거: 긍정심리학 연구에서 감사 표현이 관계 만족도를 높인다고 입증되었습니다.

2) 두 번째 조언: 주 1회 이상 깊은 대화 시간 갖기
   • 전문적 근거: 정기적인 깊은 대화는 정서적 친밀감을 강화시킵니다.

3) 세 번째 조언: 서로의 스트레스 상황에 적극적으로 공감하기
   • 전문적 근거: 공감적 반응은 스트레스를 줄이고 관계 결속력을 높입니다.

[EMOTION_SCORES]
{
  "emotionScores": [
    {
      "day": "월요일",
      "happiness": 7.2,
      "anxiety": 3.8,
      "sadness": 2.5,
      "anger": 1.2,
      "love": 8.0,
      "overall": 7.0
    },
    {
      "day": "화요일",
      "happiness": 6.8,
      "anxiety": 4.2,
      "sadness": 3.1,
      "anger": 2.0,
      "love": 7.5,
      "overall": 6.5
    },
    {
      "day": "수요일",
      "happiness": 8.0,
      "anxiety": 2.5,
      "sadness": 1.8,
      "anger": 1.0,
      "love": 8.5,
      "overall": 7.8
    },
    {
      "day": "목요일",
      "happiness": 7.5,
      "anxiety": 3.0,
      "sadness": 2.2,
      "anger": 1.5,
      "love": 8.2,
      "overall": 7.3
    },
    {
      "day": "금요일",
      "happiness": 8.5,
      "anxiety": 2.0,
      "sadness": 1.5,
      "anger": 0.8,
      "love": 9.0,
      "overall": 8.2
    },
    {
      "day": "토요일",
      "happiness": 9.0,
      "anxiety": 1.5,
      "sadness": 1.0,
      "anger": 0.5,
      "love": 9.2,
      "overall": 8.8
    },
    {
      "day": "일요일",
      "happiness": 8.2,
      "anxiety": 2.2,
      "sadness": 1.8,
      "anger": 1.0,
      "love": 8.8,
      "overall": 8.0
    }
  ]
}
[/EMOTION_SCORES]
      `;
    }
    
    throw error;
  }
}