// utils/psychologyTest.ts - 심리테스트 로직

// 4가지 성향 타입 정의
export enum PersonalityType {
    ROMANTIC_DREAMER = 'romantic_dreamer',     // 로맨틱 드리머
    DEEP_COMMUNICATOR = 'deep_communicator',   // 깊이있는 소통가
    WARM_DAILY = 'warm_daily',                 // 따뜻한 일상러
    ENERGY_PUMPER = 'energy_pumper'            // 에너지 뿜뿜이
  }
  
  // 질문 인터페이스
  export interface Question {
    id: string;
    question: string;
    options: {
      A: string;
      B: string;
      C: string;
      D: string;
    };
  }
  
  // 답변 인터페이스
  export interface TestAnswers {
    [questionId: string]: 'A' | 'B' | 'C' | 'D';
  }
  
  // 성향 결과 인터페이스
  export interface PersonalityResult {
    type: PersonalityType;
    title: string;
    emoji: string;
    description: string;
    characteristics: string[];
    recommendations: string[];
    templates: string[];
  }
  
  // 7개 심리테스트 질문
  export const PSYCHOLOGY_QUESTIONS: Question[] = [
    {
      id: 'conflict_resolution',
      question: '갈등이 생겼을 때 당신은?',
      options: {
        A: '바로 대화로 해결하려고 한다',
        B: '차근차근 문제를 풀어간다', 
        C: '감정이 진정된 후에 대화한다',
        D: '함께 활동하며 자연스럽게 푼다'
      }
    },
    {
      id: 'love_expression',
      question: '사랑을 표현할 때 가장 중요하게 생각하는 것은?',
      options: {
        A: '진심 어린 말과 깊은 대화',
        B: '특별한 날의 의미있는 선물',
        C: '일상 속 작은 배려와 관심',
        D: '함께하는 즐거운 경험과 활동'
      }
    },
    {
      id: 'memory_style',
      question: '소중한 순간을 기록할 때 당신의 스타일은?',
      options: {
        A: '감정과 느낌을 자세히 적는다',
        B: '의미와 교훈을 중심으로 정리한다',
        C: '일상의 소소한 행복을 담는다',
        D: '재미있고 특별한 순간을 남긴다'
      }
    },
    {
      id: 'opinion_conflict',
      question: '의견이 다를 때 당신의 대처 방식은?',
      options: {
        A: '서로의 마음을 이해하려 노력한다',
        B: '논리적으로 대화하며 해결점을 찾는다',
        C: '서로를 존중하며 조화를 추구한다',
        D: '새로운 관점으로 문제를 바라본다'
      }
    },
    {
      id: 'relationship_value',
      question: '관계에서 가장 소중히 여기는 가치는?',
      options: {
        A: '깊은 유대감과 정서적 연결',
        B: '서로의 성장과 발전',
        C: '안정감과 편안함',
        D: '새로운 도전과 모험'
      }
    },
    {
      id: 'stress_handling',
      question: '힘든 일이 있을 때 상대방에게 바라는 것은?',
      options: {
        A: '따뜻한 위로와 공감',
        B: '실질적인 해결책 제시',
        C: '조용히 곁에 있어주기',
        D: '기분 전환할 재미있는 활동'
      }
    },
    {
      id: 'future_planning',
      question: '둘의 미래를 계획할 때 당신의 스타일은?',
      options: {
        A: '감정적 유대감을 바탕으로 꿈꾼다',
        B: '구체적인 목표와 단계를 설정한다',
        C: '현재에 충실하며 자연스럽게 발전시킨다',
        D: '새롭고 흥미진진한 모험을 상상한다'
      }
    }
  ];
  
  // 답변별 성향 매핑
  const ANSWER_MAPPING = {
    conflict_resolution: {
      A: PersonalityType.DEEP_COMMUNICATOR,
      B: PersonalityType.WARM_DAILY,
      C: PersonalityType.ROMANTIC_DREAMER,
      D: PersonalityType.ENERGY_PUMPER
    },
    love_expression: {
      A: PersonalityType.DEEP_COMMUNICATOR,
      B: PersonalityType.ROMANTIC_DREAMER,
      C: PersonalityType.WARM_DAILY,
      D: PersonalityType.ENERGY_PUMPER
    },
    memory_style: {
      A: PersonalityType.ROMANTIC_DREAMER,
      B: PersonalityType.DEEP_COMMUNICATOR,
      C: PersonalityType.WARM_DAILY,
      D: PersonalityType.ENERGY_PUMPER
    },
    opinion_conflict: {
      A: PersonalityType.ROMANTIC_DREAMER,
      B: PersonalityType.DEEP_COMMUNICATOR,
      C: PersonalityType.WARM_DAILY,
      D: PersonalityType.ENERGY_PUMPER
    },
    relationship_value: {
      A: PersonalityType.ROMANTIC_DREAMER,
      B: PersonalityType.DEEP_COMMUNICATOR,
      C: PersonalityType.WARM_DAILY,
      D: PersonalityType.ENERGY_PUMPER
    },
    stress_handling: {
      A: PersonalityType.ROMANTIC_DREAMER,
      B: PersonalityType.DEEP_COMMUNICATOR,
      C: PersonalityType.WARM_DAILY,
      D: PersonalityType.ENERGY_PUMPER
    },
    future_planning: {
      A: PersonalityType.ROMANTIC_DREAMER,
      B: PersonalityType.DEEP_COMMUNICATOR,
      C: PersonalityType.WARM_DAILY,
      D: PersonalityType.ENERGY_PUMPER
    }
  };
  
  // 성향별 상세 정보
  const PERSONALITY_DETAILS: { [key in PersonalityType]: PersonalityResult } = {
    [PersonalityType.ROMANTIC_DREAMER]: {
      type: PersonalityType.ROMANTIC_DREAMER,
      title: '로맨틱 드리머',
      emoji: '🌸',
      description: '감정과 감성을 중시하며, 로맨틱한 순간들을 소중히 여기는 당신은 사랑에 대한 깊은 이해와 따뜻한 마음을 가지고 있어요.',
      characteristics: [
        '감정 표현이 풍부하고 진실해요',
        '특별한 순간들을 오래 기억해요',
        '상대방의 마음을 잘 이해해요',
        '로맨틱한 분위기를 만드는 걸 좋아해요'
      ],
      recommendations: [
        '감정 일기로 마음을 표현해보세요',
        '특별한 날들을 세심하게 챙겨주세요',
        '편지나 메시지로 사랑을 전해보세요'
      ],
      templates: [
        '오늘 느낀 감정들',
        '우리의 특별한 순간',
        '사랑한다는 마음'
      ]
    },
    [PersonalityType.DEEP_COMMUNICATOR]: {
      type: PersonalityType.DEEP_COMMUNICATOR,
      title: '깊이있는 소통가',
      emoji: '💎',
      description: '진솔한 대화와 서로의 성장을 중시하는 당신은 관계를 더욱 깊고 의미있게 만들어가는 지혜로운 사람이에요.',
      characteristics: [
        '진심어린 대화를 나누는 걸 좋아해요',
        '문제 해결 능력이 뛰어나요',
        '서로의 성장을 격려해요',
        '관계에 대해 깊이 생각해요'
      ],
      recommendations: [
        '정기적인 진솔한 대화 시간을 가져보세요',
        '서로의 목표와 꿈을 공유해보세요',
        '함께 배우고 성장할 수 있는 활동을 해보세요'
      ],
      templates: [
        '오늘의 깊은 대화',
        '서로에게 배운 것들',
        '함께 성장하는 이야기'
      ]
    },
    [PersonalityType.WARM_DAILY]: {
      type: PersonalityType.WARM_DAILY,
      title: '따뜻한 일상러',
      emoji: '🏠',
      description: '일상 속 작은 행복과 안정감을 소중히 여기는 당신은 평범한 순간들을 특별하게 만드는 마법을 가지고 있어요.',
      characteristics: [
        '일상의 소소한 행복을 잘 찾아요',
        '안정감 있는 관계를 추구해요',
        '상대방을 세심하게 배려해요',
        '편안하고 따뜻한 분위기를 만들어요'
      ],
      recommendations: [
        '일상의 작은 순간들을 기록해보세요',
        '서로를 위한 작은 배려를 실천해보세요',
        '집에서 함께하는 시간을 소중히 여겨보세요'
      ],
      templates: [
        '오늘의 소소한 행복',
        '일상 속 감사한 일들',
        '우리만의 편안한 시간'
      ]
    },
    [PersonalityType.ENERGY_PUMPER]: {
      type: PersonalityType.ENERGY_PUMPER,
      title: '에너지 뿜뿜이',
      emoji: '⚡',
      description: '활력 넘치는 에너지로 관계에 재미와 활기를 불어넣는 당신은 언제나 새로운 모험과 경험을 추구하는 열정적인 사람이에요.',
      characteristics: [
        '새로운 경험을 추구해요',
        '활동적이고 에너지가 넘쳐요',
        '관계에 재미와 활력을 더해줘요',
        '도전적인 것들을 좋아해요'
      ],
      recommendations: [
        '함께 새로운 활동에 도전해보세요',
        '모험과 경험을 기록해보세요',
        '커플 버킷리스트를 만들어보세요'
      ],
      templates: [
        '오늘의 신나는 모험',
        '함께 도전한 새로운 것들',
        '다음에 해보고 싶은 활동들'
      ]
    }
  };
  
  // 답변을 분석해서 성향 결정하는 함수
  export function analyzePersonality(answers: TestAnswers): PersonalityResult {
    const scores: { [key in PersonalityType]: number } = {
      [PersonalityType.ROMANTIC_DREAMER]: 0,
      [PersonalityType.DEEP_COMMUNICATOR]: 0,
      [PersonalityType.WARM_DAILY]: 0,
      [PersonalityType.ENERGY_PUMPER]: 0
    };
  
    // 각 답변을 성향별로 카운트
    Object.entries(answers).forEach(([questionId, answer]) => {
      const mapping = ANSWER_MAPPING[questionId as keyof typeof ANSWER_MAPPING];
      if (mapping && mapping[answer]) {
        scores[mapping[answer]]++;
      }
    });
  
    // 가장 높은 점수의 성향 찾기
    const maxScore = Math.max(...Object.values(scores));
    const resultType = Object.entries(scores).find(([type, score]) => score === maxScore)?.[0] as PersonalityType;
  
    return PERSONALITY_DETAILS[resultType] || PERSONALITY_DETAILS[PersonalityType.ROMANTIC_DREAMER];
  }
  
  // 테스트 완료 여부 확인
  export function isTestComplete(answers: TestAnswers): boolean {
    return PSYCHOLOGY_QUESTIONS.every(question => answers[question.id]);
  }