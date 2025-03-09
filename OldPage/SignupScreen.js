// import React, { useState } from "react";
// import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
// import { auth } from "../config/firebaseConfig"; // Firebase 인증 가져오기
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { useRouter } from "expo-router"; // expo-router에서 페이지 이동을 위한 useRouter 사용

// const SignupScreen = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const router = useRouter(); // 페이지 이동을 위한 router

//   const handleSignup = async () => {
//     try {
//       await createUserWithEmailAndPassword(auth, email, password);
//       Alert.alert("회원가입 성공!", "이제 로그인하세요.");
//       router.push("/(tabs)"); // 회원가입 후 메인 화면으로 이동
//     } catch (error) {
//       Alert.alert("회원가입 실패", error.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>회원가입</Text>
//       <TextInput
//         style={styles.input}
//         placeholder="이메일"
//         value={email}
//         onChangeText={setEmail}
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="비밀번호"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//       />
//       <Button title="가입하기" onPress={handleSignup} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 20,
//   },
//   input: {
//     width: "100%",
//     padding: 10,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     marginBottom: 10,
//     borderRadius: 5,
//   },
// });

// export default SignupScreen;

