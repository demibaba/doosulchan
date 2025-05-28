// app/reports/index.tsx - 개인용 레포트도 지원하는 버전
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
import DefaultText from "../components/DefaultText";
import { Feather } from "@expo/vector-icons";

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
  const [activeTab, setActiveTab] = useState(0);
  const [sortNewest, setSortNewest] = useState(true);
  const [hasSpouse, setHasSpouse] = useState(false); // 부부 등록 상태

  useEffect(() => {
    fetchReports();
  }, []);

  // 내 레포트만 가져오는 함수
  const getMyReportsOnly = async (userId: string) => {
    console.log("내 레포트만 불러오기 시작...");
    const reportsRef = collection(db, "reports");
    const q = query(reportsRef, where("ownerId", "==", userId));
    
    const snapshot = await getDocs(q);
    console.log("내 레포트 개수:", snapshot.size);
    
    const myReports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isOwn: true,
    })) as Report[];
    
    return myReports;
  };

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
        console.log("사용자 프로필이 존재하지 않습니다. 내 레포트만 표시합니다.");
        const myReports = await getMyReportsOnly(userId);
        setReports(myReports);
        setHasSpouse(false);
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      console.log("사용자 데이터:", userData);
      
      // 부부등록이 완료되지 않은 경우 - 내 레포트만 표시
      if (userData.spouseStatus !== "accepted") {
        console.log("부부등록 미완료 - 내 레포트만 표시. 상태:", userData.spouseStatus);
        const myReports = await getMyReportsOnly(userId);
        setReports(myReports);
        setHasSpouse(false);
        setLoading(false);
        return;
      }
      
      // 부부등록 완료 - 내 레포트 + 배우자 레포트
      setHasSpouse(true);
      
      const spouseId = userData.spouseId;
      console.log("배우자 ID:", spouseId);
      
      if (!spouseId) {
        console.log("배우자 ID가 없습니다. 내 레포트만 표시합니다.");
        const myReports = await getMyReportsOnly(userId);
        setReports(myReports);
        setHasSpouse(false);
        setLoading(false);
        return;
      }
      
      console.log("부부 레포트 모두 불러오기 시작...");
      const reportsRef = collection(db, "reports");
      
      // 자신이 소유한 리포트
      const q1 = query(reportsRef, where("ownerId", "==", userId));
      const snap1 = await getDocs(q1);
      console.log("내 리포트 쿼리 결과:", snap1.size);
      const fetched1 = snap1.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isOwn: true,
      })) as Report[];
      
      // 배우자의 리포트
      const q2 = query(reportsRef, where("ownerId", "==", spouseId));
      const snap2 = await getDocs(q2);
      console.log("배우자 리포트 쿼리 결과:", snap2.size);
      const fetched2 = snap2.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isOwn: false,
      })) as Report[];
      
      const merged = [...fetched1, ...fetched2];
      console.log("병합된 전체 레포트 수:", merged.length);
      
      setReports(merged);
    } catch (error) {
      console.error("레포트 불러오기 오류:", error);
      // 오류 발생시에도 내 레포트만이라도 보여주기
      try {
        const user = auth.currentUser;
        if (user) {
          const myReports = await getMyReportsOnly(user.uid);
          setReports(myReports);
          setHasSpouse(false);
        }
      } catch (fallbackError) {
        console.error("내 레포트 불러오기도 실패:", fallbackError);
      }
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
    router.push(`/reports/${reportId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B5896D" />
        <DefaultText style={styles.loadingText}>
          소중한 기록들을 불러오고 있어요...
        </DefaultText>
      </View>
    );
  }

  const filteredReports = getFilteredReports();

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.headerContainer}>
        <View style={styles.titleSection}>
          <DefaultText style={styles.title}>🌙 감정 레포트</DefaultText>
          <DefaultText style={styles.subtitle}>
            {hasSpouse ? "우리의 소중한 감정 기록들" : "나의 소중한 감정 기록들"}
          </DefaultText>
        </View>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={toggleSortOrder}
        >
          <Feather 
            name={sortNewest ? "arrow-down" : "arrow-up"} 
            size={16} 
            color="#8A817C" 
          />
          <DefaultText style={styles.sortButtonText}>
            {sortNewest ? "최신순" : "오래된순"}
          </DefaultText>
        </TouchableOpacity>
      </View>
      
      {/* 탭 네비게이션 - 부부 등록된 경우만 표시 */}
      {hasSpouse && (
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
              🤍 나의 기록
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
              💝 상대방의 기록
            </DefaultText>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 부부 등록 안 된 경우 안내 메시지 */}
      {!hasSpouse && (
        <View style={styles.singleModeNotice}>
          <DefaultText style={styles.singleModeText}>
            💡 부부 등록 후 상대방의 레포트도 함께 볼 수 있어요
          </DefaultText>
        </View>
      )}
      
      {filteredReports.length === 0 ? (
        <View style={styles.noDataContainer}>
          <DefaultText style={styles.noDataIcon}>📋</DefaultText>
          <DefaultText style={styles.noDataTitle}>
            {hasSpouse 
              ? (activeTab === 0 ? "첫 번째 레포트를 기다리고 있어요" : "상대방의 레포트를 기다리고 있어요")
              : "첫 번째 레포트를 기다리고 있어요"}
          </DefaultText>
          <DefaultText style={styles.noDataSubtitle}>
            {hasSpouse 
              ? (activeTab === 0 
                  ? "일주일간 다이어리를 작성하면\n감정 분석 레포트가 생성돼요" 
                  : "상대방이 레포트를 작성하면\n여기에서 볼 수 있어요")
              : "일주일간 다이어리를 작성하면\n감정 분석 레포트가 생성돼요"}
          </DefaultText>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {filteredReports.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.item,
                { borderColor: item.isOwn ? "#B5896D" : "#E7E1DB" }
              ]}
              onPress={() => navigateToReportDetail(item.id)}
            >
              <View style={styles.itemHeader}>
                <DefaultText style={styles.itemTitle}>
                  {formatDate(item.createdAt)}
                </DefaultText>
                <View style={[
                  styles.badge,
                  { backgroundColor: item.isOwn ? "#B5896D" : "#8A817C" }
                ]}>
                  <DefaultText style={styles.badgeText}>
                    {item.isOwn ? "내 레포트" : "상대방"}
                  </DefaultText>
                </View>
              </View>
              
              <DefaultText numberOfLines={2} style={styles.itemText}>
                {item.reportText.substring(0, 100)}...
              </DefaultText>
              
              <View style={styles.itemFooter}>
                <DefaultText style={styles.readMoreText}>
                  자세히 보기 →
                </DefaultText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// 날짜 형식 변환 함수
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF7",
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFBF7",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8A817C",
    textAlign: "center",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8A817C",
    lineHeight: 22,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F9F6F3",
    borderWidth: 1,
    borderColor: "#E7E1DB",
  },
  sortButtonText: {
    fontSize: 14,
    marginLeft: 6,
    color: "#8A817C",
    fontFamily: "GmarketSansTTFMedium",
  },
  singleModeNotice: {
    backgroundColor: "#F9F6F3",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E7E1DB",
  },
  singleModeText: {
    fontSize: 14,
    color: "#8A817C",
    textAlign: "center",
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F9F6F3",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 16,
    color: "#8A817C",
    fontFamily: "GmarketSansTTFMedium",
  },
  activeTabButtonText: {
    color: "#3B3029",
    fontFamily: "GmarketSansTTFBold",
  },
  scrollContainer: {
    flex: 1,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  noDataIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  noDataTitle: {
    fontSize: 20,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
    textAlign: "center",
    marginBottom: 12,
  },
  noDataSubtitle: {
    fontSize: 16,
    color: "#8A817C",
    textAlign: "center",
    lineHeight: 24,
  },
  item: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontFamily: "GmarketSansTTFBold",
    color: "#3B3029",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "GmarketSansTTFBold",
  },
  itemText: {
    fontSize: 15,
    color: "#3B3029",
    lineHeight: 22,
    marginBottom: 16,
  },
  itemFooter: {
    alignItems: "flex-end",
  },
  readMoreText: {
    fontSize: 14,
    color: "#B5896D",
    fontFamily: "GmarketSansTTFMedium",
  },
});