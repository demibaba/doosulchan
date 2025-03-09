// // app/login.tsx
// import React, { useState, useEffect } from "react";
// import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
// import { auth, db, GOOGLE_CLIENT_ID } from "../config/firebaseConfig"; 
// import * as WebBrowser from "expo-web-browser";
// import * as Google from "expo-auth-session/providers/google";
// import { useRouter } from "expo-router";
// import { makeRedirectUri } from "expo-auth-session";
// import { doc, getDoc } from "firebase/firestore";
// import { DefaultText } from "app/components/DefaultText";

// // **SVG 아이콘 임포트**
// import GoogleIcon from "../assets/images/googleIcon.svg";

// // WebBrowser 세션 설정 (필수)
// WebBrowser.maybeCompleteAuthSession();

// export default function LoginScreen() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
  
//   // Google 로그인 요청 생성
//   const [request, response, promptAsync] = Google.useAuthRequest({
//     clientId: GOOGLE_CLIENT_ID,
//     androidClientId: GOOGLE_CLIENT_ID,
//     iosClientId: GOOGLE_CLIENT_ID,
//     redirectUri: makeRedirectUri(),
//   });

//   useEffect(() => {
//     const handleGoogleLoginResponse = async () => {
//       if (response?.type === "success") {
//         const { id_token } = response.params;
//         const credential = GoogleAuthProvider.credential(id_token);

//         try {
//           const userCredential = await signInWithCredential(auth, credential);
//           const user = userCredential.user;
//           Alert.alert("구글 로그인 성공!", `환영합니다, ${user.displayName}!`);

//           // 로그인 후 부부 등록 여부 확인 후 이동
//           checkSpouseRegistration(user.uid);
//         } catch (error) {
//           console.error("구글 로그인 오류:", error);
//           Alert.alert("로그인 실패", "다시 시도해 주세요.");
//         }
//       }
//     };

//     if (response) {
//       handleGoogleLoginResponse();
//     }
//   }, [response]);

//   // 이메일/비밀번호 로그인 처리
//   const handleLogin = async () => {
//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       Alert.alert("로그인 성공!", "환영합니다.");
//       checkSpouseRegistration(userCredential.user.uid);
//     } catch (error) {
//       console.error("로그인 오류:", error);
//       Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인하세요.");
//     }
//   };

//   // 부부등록 여부 확인 함수
//   const checkSpouseRegistration = async (uid: string) => {
//     try {
//       const userDocRef = doc(db, "users", uid);
//       const userDocSnap = await getDoc(userDocRef);

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         if (userData?.spouseId) {
//           router.push("/calendar");
//         } else {
//           router.push("/spouse-registration");
//         }
//       } else {
//         router.push("/spouse-registration");
//       }
//     } catch (error) {
//       console.error("부부등록 여부 확인 오류:", error);
//       Alert.alert("오류", "부부등록 상태를 확인할 수 없습니다.");
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <DefaultText style={styles.title}>로그인</DefaultText>

//       <TextInput
//         style={styles.input}
//         placeholder="이메일"
//         placeholderTextColor="#aaa"
//         value={email}
//         onChangeText={setEmail}
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="비밀번호"
//         placeholderTextColor="#aaa"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//       />

//       {/* 이메일/비번 로그인 버튼 */}
//       <TouchableOpacity style={styles.button} onPress={handleLogin}>
//         <DefaultText style={styles.buttonText}>로그인</DefaultText>
//       </TouchableOpacity>

//       {/* 구글 로그인 버튼 */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => promptAsync()}
//         disabled={!request}
//       >
//         <View style={styles.row}>
//           <GoogleIcon width={20} height={20} style={styles.icon} />
//           <DefaultText style={styles.buttonText}>구글 로그인</DefaultText>
//         </View>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#FFF", // 흰색 배경
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 20,
//     color: "#000", // 검정 텍스트
//   },
//   input: {
//     width: "100%",
//     padding: 10,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     marginBottom: 10,
//     borderRadius: 5,
//     color: "#000", // 입력 텍스트 검정색
//     backgroundColor: "#FFF",
//   },
//   button: {
//     width: "100%",
//     paddingVertical: 12,
//     borderWidth: 1,
//     borderColor: "#000", // 검정 테두리
//     borderRadius: 10,
//     alignItems: "center",
//     backgroundColor: "#FFF", // 흰색 배경
//     marginBottom: 15,
//   },
//   row: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   icon: {
//     marginRight: 8, // 아이콘과 텍스트 사이 간격
//   },
//   buttonText: {
//     color: "#000", // 검정 텍스트
//     fontSize: 18,
//   },
// });
