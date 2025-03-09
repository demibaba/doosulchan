// app/AuthScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth, db, GOOGLE_CLIENT_ID } from "../config/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import DefaultText from "app/components/DefaultText";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

// SVG 아이콘 임포트 (경로 수정 필요)
import GoogleIcon from "../assets/images/googleIcon.svg";
import EmailIcon from "../assets/images/emailIcon.svg";
import PasswordIcon from "../assets/images/passwordIcon.svg";

// WebBrowser 세션 완료 설정
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 구글 인증 훅
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri(),
  });

  // 구글 로그인 응답 처리
  useEffect(() => {
    if (response?.type === "success") {
      setLoading(true);
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      signInWithCredential(auth, credential)
  .then(async (userCredential) => {
    const user = userCredential.user;
    await setDoc(
      doc(db, "users", user.uid), 
      { 
        email: user.email,
        displayName: user.displayName,
        createdAt: new Date().toISOString(),
        spouseStatus: 'none', // 초기 배우자 상태
      }, 
      { merge: true }
    );

    // 사용자 문서 가져오기
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    // 부부 상태 확인
    if (!userData || userData.spouseStatus === 'none') {
      // 부부 등록이 안 된 경우 부부 등록 페이지로 이동
      router.push("/spouse-registration");
    } else {
      // 부부 등록이 된 경우 캘린더 페이지로 이동
      router.push("/calendar");
    }

    Alert.alert("구글 로그인 성공!", `환영합니다, ${user.displayName || user.email}!`);
  })
  .catch((error) => {
    console.error("구글 로그인 오류:", error);
    setError("구글 로그인에 실패했습니다.");
  })
  .finally(() => {
    setLoading(false);
  });
}
}, [response]);

  // 이메일 유효성 검사 함수
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 이메일/비밀번호 로그인 처리
const handleLogin = async () => {
  // 입력값 검증
  if (!email || !password) {
    setError("이메일과 비밀번호를 모두 입력해주세요.");
    return;
  }

  if (!isValidEmail(email)) {
    setError("유효한 이메일 주소를 입력해주세요.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 사용자 문서 가져오기
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    // 부부 상태 확인
    if (!userData || userData.spouseStatus === 'none') {
      // 부부 등록이 안 된 경우 부부 등록 페이지로 이동
      router.push("/spouse-registration");
    } else {
      // 부부 등록이 된 경우 캘린더 페이지로 이동
      router.push("/calendar");
    }
  } catch (error: any) {
    console.error("로그인 오류:", error);

    // 에러 코드별로 다른 메시지 표시
    if (error.code === "auth/user-not-found") {
      setError("등록되지 않은 이메일입니다.");
    } else if (error.code === "auth/wrong-password") {
      setError("비밀번호가 올바르지 않습니다.");
    } else if (error.code === "auth/invalid-login-credentials") {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else if (error.code === "auth/invalid-email") {
      setError("유효하지 않은 이메일 형식입니다.");
    } else if (error.code === "auth/too-many-requests") {
      setError("너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
    } else {
      setError("로그인에 실패했습니다.");
    }
  } finally {
    setLoading(false);
  }
};

  // 이메일/비밀번호 회원가입 처리
  const handleSignup = async () => {
    // 입력값 검증
    if (!email || !password || !confirmPassword || !displayName) {
      setError("모든 필드를 입력해주세요.");
      return;
    }
 
    if (!isValidEmail(email)) {
      setError("유효한 이메일 주소를 입력해주세요.");
      return;
    }
 
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
 
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
 
    setLoading(true);
    setError("");
 
    try {
      // Firebase 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
 
      // 사용자 프로필 업데이트
      await updateProfile(user, {
        displayName: displayName
      });
 
      // Firestore에 사용자 문서 생성
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        spouseStatus: 'none', // 초기 배우자 상태
      });
 
      // 부부 등록 페이지로 이동
      router.push("/spouse-registration");
 
      Alert.alert(
        "회원가입 완료", 
        "회원가입이 성공적으로 완료되었습니다! 부부 등록 페이지로 이동합니다."
      );
    } catch (error: any) {
      console.error("회원가입 오류:", error);
      
      if (error.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 이메일 주소입니다.");
      } else if (error.code === "auth/invalid-email") {
        setError("유효하지 않은 이메일 형식입니다.");
      } else if (error.code === "auth/weak-password") {
        setError("비밀번호가 너무 약합니다.");
      } else {
        setError("회원가입에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 재설정 이메일 전송
  const handleForgotPassword = async () => {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("유효한 이메일 주소를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "이메일 전송 완료", 
        "비밀번호 재설정 이메일을 전송했습니다. 이메일을 확인해주세요.",
        [
          { 
            text: "확인", 
            onPress: () => setIsForgotPassword(false)
          }
        ]
      );
    } catch (error: any) {
      console.error("비밀번호 재설정 오류:", error);
      
      if (error.code === "auth/user-not-found") {
        setError("등록되지 않은 이메일 주소입니다.");
      } else if (error.code === "auth/invalid-email") {
        setError("유효하지 않은 이메일 형식입니다.");
      } else {
        setError("비밀번호 재설정 이메일 전송에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 로그인 화면 렌더링
  const renderLoginForm = () => (
    <>
      {/* 이메일 입력란 */}
      <View style={styles.inputContainer}>
        <EmailIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* 비밀번호 입력란 */}
      <View style={styles.inputContainer}>
        <PasswordIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* 버튼 그룹 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <DefaultText style={styles.buttonText}>로그인</DefaultText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setIsSignUp(true)}
        >
          <DefaultText style={styles.buttonText}>이메일로 회원가입</DefaultText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          <View style={styles.row}>
            <GoogleIcon width={20} height={20} style={styles.googleIcon} />
            <DefaultText style={styles.buttonText}>구글로 계속하기</DefaultText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.findAccount}
          onPress={() => setIsForgotPassword(true)}
        >
          <DefaultText style={styles.findAccountText}>비밀번호 찾기</DefaultText>
        </TouchableOpacity>
      </View>
    </>
  );

  // 회원가입 화면 렌더링
  const renderSignupForm = () => (
    <>
      {/* 이름 입력란 */}
      <View style={styles.inputContainer}>
        <EmailIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor="#aaa"
          value={displayName}
          onChangeText={setDisplayName}
        />
      </View>
      
      {/* 이메일 입력란 */}
      <View style={styles.inputContainer}>
        <EmailIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* 비밀번호 입력란 */}
      <View style={styles.inputContainer}>
        <PasswordIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* 비밀번호 확인 입력란 */}
      <View style={styles.inputContainer}>
        <PasswordIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {/* 버튼 그룹 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <DefaultText style={styles.buttonText}>회원가입</DefaultText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setIsSignUp(false);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setDisplayName("");
            setError("");
          }}
        >
          <DefaultText style={styles.buttonText}>로그인 화면으로 돌아가기</DefaultText>
        </TouchableOpacity>
      </View>
    </>
  );

  // 비밀번호 찾기 화면 렌더링
  const renderForgotPasswordForm = () => (
    <>
      <DefaultText style={styles.forgotPasswordDescription}>
        가입 시 사용한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </DefaultText>
      
      {/* 이메일 입력란 */}
      <View style={styles.inputContainer}>
        <EmailIcon width={18} height={18} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* 버튼 그룹 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <DefaultText style={styles.buttonText}>이메일 전송</DefaultText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setIsForgotPassword(false);
            setError("");
          }}
        >
          <DefaultText style={styles.buttonText}>로그인 화면으로 돌아가기</DefaultText>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* 상단 영역: 타이틀 */}
        <View style={styles.topGroup}>
          <DefaultText style={styles.title}>EMOTION DIARY</DefaultText>
          <DefaultText style={styles.subtitle}>BE BETTER MARRIED</DefaultText>
          
          {/* 화면 제목 (로그인/회원가입/비밀번호 찾기) */}
          <DefaultText style={styles.screenTitle}>
            {isSignUp 
              ? "회원가입" 
              : isForgotPassword 
                ? "비밀번호 찾기" 
                : "로그인"}
          </DefaultText>
          
          {/* 오류 메시지 표시 */}
          {error ? (
            <View style={styles.errorContainer}>
              <DefaultText style={styles.errorText}>{error}</DefaultText>
            </View>
          ) : null}

          {/* 로그인/회원가입/비밀번호 찾기 화면 */}
          {isSignUp 
            ? renderSignupForm() 
            : isForgotPassword 
              ? renderForgotPasswordForm() 
              : renderLoginForm()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // 검정 배경
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  topGroup: {
    width: "100%",
    marginTop: 80, // 상단 영역 아래로 내림 (조정 가능)
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#FFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#FFF",
    marginBottom: 40,
  },
  screenTitle: {
    fontSize: 20,
    color: "#FFF",
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    width: "100%",
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#FFF",
    marginBottom: 25,
    width: "100%",
    paddingVertical: 8,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#FFF",
  },
  buttonGroup: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: "75%",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FFF",
    borderRadius: 8,
    backgroundColor: "#000",
    alignItems: "center",
    marginVertical: 8,
  },
  disabledButton: {
    borderColor: "#666",
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  googleIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
  },
  findAccount: {
    marginTop: 15,
    padding: 5,
  },
  findAccountText: {
    color: "#FFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  forgotPasswordDescription: {
    color: "#FFF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
});