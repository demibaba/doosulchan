// app/_layout.tsx
import 'react-native-gesture-handler'; // 최상단에서
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Text } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

// 1) GestureHandlerRootView 임포트
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

// 스플래시 화면 설정 등 폰트 로딩 로직
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  const [fontsLoaded] = useFonts({
    GmarketSansTTFBold: require("../assets/fonts/GmarketSansTTFBold.ttf"),
    GmarketSansTTFMedium: require("../assets/fonts/GmarketSansTTFMedium.ttf"),
    GmarketSansTTFLight: require("../assets/fonts/GmarketSansTTFLight.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // 폰트 로드 전까지 스플래시 화면 유지
  }

  // Text 컴포넌트의 기본 폰트 지정
  const TextAny = Text as any;
  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.style = {
    ...(TextAny.defaultProps.style || {}),
    fontFamily: "GmarketSansTTFLight",
  };

  return (
    // 2) GestureHandlerRootView로 전체 감싸기
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ✅ 바텀시트 기능 활성화 */}
      <BottomSheetModalProvider>
        <Stack>
          {/* index.tsx → AuthScreen 리다이렉트 */}
          <Stack.Screen name="index" options={{ headerShown: true }} />
  
          {/* AuthScreen (로그인+회원가입 합친 화면) */}
          <Stack.Screen name="AuthScreen" options={{ headerShown: true }} />
  
          {/* 기타 스크린들 */}
          <Stack.Screen name="calendar" options={{ headerShown: true }} />
          <Stack.Screen 
            name="diary/[date]" 
            options={{ 
              title: "다이어리 작성",
              headerShown: true
          }} 
/>
          <Stack.Screen
            name="spouse-registration"
            options={{ title: "부부 등록" }}
          />
          <Stack.Screen
            name="screens/WeeklyDiaryScreen"
            options={{ title: "최근 7일 다이어리" }}
          />       
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
  
}
