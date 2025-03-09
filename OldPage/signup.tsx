// // app/signup.tsx
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
// } from "react-native";
// import {
//   createUserWithEmailAndPassword,
//   signInWithCredential,
//   GoogleAuthProvider,
// } from "firebase/auth";
// import { auth, db, GOOGLE_CLIENT_ID } from "../config/firebaseConfig";
// import { doc, setDoc } from "firebase/firestore";
// import { useRouter } from "expo-router";
// import { DefaultText } from "app/components/DefaultText";
// import * as WebBrowser from "expo-web-browser";
// import * as Google from "expo-auth-session/providers/google";
// import { makeRedirectUri } from "expo-auth-session";

// // **SVG 아이콘 임포트**
// import GoogleIcon from "../assets/images/googleIcon.svg";

// // WebBrowser 세션 완료 설정
// WebBrowser.maybeCompleteAuthSession();

// const SignupScreen = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const router = useRouter();

//   // Google 인증 훅
//   const [request, response, promptAsync] = Google.useAuthRequest({
//     clientId: GOOGLE_CLIENT_ID,
//     androidClientId: GOOGLE_CLIENT_ID,
//     iosClientId: GOOGLE_CLIENT_ID,
//     redirectUri: makeRedirectUri(),
//   });

//   useEffect(() => {
//     if (response?.type === "success") {
//       const { id_token } = response.params;
//       const credential = GoogleAuthProvider.credential(id_token);
//       // Google Credential로 회원가입(로그인) 처리
//       signInWithCredential(auth, credential)
//         .then((userCredential) => {
//           const user = userCredential.user;
//           // Firestore에 사용자 정보 저장 (이미 존재하면 merge)
//           setDoc(doc(db, "users", user.uid), { email: user.email }, { merge: true });
//           Alert.alert("구글 가입 성공!", "환영합니다!");
//           router.push("/calendar");
//         })
//         .catch((error) => {
//           console.error("구글 가입 오류:", error);
//           Alert.alert("오류", "구글 가입에 실패했습니다.");
//         });
//     }
//   }, [response]);

//   // 이메일/비밀번호 회원가입 처리
//   const handleSignup = async () => {
//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;
//       await setDoc(doc(db, "users", user.uid), {
//         email: user.email,
//       });
//       Alert.alert("회원가입 성공!", "이제 로그인하세요.");
//       router.push("/login");
//     } catch (error: any) {
//       Alert.alert("회원가입 실패", error.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <DefaultText style={styles.title}>회원가입</DefaultText>

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

//       {/* 이메일/비번 가입 버튼 */}
//       <TouchableOpacity style={styles.button} onPress={handleSignup}>
//         <DefaultText style={styles.buttonText}>가입하기</DefaultText>
//       </TouchableOpacity>

//       {/* 구글로 가입하기 버튼 */}
//       <TouchableOpacity style={styles.button} onPress={() => promptAsync()}>
//         <View style={styles.row}>
//           {/* SVG 아이콘 */}
//           <GoogleIcon width={20} height={20} style={styles.icon} />
//           <DefaultText style={styles.buttonText}>구글로 가입하기</DefaultText>
//         </View>
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default SignupScreen;

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
//     backgroundColor: "#FFF", // 흰색 배경
//     marginBottom: 15,
//     alignItems: "center",
//   },
//   row: {
//     flexDirection: "row",
//     alignItems: "center", // 수직 중앙
//     justifyContent: "center", // 수평 중앙
//   },
//   icon: {
//     marginRight: 8, // 아이콘과 텍스트 사이 간격
//   },
//   buttonText: {
//     color: "#000", // 검정 텍스트
//     fontSize: 18,
//   },
// });
