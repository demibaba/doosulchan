// utils/openaiApi.ts
import { OPENAI_API_KEY } from "../config/openaiConfig";

// GPT-3.5 Turbo 엔드포인트
const OPENAI_COMPLETION_URL = "https://api.openai.com/v1/chat/completions";

// 시스템 프롬프트: 감정 분석, 일기 요약, 관계 조언에 관한 지시사항
const systemPrompt = `
당신은 감정 분석과 관계 조언 전문가입니다. 사용자가 일주일 동안 작성한 다이어리를 제공합니다.

**목표:**  
1. **일기 요약** – 사용자의 감정을 중심으로 일주일 동안의 내용을 간결하고 핵심적으로 요약하세요.  
2. **감정 분석** – 일기에서 감지되는 감정(예: 기쁨, 슬픔, 분노, 불안, 사랑, 외로움 등)을 분석하고 전반적인 감정 경향을 평가하세요.  
3. **관계 조언** – 분석된 감정을 바탕으로 사용자가 본인 또는 상대방과의 관계에서 필요한 조언을 제안하세요.

**출력 형식:**  

📌 **1. 일기 요약**  
(사용자의 일주일치 일기를 감정을 중심으로 요약)  

📌 **2. 감정 분석**  
- 주요 감정: (감정 키워드 3~5개)  
- 감정의 변화: (일주일 동안 감정이 어떻게 변화했는지 설명)  
- 현재 심리 상태: (심리적으로 어떤 상태인지 설명)  
- 원인 분석: (감정이 이렇게 형성된 이유를 분석)  

📌 **3. 관계 조언**  
- **현재 관계 평가:** (본인과 상대방의 관계에서 보이는 주요 특징 분석)  
- **상대방이 해주면 좋은 것:** (상대방이 사용자에게 하면 좋은 행동 추천)  
- **사용자가 개선할 점:** (사용자가 스스로 할 수 있는 변화 및 노력)  
- **실천 가능한 조언:** (구체적이고 실질적인 행동 가이드)
`;

// 함수: 사용자 프롬프트(실제 다이어리 텍스트)를 받아 GPT-3.5의 응답을 반환
export async function generateOpenAIReport(userDiaryText: string): Promise<string> {
  try {
    const response = await fetch(OPENAI_COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          // 시스템 메시지: 프롬프트 지시사항 (한국어)
          {
            role: "system",
            content: systemPrompt,
          },
          // 유저 메시지: 실제 일기 텍스트 제공
          {
            role: "user",
            content: `사용자의 일주일치 일기:\n\n${userDiaryText}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
        top_p: 1.0,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "응답을 가져올 수 없습니다.";
    return aiText;
  } catch (error) {
    console.error("generateOpenAIReport 오류:", error);
    throw error;
  }
}
