// app/AuthScreen.tsx - 구글 로그인 라우팅 문제 완전 해결된 세련된 미니멀 디자인 웜톤 베이지 버전
// 인증 화면 컴포넌트 - 로그인, 회원가입, 비밀번호 찾기 기능을 제공
// 구글 로그인 및 이메일/비밀번호 인증 지원
// 웜톤 베이지 컬러의 미니멀 디자인 적용

import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
import { auth, db } from "../config/firebaseConfig";
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

  // === 상태 관리 ===
  // 폼 입력값 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  // 화면 상태
  const [isSignUp, setIsSignUp] = useState(false);  // 회원가입 모드 여부
  const [isForgotPassword, setIsForgotPassword] = useState(false);  // 비밀번호 찾기 모드 여부
  const [loading, setLoading] = useState(false);  // 로딩 상태
  
  // 에러 처리 상태
  const [error, setError] = useState("");  // 에러 메시지
  const [retryFunction, setRetryFunction] = useState<(() => void) | null>(null);  // 재시도 함수
  const [showRetry, setShowRetry] = useState(false);  // 재시도 버튼 표시 여부

  // === 구글 인증 설정 ===
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '232207972245-ffc2k7o5rag3mbm3ovh5s56f6ov82183.apps.googleusercontent.com',
    iosClientId: '232207972245-fkh0ree3o2d1i5022lki16691e9nee9e.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
  });

  // === 유틸리티 함수 ===
  /**
   * 이메일 유효성 검사
   * @param email 검사할 이메일 주소
   * @returns 이메일 형식이 유효한지 여부
   */
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * 폼 초기화 - 모든 입력값과 에러 상태를 리셋
   */
  const clearForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setError("");
    setShowRetry(false);
    setRetryFunction(null);
  };

  /**
   * 에러 처리 - 네트워크 에러와 일반 에러를 구분하여 처리
   * @param error 발생한 에러 객체
   * @param retryFunc 재시도할 함수 (선택적)
   */
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

  /**
   * 재시도 처리 - 네트워크 에러 발생 시 작업 재시도
   */
  const handleRetry = () => {
    setError("");
    setShowRetry(false);
    if (retryFunction) {
      retryFunction();
    }
    setRetryFunction(null);
  };

  // === 인증 후 처리 ===
  /**
   * 인증 완료 후 처리 - 사용자 데이터 확인 및 라우팅 준비
   * 실제 라우팅은 index.tsx에서 처리하여 중복 라우팅 방지
   */
  const navigateAfterAuth = async (user: any) => {
    try {
      // Firebase에 사용자 데이터는 저장하되, 라우팅은 하지 않음
      // index.tsx의 onAuthStateChanged가 자동으로 감지해서 올바른 경로로 이동할 거임
      console.log("로그인 완료, index.tsx가 라우팅 처리");
      
      // 사용자 데이터만 확인해서 로그에 출력 (디버깅용)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      console.log("사용자 온보딩 상태:", userData?.onboardingCompleted);
      
    } catch (error) {
      console.error("사용자 데이터 확인 오류:", error);
    }
    
    // 라우팅은 index.tsx가 처리하므로 여기서는 아무것도 안 함!
  };

  /**
   * 환영 메시지 표시
   */
  const showWelcomeMessage = (displayName: string) => {
    console.log(`${displayName}님 로그인 완료`);
  };

  // === 구글 로그인 처리 ===
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

          // ✅ 라우팅 제거! index.tsx가 처리하도록
          console.log("구글 로그인 완료, index.tsx가 라우팅 처리");
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

  // === 이메일 인증 처리 ===
  /**
   * 이메일/비밀번호 로그인 처리
   * 유효성 검사 후 Firebase 인증 수행
   */
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
      // ✅ 라우팅 제거 - index.tsx가 처리
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

  /**
   * 회원가입 처리
   * 입력값 유효성 검사 후 Firebase에 새 계정 생성
   * 성공 시 온보딩 페이지로 이동
   */
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
 
      // ✅ 신규 회원가입은 항상 온보딩으로 
      router.replace("/attachment-test");
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

  /**
   * 비밀번호 재설정 이메일 발송
   * 입력된 이메일로 재설정 링크 전송
   */
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
      setError("");
      setTimeout(() => {
        setIsForgotPassword(false);
      }, 500);
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

  // === 화면 전환 함수 ===
  /**
   * 회원가입 화면으로 전환
   */
  const switchToSignup = () => {
    clearForm();
    setIsSignUp(true);
  };

  /**
   * 로그인 화면으로 전환
   */
  const switchToLogin = () => {
    clearForm();
    setIsSignUp(false);
  };

  /**
   * 비밀번호 찾기 화면으로 전환
   */
  const switchToForgotPassword = () => {
    clearForm();
    setIsForgotPassword(true);
  };

  /**
   * 로그인 화면으로 돌아가기
   */
  const switchBackToLogin = () => {
    clearForm();
    setIsForgotPassword(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* 메인 카드 */}
          <View style={styles.mainCard}>
            {/* 헤더 */}
            <View style={styles.header}>
              <DefaultText style={styles.screenTitle}>
                {isSignUp ? "Sign up" : isForgotPassword ? "Reset Password" : "Login"}
              </DefaultText>
            </View>

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

            {/* 입력 필드들 */}
            <View style={styles.inputSection}>
              {/* 이름 필드 (회원가입 시에만) */}
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <EmailIcon width={18} height={18} fill="#A08B6F" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="이름"
                      placeholderTextColor="#B8A693"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* 이메일 필드 */}
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <EmailIcon width={18} height={18} fill="#A08B6F" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="이메일"
                    placeholderTextColor="#B8A693"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* 비밀번호 필드 */}
              {!isForgotPassword && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <PasswordIcon width={18} height={18} fill="#A08B6F" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={isSignUp ? "비밀번호 (6자 이상)" : "비밀번호"}
                      placeholderTextColor="#B8A693"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={true}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* 비밀번호 확인 필드 (회원가입 시에만) */}
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <PasswordIcon width={18} height={18} fill="#A08B6F" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="비밀번호 확인"
                      placeholderTextColor="#B8A693"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={true}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* 비밀번호 찾기 설명 */}
              {isForgotPassword && (
                <DefaultText style={styles.description}>
                  가입하신 이메일 주소를 입력하시면{'\n'}
                  비밀번호 재설정 링크를 보내드립니다.
                </DefaultText>
              )}
            </View>

            {/* 메인 버튼 */}
            <TouchableOpacity
              style={[styles.mainButton, loading && styles.disabledButton]}
              onPress={
                isSignUp ? handleSignup : 
                isForgotPassword ? handleForgotPassword : 
                handleLogin
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <DefaultText style={styles.mainButtonText}>
                  {isSignUp ? "회원가입" : isForgotPassword ? "재설정 이메일 전송" : "Login"}
                </DefaultText>
              )}
            </TouchableOpacity>

            {/* 비밀번호 찾기 링크 (로그인 시에만) */}
            {!isSignUp && !isForgotPassword && (
              <TouchableOpacity 
                style={styles.forgotButton} 
                onPress={switchToForgotPassword}
              >
                <DefaultText style={styles.forgotText}>Forgot Password?</DefaultText>
              </TouchableOpacity>
            )}

            {/* 구글 로그인 버튼 (로그인 시에만) */}
            {!isSignUp && !isForgotPassword && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <DefaultText style={styles.dividerText}>OR</DefaultText>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, (!request || loading) && styles.disabledButton]}
                  onPress={() => promptAsync()}
                  disabled={!request || loading}
                >
                  <GoogleIcon width={20} height={20} fill="#A08B6F" />
                  <DefaultText style={styles.googleButtonText}>Continue with Google</DefaultText>
                </TouchableOpacity>
              </>
            )}

            {/* 하단 링크 */}
            <View style={styles.bottomSection}>
              {!isForgotPassword ? (
                <TouchableOpacity 
                  onPress={isSignUp ? switchToLogin : switchToSignup}
                  style={styles.switchButton}
                >
                  <DefaultText style={styles.switchText}>
                    {isSignUp ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
                    <DefaultText style={styles.switchLink}>
                      {isSignUp ? "로그인" : "회원가입"}
                    </DefaultText>
                  </DefaultText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={switchBackToLogin}
                  style={styles.switchButton}
                >
                  <DefaultText style={styles.switchText}>
                    로그인으로 <DefaultText style={styles.switchLink}>돌아가기</DefaultText>
                  </DefaultText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 앱 정보 */}
          <View style={styles.appInfo}>
            <DefaultText style={styles.appTitle}>EMOTION DIARY</DefaultText>
            <DefaultText style={styles.appSubtitle}>소중한 마음을 기록하는 공간</DefaultText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3E9", // 웜톤 베이지 배경
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // 메인 카드
  mainCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // 헤더
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#5D4E37",
    letterSpacing: 0.5,
  },
  
  // 오류 메시지
  errorContainer: {
    backgroundColor: "#FFF2F2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  errorText: {
    color: "#D32F2F",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#D32F2F",
    borderRadius: 6,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  
  // 입력 섹션
  inputSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: "#E8D5B7",
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#5D4E37",
    paddingVertical: 8,
  },
  
  // 설명 텍스트
  description: {
    color: "#8D7A65",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  
  // 메인 버튼
  mainButton: {
    backgroundColor: "#C9B8A3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // 비밀번호 찾기 버튼
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  forgotText: {
    color: "#8D7A65",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  
  // 구분선
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8D5B7",
  },
  dividerText: {
    color: "#B8A693",
    fontSize: 12,
    marginHorizontal: 16,
    fontWeight: "500",
  },
  
  // 구글 버튼
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonText: {
    color: "#5D4E37",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
  
  // 하단 섹션
  bottomSection: {
    alignItems: 'center',
  },
  switchButton: {
    paddingVertical: 8,
  },
  switchText: {
    color: "#8D7A65",
    fontSize: 14,
    textAlign: 'center',
  },
  switchLink: {
    color: "#C9B8A3",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  
  // 앱 정보
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5D4E37",
    marginBottom: 4,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 13,
    color: "#8D7A65",
    textAlign: 'center',
  },
});