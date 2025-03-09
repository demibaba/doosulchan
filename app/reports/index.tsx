// app/reports/index.tsx (ReportsListScreen.tsx)
import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import DefaultText from "app/components/DefaultText";
import { Feather } from "@expo/vector-icons";
import SpouseStatusBar from '../components/SpouseStatusBar';

// 레포트 타입 정의
interface Report {
  id: string;
  reportText: string;
  createdAt: string;
  ownerId: string;
  spouseId?: string;
  emotionScore?: number;
  isOwn: boolean;
}

export default function ReportsListScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  // 현재 선택된 탭 (0: 내 레포트, 1: 배우자 레포트)
  const [activeTab, setActiveTab] = useState(0);
  // 정렬 방식 (true: 최신순, false: 오래된순)
  const [sortNewest, setSortNewest] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.log("로그인이 필요합니다.");
        setLoading(false);
        return;
      }
      const userId = user.uid;
      console.log("현재 사용자 ID:", userId);
      
      // 먼저 부부등록 상태 확인
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log("사용자 프로필이 존재하지 않습니다.");
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      console.log("사용자 데이터:", userData);
      
      // spouseStatus가 "accepted"인지 확인
      if (userData.spouseStatus !== "accepted") {
        console.log("부부등록이 완료되지 않았습니다:", userData.spouseStatus);
        setReports([]);
        setLoading(false);
        return;
      }
      
      // 배우자 ID 가져오기
      const spouseId = userData.spouseId;
      console.log("배우자 ID:", spouseId);
      
      if (!spouseId) {
        console.log("배우자 ID가 없습니다.");
        setReports([]);
        setLoading(false);
        return;
      }
      
      // 권한 테스트를 건너뛰고 바로 쿼리 실행
      console.log("내 리포트 쿼리 시작...");
      const reportsRef = collection(db, "reports");
      
      // 자신이 소유한 리포트
      const q1 = query(
        reportsRef, 
        where("ownerId", "==", userId)
      );
      
      const snap1 = await getDocs(q1);
      console.log("내 리포트 쿼리 결과:", snap1.size);
      const fetched1 = snap1.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isOwn: true,
      })) as Report[];
      
      // 배우자의 리포트 (배우자가 소유한 리포트)
      console.log("배우자 리포트 쿼리 시작...");
      const q2 = query(
        reportsRef, 
        where("ownerId", "==", spouseId)
      );
      
      const snap2 = await getDocs(q2);
      console.log("배우자 리포트 쿼리 결과:", snap2.size);
      const fetched2 = snap2.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isOwn: false,
      })) as Report[];
      
      const merged = [...fetched1, ...fetched2];
      console.log("병합된 전체 레포트 수:", merged.length);
      
      if (merged.length === 0) {
        console.log("불러온 레포트가 없습니다. 빈 배열을 설정합니다.");
      }
      
      setReports(merged);
    } catch (error) {
      console.error("레포트 불러오기 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 레포트 정렬 함수
  const sortReports = (reportsToSort: Report[]) => {
    return [...reportsToSort].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortNewest ? dateB - dateA : dateA - dateB;
    });
  };

  // 필터링된 레포트 가져오기
  const getFilteredReports = () => {
    const filtered = reports.filter(
      (report) => (activeTab === 0 && report.isOwn) || (activeTab === 1 && !report.isOwn)
    );
    return sortReports(filtered);
  };

  // 정렬 방식 전환
  const toggleSortOrder = () => {
    setSortNewest(!sortNewest);
  };

  // 레포트 상세 페이지로 이동
  const navigateToReportDetail = (reportId: string) => {
    // 수정된 라우팅 방식 - 올바른 경로 형식 사용
    router.push(`/reports/${reportId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <DefaultText style={styles.loadingText}>레포트를 불러오는 중...</DefaultText>
      </View>
    );
  }

  const filteredReports = getFilteredReports();

  return (
    <View style={styles.container}>
      {/* 상단에 SpouseStatusBar 추가 */}
      <SpouseStatusBar />
      
      <View style={styles.headerContainer}>
        <DefaultText style={styles.title}>레포트 목록</DefaultText>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={toggleSortOrder}
        >
          <Feather 
            name={sortNewest ? "arrow-down" : "arrow-up"} 
            size={18} 
            color="#000" 
          />
          <DefaultText style={styles.sortButtonText}>
            {sortNewest ? "최신순" : "오래된순"}
          </DefaultText>
        </TouchableOpacity>
      </View>
      
      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 0 && styles.activeTabButton
          ]}
          onPress={() => setActiveTab(0)}
        >
          <DefaultText
            style={[
              styles.tabButtonText,
              activeTab === 0 && styles.activeTabButtonText
            ]}
          >
            내 레포트
          </DefaultText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 1 && styles.activeTabButton
          ]}
          onPress={() => setActiveTab(1)}
        >
          <DefaultText
            style={[
              styles.tabButtonText,
              activeTab === 1 && styles.activeTabButtonText
            ]}
          >
            배우자 레포트
          </DefaultText>
        </TouchableOpacity>
      </View>
      
      {filteredReports.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Feather name="file-text" size={48} color="#CCC" />
          <DefaultText style={styles.noData}>
            {activeTab === 0 
              ? " 레포트가 없습니다."
              : "배우자의 레포트가 없습니다."}
          </DefaultText>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {filteredReports.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.item,
                { borderColor: item.isOwn ? "#3498db" : "#e74c3c" }
              ]}
              onPress={() => navigateToReportDetail(item.id)}
            >
              <View style={styles.itemHeader}>
                <DefaultText style={styles.itemTitle}>
                  {formatDate(item.createdAt)}
                </DefaultText>
                <View style={[
                  styles.badge,
                  { backgroundColor: item.isOwn ? "#3498db" : "#e74c3c" }
                ]}>
                  <DefaultText style={styles.badgeText}>
                    {item.isOwn ? "내 레포트" : "배우자"}
                  </DefaultText>
                </View>
              </View>
              
              {item.emotionScore !== undefined && (
                <View style={styles.emotionContainer}>
                  <DefaultText style={styles.emotionLabel}>감정 점수:</DefaultText>
                  <DefaultText style={[
                    styles.emotionScore,
                    getEmotionScoreStyle(item.emotionScore)
                  ]}>
                    {item.emotionScore}
                  </DefaultText>
                </View>
              )}
              
              <DefaultText numberOfLines={2} style={styles.itemText}>
                {item.reportText}
              </DefaultText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// 날짜 형식 변환 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
const formatDate = (dateString: string): string => {
  if (!dateString) return "날짜 없음";
  
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}년 ${month}월 ${day}일`;
  } catch (error) {
    return dateString;
  }
};

// 감정 점수에 따른 스타일 결정
const getEmotionScoreStyle = (score: number) => {
  if (score >= 7) return styles.emotionHigh;
  if (score >= 4) return styles.emotionMedium;
  return styles.emotionLow;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFF",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8, // SpouseStatusBar 때문에 약간의 상단 마진 추가
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  sortButtonText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#000",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  activeTabButton: {
    backgroundColor: "#333",
  },
  tabButtonText: {
    fontWeight: "bold",
    color: "#666",
  },
  activeTabButtonText: {
    color: "#FFF",
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noData: {
    textAlign: "center",
    color: "#999",
    marginTop: 12,
    fontSize: 16,
  },
  item: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  emotionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  emotionLabel: {
    color: "#666",
    fontSize: 14,
    marginRight: 6,
  },
  emotionScore: {
    fontWeight: "bold",
    fontSize: 14,
  },
  emotionHigh: {
    color: "#27ae60",
  },
  emotionMedium: {
    color: "#f39c12",
  },
  emotionLow: {
    color: "#e74c3c",
  },
  itemText: {
    color: "#333",
    fontSize: 14,
    lineHeight: 20,
  },
});