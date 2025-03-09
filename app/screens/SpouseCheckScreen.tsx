// app/screens/SpouseCheckScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { useRouter } from "expo-router";
import DefaultText from "app/components/DefaultText";

export default function SpouseCheckScreen() {
  const router = useRouter();
  const [pendingRequest, setPendingRequest] = useState<{
    requesterUid: string;
    requesterEmail: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkForRequest();
  }, []);

  const checkForRequest = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const currentUid = auth.currentUser.uid;
    const currentEmail = auth.currentUser.email; // 현재 사용자의 이메일
    try {
      const usersRef = collection(db, "users");

      // Query 1: spouseStatus == "requested" and spouseId equals currentUid
      const q1 = query(
        usersRef,
        where("spouseStatus", "==", "requested"),
        where("spouseId", "==", currentUid)
      );
      const snap1 = await getDocs(q1);

      // Query 2: spouseStatus == "unregistered" and spouseEmail equals currentEmail
      const q2 = query(
        usersRef,
        where("spouseStatus", "==", "unregistered"),
        where("spouseEmail", "==", currentEmail)
      );
      const snap2 = await getDocs(q2);

      const combinedDocs = [...snap1.docs, ...snap2.docs];
      if (combinedDocs.length > 0) {
        const requesterDoc = combinedDocs[0];
        const requesterUid = requesterDoc.id;
        const requesterData = requesterDoc.data();
        setPendingRequest({ requesterUid, requesterEmail: requesterData.email });
      } else {
        setPendingRequest(null);
      }
    } catch (error) {
      console.error("부부 요청 확인 오류:", error);
      Alert.alert("오류", "부부 등록 요청 확인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!auth.currentUser || !pendingRequest) return;
    const currentUid = auth.currentUser.uid;
    try {
      await setDoc(
        doc(db, "users", currentUid),
        {
          spouseId: pendingRequest.requesterUid,
          spouseStatus: "confirmed",
        },
        { merge: true }
      );
      Alert.alert("승인 완료", "부부 등록이 최종 완료되었습니다!");
      router.push("/calendar");
    } catch (error) {
      console.error("승인 오류:", error);
      Alert.alert("오류", "승인 처리에 실패했습니다.");
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} />;
  }

  return (
    <View style={styles.container}>
      {pendingRequest ? (
        <>
          <DefaultText style={styles.message}>
            {pendingRequest.requesterEmail}님이 부부 등록 요청을 보냈습니다.
          </DefaultText>
          <TouchableOpacity style={styles.button} onPress={handleApprove}>
            <DefaultText style={styles.buttonText}>승인하기</DefaultText>
          </TouchableOpacity>
        </>
      ) : (
        <DefaultText style={styles.message}>
          현재 부부 등록 요청이 없습니다.
        </DefaultText>
      )}
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <DefaultText style={styles.buttonText}>돌아가기</DefaultText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#FFF",
  },
  message: { 
    fontSize: 16, 
    marginBottom: 20, 
    textAlign: "center",
    color: "#000",
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#000", // 검정 테두리
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFF", // 흰색 배경
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 18,
    color: "#000",
  },
});
