// app/models/spouse-request.ts

// 배우자 요청 관련 타입 정의
export interface SpouseRequest {
  id?: string;
  requesterId: string;  // 요청한 사용자 ID
  recipientId: string;  // 수신자 ID
  requesterEmail: string; // 요청자 이메일 (표시용)
  recipientEmail: string; // 수신자 이메일 (표시용)
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

// 배우자 상태 enum
export enum SpouseStatus {
  NONE = 'none',           // 배우자 등록 없음
  UNREGISTERED = 'unregistered', // 등록되지 않은 유저에게 요청됨
  REQUESTED = 'requested',  // 요청 상태
  PENDING = 'pending',      // 받은 요청 대기 중
  ACCEPTED = 'accepted',    // 수락됨
  REJECTED = 'rejected'     // 거절됨
}