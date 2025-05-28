// app/AuthScreen.tsx - 정리 및 심리테스트 기능 추가
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

// SVG 아이콘 임포트
import GoogleIcon from "../assets/images/googleIcon.svg";
import EmailIcon from "../assets/images/emailIcon.svg";
import PasswordIcon from "../assets/images/passwordIcon.svg";

// WebBrowser 세션 완료 설정
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();

  // 상태 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryFunction, setRetryFunction] = useState<(() => void) | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [user, setUser] = useState(auth.currentUser); // 사용자 상태 추가

  // 구글 인증 훅
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '232207972245-ffc2k7o5rag3mbm3ovh5s56f6ov82183.apps.googleusercontent.com',
    iosClientId: '232207972245-fkh0ree3o2d1i5022lki16691e9nee9e.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
  });

  // 사용자 상태 감지
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 공통 유틸리티 함수들
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setError("");
    setShowRetry(false);
    setRetryFunction(null);
  };

  const handleError = (error: any, retryFunc?: () => void) => {
    console.error("AuthScreen 오류:", error);
    
    const isNetworkError = 
      error.code === "auth/network-request-failed" ||
      error.code === "auth/timeout" ||
      error.message?.includes("network") ||
      error.message?.includes("timeout");
    
    if (isNetworkError) {
      setError("네트워크 연결을 확인하고 다시 시도해주세요.");
      setShowRetry(true);
      setRetryFunction(() => retryFunc || null);
    } else {
      setShowRetry(false);
      setRetryFunction(null);
    }
  };

  const handleRetry = () => {
    setError("");
    setShowRetry(false);
    if (retryFunction) {
      retryFunction();
    }
    setRetryFunction(null);
  };

  const navigateAfterAuth = async (user: any) => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    // 심리테스트 완료 여부 확인
    if (!userData?.personalityType) {
      router.push("/psychology-test");  // 심리테스트 먼저!
    } else if (!userData || userData.spouseStatus === 'none') {
      router.push("/spouse-registration");
    } else {
      router.push("/calendar");
    }
  };

  const showWelcomeMessage = (displayName: string) => {
    Alert.alert(
      "🤍 새로운 시작", 
      `${displayName}님, 반갑습니다.\n\n마음이 담긴 순간들을 함께 기록하며\n더 깊은 연결을 만들어가요.`,
      [{ text: "시작할게요", style: "default" }]
    );
  };

  // 구글 로그인 응답 처리
  useEffect(() => {
    if (response?.type === "success") {
      setLoading(true);
      setError("");
      
      const { id_token } = response.params;
      
      if (!id_token) {
        setError("구글 로그인 토큰을 받지 못했습니다.");
        setLoading(false);
        return;
      }
      
      const credential = GoogleAuthProvider.credential(id_token);
  
      const handleGoogleLogin = async () => {
        try {
          const userCredential = await signInWithCredential(auth, credential);
          const user = userCredential.user;
          
          await setDoc(
            doc(db, "users", user.uid), 
            { 
              email: user.email,
              displayName: user.displayName,
              createdAt: new Date().toISOString(),
              spouseStatus: 'none',
            }, 
            { merge: true }
          );

          await navigateAfterAuth(user);
          showWelcomeMessage(user.displayName || "사용자");
        } catch (error: any) {
          handleError(error, handleGoogleLogin);
          
          if (!error.message?.includes("network")) {
            if (error.code === "auth/popup-closed-by-user") {
              setError("로그인이 취소되었습니다.");
            } else {
              setError(`구글 로그인 실패: ${error.message}`);
            }
          }
        } finally {
          setLoading(false);
        }
      };
  
      handleGoogleLogin();
    } else if (response?.type === "error") {
      setError(`구글 로그인 오류: ${response.error?.message || "알 수 없는 오류"}`);
      setLoading(false);
    } else if (response?.type === "cancel" || response?.type === "dismiss") {
      setError("로그인이 취소되었습니다.");
      setLoading(false);
    }
  }, [response]);

  // 이메일 로그인
  const handleLogin = async () => {
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
    setShowRetry(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await navigateAfterAuth(userCredential.user);
    } catch (error: any) {
      handleError(error, handleLogin);
      
      if (!error.message?.includes("network")) {
        const errorMessages: { [key: string]: string } = {
          "auth/user-not-found": "등록되지 않은 이메일입니다.",
          "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
          "auth/invalid-login-credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
          "auth/invalid-email": "유효하지 않은 이메일 형식입니다.",
          "auth/too-many-requests": "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요."
        };
        setError(errorMessages[error.code] || "로그인에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const handleSignup = async () => {
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
    setShowRetry(false);
 
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
 
      await updateProfile(user, { displayName: displayName });
 
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        spouseStatus: 'none',
      });
 
      router.push("/spouse-registration");
      Alert.alert("회원가입 완료", "회원가입이 성공적으로 완료되었습니다!");
    } catch (error: any) {
      handleError(error, handleSignup);
      
      if (!error.message?.includes("network")) {
        const errorMessages: { [key: string]: string } = {
          "auth/email-already-in-use": "이미 사용 중인 이메일 주소입니다.",
          "auth/invalid-email": "유효하지 않은 이메일 형식입니다.",
          "auth/weak-password": "비밀번호가 너무 약합니다."
        };
        setError(errorMessages[error.code] || "회원가입에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 찾기
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
    setShowRetry(false);

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "이메일 전송 완료", 
        "비밀번호 재설정 이메일을 전송했습니다. 이메일을 확인해주세요.",
        [{ text: "확인", onPress: () => setIsForgotPassword(false) }]
      );
    } catch (error: any) {
      handleError(error, handleForgotPassword);
      
      if (!error.message?.includes("network")) {
        const errorMessages: { [key: string]: string } = {
          "auth/user-not-found": "등록되지 않은 이메일 주소입니다.",
          "auth/invalid-email": "유효하지 않은 이메일 형식입니다."
        };
        setError(errorMessages[error.code] || "비밀번호 재설정 이메일 전송에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 화면 전환 함수들
  const switchToSignup = () => {
    clearForm();
    setIsSignUp(true);
  };

  const switchToLogin = () => {
    clearForm();
    setIsSignUp(false);
  };

  const switchToForgotPassword = () => {
    clearForm();
    setIsForgotPassword(true);
  };

  const switchBackToLogin = () => {
    clearForm();
    setIsForgotPassword(false);
  };

  // 공통 입력 컴포넌트
  const renderInput = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: React.ReactNode,
    secureTextEntry = false,
    keyboardType: any = "default"
  ) => (
    <View style={styles.inputContainer}>
      {icon}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );

  // 공통 버튼 컴포넌트
  const renderButton = (title: string, onPress: () => void, isLoading = false) => (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.disabledButton]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <DefaultText style={styles.buttonText}>{title}</DefaultText>
      )}
    </TouchableOpacity>
  );

  // 로그인 화면
  const renderLoginForm = () => (
    <>
      {renderInput("이메일", email, setEmail, <EmailIcon width={18} height={18} style={styles.icon} />, false, "email-address")}
      {renderInput("비밀번호", password, setPassword, <PasswordIcon width={18} height={18} style={styles.icon} />, true)}

      <View style={styles.buttonGroup}>
        {renderButton("로그인", handleLogin, loading)}
        {renderButton("이메일로 회원가입", switchToSignup)}
        
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

        <TouchableOpacity style={styles.findAccount} onPress={switchToForgotPassword}>
          <DefaultText style={styles.findAccountText}>비밀번호 찾기</DefaultText>
        </TouchableOpacity>
      </View>

      {/* 심리테스트 섹션 - 로그인 후 표시 */}
      {user && (
        <View style={styles.psychologyTestSection}>
          <View style={styles.divider} />
          <DefaultText style={styles.psychologyTestTitle}>
            💫 시작하기 전에
          </DefaultText>
          <DefaultText style={styles.psychologyTestSubtitle}>
            간단한 테스트로 당신만의 맞춤 다이어리를 만들어보세요
          </DefaultText>
          <TouchableOpacity
            style={styles.psychologyTestButton}
            onPress={() => router.push('/psychology-test')}
          >
            <DefaultText style={styles.psychologyTestButtonText}>
              🧠 나의 관계 성향 알아보기
            </DefaultText>
            <DefaultText style={styles.psychologyTestTime}>
              ⏱️ 3분 소요
            </DefaultText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace("/calendar")}
          >
            <DefaultText style={styles.skipButtonText}>
              나중에 하기
            </DefaultText>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // 회원가입 화면
  const renderSignupForm = () => (
    <>
      {renderInput("이름", displayName, setDisplayName, <EmailIcon width={18} height={18} style={styles.icon} />)}
      {renderInput("이메일", email, setEmail, <EmailIcon width={18} height={18} style={styles.icon} />, false, "email-address")}
      {renderInput("비밀번호 (6자 이상)", password, setPassword, <PasswordIcon width={18} height={18} style={styles.icon} />, true)}
      {renderInput("비밀번호 확인", confirmPassword, setConfirmPassword, <PasswordIcon width={18} height={18} style={styles.icon} />, true)}

      <View style={styles.buttonGroup}>
        {renderButton("회원가입", handleSignup, loading)}
        {renderButton("로그인 화면으로 돌아가기", switchToLogin)}
      </View>
    </>
  );

  // 비밀번호 찾기 화면
  const renderForgotPasswordForm = () => (
    <>
      <DefaultText style={styles.forgotPasswordDescription}>
        가입 시 사용한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </DefaultText>
      
      {renderInput("이메일", email, setEmail, <EmailIcon width={18} height={18} style={styles.icon} />, false, "email-address")}

      <View style={styles.buttonGroup}>
        {renderButton("이메일 전송", handleForgotPassword, loading)}
        {renderButton("로그인 화면으로 돌아가기", switchBackToLogin)}
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
        <View style={styles.topGroup}>
          <DefaultText style={styles.title}>EMOTION DIARY</DefaultText>
          <DefaultText style={styles.subtitle}>BE BETTER MARRIED</DefaultText>
          
          <DefaultText style={styles.screenTitle}>
            {isSignUp ? "회원가입" : isForgotPassword ? "비밀번호 찾기" : "로그인"}
          </DefaultText>
          
          {/* 오류 메시지 */}
          {error ? (
            <View style={styles.errorContainer}>
              <DefaultText style={styles.errorText}>{error}</DefaultText>
              {showRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <DefaultText style={styles.retryButtonText}>다시 시도</DefaultText>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* 화면 렌더링 */}
          {isSignUp ? renderSignupForm() : isForgotPassword ? renderForgotPasswordForm() : renderLoginForm()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  topGroup: {
    width: "100%",
    marginTop: 80,
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
  retryButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#FF3B30",
    borderRadius: 5,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
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
  // 심리테스트 스타일
  psychologyTestSection: {
    marginTop: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#2A2A2A",
    marginBottom: 24,
  },
  psychologyTestTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  psychologyTestSubtitle: {
    color: "#CCCCCC",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  psychologyTestButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  psychologyTestButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  psychologyTestTime: {
    color: "#FFFFFF",
    fontSize: 12,
    opacity: 0.9,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: "#999999",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});