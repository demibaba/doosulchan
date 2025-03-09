// app/reports/[reportId].tsx (ReportDetailScreen)
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import DefaultText from "app/components/DefaultText";
import Markdown from "react-native-markdown-display";

type ReportParams = {
  reportId?: string;
};

interface SpouseInfo {
  id: string;
  userId: string;
}

export default function ReportDetailScreen() {
  const router = useRouter();
  const { reportId } = useLocalSearchParams<ReportParams>();

  const [reportText, setReportText] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spouseId, setSpouseId] = useState<string | null>(null);
  const [loadingSpouse, setLoadingSpouse] = useState(false);

  useEffect(() => {
    if (!reportId) {
      Alert.alert("오류", "레포트 ID가 없습니다.");
      setLoading(false);
      return;
    }
    
    fetchReport(reportId.toString());
  }, [reportId]);

  const fetchReport = async (id: string) => {
    try {
      console.log("레포트 ID:", id);
      const docRef = doc(db, "reports", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("레포트 데이터:", data);
        setReportData(data);
        setReportText(data.reportText || "레포트 내용이 없습니다.");
        setSpouseId(data.spouseId || null);
      } else {
        console.log("레포트 문서 없음");
        Alert.alert("오류", "해당 레포트를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("레포트 로드 오류:", error);
      Alert.alert("오류", "레포트 로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 배우자 정보 가져오기
  const fetchSpouseInfo = async (): Promise<string | null> => {
    setLoadingSpouse(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return null;
      }

      // 배우자 정보 조회 (spouse 컬렉션에서 사용자의 ID를 기준으로 검색)
      const spouseRef = collection(db, "spouse");
      const q = query(spouseRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const spouseData = querySnapshot.docs[0].data() as SpouseInfo;
        console.log("배우자 정보:", spouseData);
        return spouseData.id; // 배우자의 UID 반환
      } else {
        console.log("배우자 정보 없음");
        return null;
      }
    } catch (error) {
      console.error("배우자 정보 조회 오류:", error);
      return null;
    } finally {
      setLoadingSpouse(false);
    }
  };

  const handleSendToSpouse = async () => {
    if (!reportId) return;
    
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }

      // 배우자 ID 가져오기
      const spouseUid = await fetchSpouseInfo();
      if (!spouseUid) {
        Alert.alert("오류", "배우자 정보가 없습니다. 부부등록을 먼저 해주세요.");
        return;
      }

      // 레포트 업데이트
      const reportRef = doc(db, "reports", reportId.toString());
      await updateDoc(reportRef, { spouseId: spouseUid });
      setSpouseId(spouseUid);
      Alert.alert("성공", "레포트가 상대방에게 전송되었습니다.");
    } catch (error) {
      console.error("레포트 전송 오류:", error);
      Alert.alert("오류", "레포트 전송에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <DefaultText style={styles.loadingText}>레포트를 불러오는 중...</DefaultText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DefaultText style={styles.title}>AI 레포트</DefaultText>
      
      {reportData && reportData.createdAt && (
        <DefaultText style={styles.dateText}>
          {formatDate(reportData.createdAt)}
        </DefaultText>
      )}
      
      {/* 레포트 텍스트를 마크다운으로 렌더링 */}
      <ScrollView style={styles.scrollContainer}>
        <Markdown style={markdownStyles}>
          {reportText}
        </Markdown>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.back()}
        >
          <DefaultText style={styles.buttonText}>돌아가기</DefaultText>
        </TouchableOpacity>

        {spouseId ? (
          <View style={styles.sharedContainer}>
            <DefaultText style={styles.sharedText}>
              상대방에게 전송됨 ✓
            </DefaultText>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.sendButton]} 
            onPress={handleSendToSpouse}
            disabled={loadingSpouse}
          >
            {loadingSpouse ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <DefaultText style={styles.sendButtonText}>
                상대방에게 전송하기
              </DefaultText>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// 날짜 형식 변환 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  
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

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#000",
    fontFamily: "GmarketSansTTFLight", // 기본 폰트
  },
  strong: {
    fontFamily: "GmarketSansTTFBold", // 굵은 텍스트 효과를 위해 Bold 폰트 사용
  },
  heading1: {
    fontSize: 24,
    lineHeight: 32,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "GmarketSansTTFBold",
  },
  heading2: {
    fontSize: 20,
    lineHeight: 28,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "GmarketSansTTFBold",
  },
  heading3: {
    fontSize: 18,
    lineHeight: 26,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "GmarketSansTTFMedium",
  },
  list_item: {
    marginBottom: 8,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFF",
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#000",
  },
  dateText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
    color: "#666",
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 10,
  },
  sharedContainer: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    marginBottom: 15,
  },
  sharedText: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "bold",
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFF",
    marginBottom: 15,
  },
  sendButton: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  buttonText: {
    fontSize: 16,
    color: "#000",
  },
  sendButtonText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "bold",
  },
});