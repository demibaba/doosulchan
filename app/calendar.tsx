// app/calendar.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, PanResponder, Easing } from "react-native";
import { useRouter } from "expo-router";
import DefaultText from "./components/DefaultText";
import { auth, db } from "../config/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { TextInput } from "react-native-gesture-handler";
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons'; // 아이콘 사용을 위해 추가
import SpouseStatusBar from './components/SpouseStatusBar';
export default function CalendarPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaryDates, setDiaryDates] = useState<string[]>([]);
  const [diarySnippets, setDiarySnippets] = useState<{ [date: string]: string }>({});
  const [menuVisible, setMenuVisible] = useState(false); // 메뉴 표시 여부 상태 추가
  const [pendingRequests, setPendingRequests] = useState(0); // 대기 중인 부부 요청 수
  const [isMonthChanging, setIsMonthChanging] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('');
  const calendarAnimation = useRef(new Animated.Value(0)).current;
  const [animationProgress, setAnimationProgress] = useState(0); // 드래그 진행 상태 추적
  const dragX = useRef(new Animated.Value(0)).current;



  // 일주일치 다이어리 가져오기 버튼 핸들러
  const handleWeeklyDiaryPress = () => {
    router.push('/screens/WeeklyDiaryScreen' as any);
  };
  
  // 바텀 시트 관련 상수 - 높이 단계 정의
  const BOTTOM_SHEET_CLOSED = 0;
  const BOTTOM_SHEET_PARTIAL = 300; // 40% 정도 올라오도록 높이 설정

  // 바텀 시트 관련 상태 및 애니메이션 값
  const [selectedDiaryContent, setSelectedDiaryContent] = useState<string>("");
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const bottomSheetHeight = useRef(new Animated.Value(0)).current;

  // 요청 수 확인 함수
  const checkPendingRequests = async () => {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'spouseRequests'),
        where('recipientId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      setPendingRequests(snapshot.size);
    } catch (error) {
      console.error('요청 확인 오류:', error);
    }
  };
  // 3. 월 변경 애니메이션 함수 추가 (useEffect 위쪽에 추가)
  const changeMonth = (direction: 'next' | 'prev') => {
    setIsMonthChanging(true);
    setAnimationDirection(direction);

    
    // 애니메이션 방향 설정
    setAnimationDirection(direction === 'next' ? 'slide-left' : 'slide-right');
    // 시작 위치 설정 (방향에 따라 화면 좌/우측에서 시작)
    dragX.setValue(direction === 'next' ? -50 : 50);
  
    // 애니메이션 실행 - 스트레치 효과와 함께
    Animated.spring(dragX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,  // 마찰 - 값이 작을수록 더 많이 튕김
      tension: 40,  // 장력 - 값이 클수록 더 빠르게 움직임
    }).start(() => {
      // 애니메이션 완료 후 실제 월 변경
      setCurrentMonth(new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + (direction === 'next' ? 1 : -1),
        1
      ));
      
      // 상태 초기화
      setIsMonthChanging(false);
      dragX.setValue(0);
    });
  };

  // 첫 로드 시 및 메뉴 열 때마다 확인
  useEffect(() => {
    checkPendingRequests();
  }, []);

  useEffect(() => {
    if (menuVisible) {
      checkPendingRequests();
    }
  }, [menuVisible]);

  // 바텀 시트 열기 - 부분적으로 열린 상태
  const openBottomSheet = () => {
    Animated.timing(bottomSheetHeight, {
      toValue: BOTTOM_SHEET_PARTIAL,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  // 바텀 시트 닫기
  const closeBottomSheet = () => {
    Animated.timing(bottomSheetHeight, {
      toValue: BOTTOM_SHEET_CLOSED,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.in(Easing.ease),
    }).start(() => {
      setSelectedDiaryContent("");
      setSelectedDiaryDate("");
    });
  };

  // 다이어리 페이지로 직접 이동
  const directNavigate = () => {
    if (selectedDiaryDate) {
      console.log("직접 페이지 이동 시도:", `/diary/${selectedDiaryDate}`);
      
      // 바텀 시트 닫기 (애니메이션 없이 즉시)
      bottomSheetHeight.setValue(0);
      
      // 상태 초기화
      setSelectedDiaryContent("");
      setSelectedDiaryDate("");
      
      // 단순히 router.push만 사용
      try {
        router.push(`/diary/${selectedDiaryDate}` as any);
      } catch (error) {
        console.error("페이지 이동 오류:", error);
        
        // 페이지 이동이 실패하면 다시 시도
        setTimeout(() => {
          router.push(`/diary/${selectedDiaryDate}` as any);
        }, 100);
      }
    }
  };

  // 메뉴 토글 함수
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  // 메뉴 항목 처리 함수들
  const handleDiaryWrite = () => {
    // 현재 날짜 포맷팅
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    // 메뉴 닫기
    setMenuVisible(false);
    
    // 다이어리 작성 페이지로 이동
    router.push(`/diary/${dateParam}` as any);
  };

  const handleReportsPage = () => {
    setMenuVisible(false);
    router.push('/reports' as any);
  };

  const handleProfilePage = () => {
    setMenuVisible(false);
    // 회원 프로필 페이지 구현 예정
    console.log("회원 프로필 페이지로 이동 (아직 구현되지 않음)");
    // 미구현 기능 알림
    alert("회원 프로필 기능은 아직 개발 중입니다.");
  };

  // 배우자 요청 확인 페이지로 이동
  const handleSpouseRequestsPage = () => {
    setMenuVisible(false);
    router.push('/screens/spouse-requests' as any);
  };

  // 메뉴 닫기
  const closeMenu = () => {
    setMenuVisible(false);
  };

  // 메뉴 버튼 애니메이션 값
  const menuButtonsAnimation = useRef(new Animated.Value(0)).current;

  // 메뉴 표시/숨김 애니메이션
  useEffect(() => {
    Animated.timing(menuButtonsAnimation, {
      toValue: menuVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [menuVisible]);

  // 바텀 시트 PanResponder 설정
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 수직 방향으로 충분히 드래그할 때만 PanResponder 활성화
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTransitioning) return; // 전환 중에는 드래그 무시
        
        // 현재 높이에서 드래그 거리만큼 조정
        let currentValue = 0;
        bottomSheetHeight.stopAnimation(value => {
          currentValue = value;
        });
        
        let newHeight = currentValue - gestureState.dy;
        
        // 높이 제한
        if (newHeight < 0) newHeight = 0;
        if (newHeight > BOTTOM_SHEET_PARTIAL * 1.5) newHeight = BOTTOM_SHEET_PARTIAL * 1.5;
        
        bottomSheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        // 전환 중에는 무시
        if (isTransitioning) return;
        
        // 현재 높이 값 가져오기
        let currentValue = 0;
        bottomSheetHeight.stopAnimation(value => {
          currentValue = value;
        });
        
        console.log("스와이프 감지 - dy:", gestureState.dy, "vy:", gestureState.vy, "current:", currentValue);
        
        // 위로 충분히 스와이프하면 다이어리 페이지로 이동
        if (gestureState.dy < -50 || gestureState.vy < -0.5 || currentValue > BOTTOM_SHEET_PARTIAL * 1.2) {
          console.log("위로 스와이프: 다이어리 페이지로 이동");
          
          // 전환 중 상태로 설정하여 중복 호출 방지
          setIsTransitioning(true);
          
          // 먼저 바텀 시트를 닫음
          Animated.timing(bottomSheetHeight, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            // 애니메이션 완료 후 페이지 이동
            directNavigate();
            
            // 전환 완료
            setTimeout(() => {
              setIsTransitioning(false);
            }, 300);
          });
          
          return;
        }
        
        // 아래로 스와이프하면 닫기
        if (gestureState.dy > 50 || gestureState.vy > 0.3) {
          console.log("아래로 스와이프: 닫기");
          closeBottomSheet();
        } else {
          // 기본 상태로 유지
          openBottomSheet();
        }
      },
    })
  ).current;

  // 사용자의 다이어리 날짜 및 스니펫 로드
  useEffect(() => {
    const fetchDiaryData = async () => {
      if (!auth.currentUser) return;

      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        // 현재 월의 첫날과 마지막날
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
        // YYYY-MM-DD 형식으로 변환
        const startDateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const endDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;
        
        const diariesRef = collection(db, "diaries");
        const q = query(
          diariesRef,
          where("userId", "==", auth.currentUser.uid),
          where("date", ">=", startDateStr),
          where("date", "<=", endDateStr)
        );
        
        const querySnapshot = await getDocs(q);
        const dates: string[] = [];
        const snippets: { [date: string]: string } = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            dates.push(data.date);
            
            // 텍스트 내용의 첫 15자 정도를 스니펫으로 저장
            if (data.text) {
              const snippet = data.text.substring(0, 15) + (data.text.length > 15 ? "..." : "");
              snippets[data.date] = snippet;
            }
          }
        });
        
        setDiaryDates(dates);
        setDiarySnippets(snippets);
      } catch (error) {
        console.error("다이어리 데이터 로드 오류:", error);
      }
    };
    
    fetchDiaryData();
  }, [currentMonth, auth.currentUser]);

  // 제스처 설정 - 좌우 스와이프로 월 변경
// 3. 진행 중인 드래그 제스처 처리 함수 (평소보다 더 쭉 당겨지는 느낌을 줌)
const swipeGesture = Gesture.Pan()
  .runOnJS(true)
  .onBegin(() => {
    // 드래그 시작 시 설정
    if (!isMonthChanging) {
      dragX.setValue(0);
    }
  })
  .onUpdate((event) => {
    // 드래그 중에 실시간으로 위치 업데이트
    if (!isMonthChanging) {
      // 드래그 저항 추가 (완전히 1:1로 움직이지 않고 저항 추가)
      // 값을 나눠서 드래그 거리보다 실제 이동하는 거리가 작게 함
      dragX.setValue(event.translationX / 2.5);
      
      // 애니메이션 진행 상태 업데이트 (백분율)
      if (Math.abs(event.translationX) > 20) {
        const direction = event.translationX > 0 ? 'prev' : 'next';
        setAnimationDirection(direction);
      }
    }
  })
  .onEnd((event) => {
    if (isMonthChanging) return;
    
    // 충분히 드래그했으면 월 변경
    if (Math.abs(event.translationX) > 80) {
      if (event.translationX > 0) {
        // 오른쪽으로 스와이프 - 이전 달
        changeMonth('prev');
      } else {
        // 왼쪽으로 스와이프 - 다음 달
        changeMonth('next');
      }
    } else {
      // 충분히 드래그하지 않았으면 원래 위치로 복귀
      Animated.spring(dragX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();
    }
  });

  // 날짜 클릭 핸들러
  const handleDatePress = async (date: Date) => {
    setSelectedDate(date);
    
    // 클릭한 날짜를 YYYY-M-D 형식으로 변환
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth()는 0부터 시작하므로 1을 더함
    const day = date.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    // 해당 날짜의 다이어리 내용 가져오기
    if (auth.currentUser) {
      try {
        // 패딩된 날짜 문자열 생성 (YYYY-MM-DD)
        const paddedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
        const diarySnap = await getDoc(diaryRef);
        
        if (diarySnap.exists()) {
          // 다이어리가 존재하면 내용 설정 및 바텀 시트 열기
          const data = diarySnap.data();
          setSelectedDiaryContent(data.text || "");
          setSelectedDiaryDate(dateParam);
          openBottomSheet();
        } else {
          // 다이어리가 없으면 바로 작성 페이지로 이동
          router.push(`/diary/${dateParam}` as any);
        }
      } catch (error) {
        console.error("다이어리 내용 로드 오류:", error);
        router.push(`/diary/${dateParam}` as any);
      }
    } else {
      // 로그인하지 않은 경우 바로 작성 페이지로 이동
      router.push(`/diary/${dateParam}` as any);
    }
  };

  // 다이어리 쓰기 페이지로 이동 (현재 날짜)
  const handleCurrentDiaryWrite = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    router.push(`/diary/${dateParam}` as any);
  };

  // 레포트 페이지로 이동 핸들러
  const handleReportsPress = () => {
    router.push('/reports' as any);
  };

  // 달력 렌더링 로직
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 월의 첫 날과 마지막 날
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // 첫 날의 요일 (0: 일요일, 1: 월요일, ...)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // CalendarDay 타입 정의
    type CalendarDay = {
      date: Date;
      currentMonth: boolean;
    };
    
    // 달력에 표시할 날짜 배열 생성
    const daysArray: CalendarDay[] = [];
    
    // 전월 날짜 채우기
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDate = new Date(year, month, 0 - i);
      daysArray.unshift({
        date: prevMonthDate,
        currentMonth: false,
      });
    }
    
    // 현재 월 날짜 채우기
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      daysArray.push({
        date: currentDate,
        currentMonth: true,
      });
    }
    
    // 다음 달 날짜 채우기 (6주가 되도록)
    const remainingDays = 42 - daysArray.length; // 항상 6주(42일) 표시
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      daysArray.push({
        date: nextMonthDate,
        currentMonth: false,
      });
    }
    
    // 7일씩 그룹화하여 주 단위로 표시
    const calendarWeeks: CalendarDay[][] = [];
    for (let i = 0; i < 6; i++) {
      calendarWeeks.push(daysArray.slice(i * 7, (i + 1) * 7));
    }

    return (
      <View>
        {/* 요일 헤더 */}
        <View style={styles.weekHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
            <View key={idx} style={styles.weekDay}>
              <DefaultText 
                style={[
                  styles.weekDayText, 
                  idx === 0 ? styles.sundayText : null,
                  idx === 6 ? styles.saturdayText : null
                ]}
              >
                {dayName}
              </DefaultText>
            </View>
          ))}
        </View>
        
        {/* 달력 날짜 */}
        {calendarWeeks.map((calendarWeek: CalendarDay[], weekIdx: number) => (
          <View key={weekIdx} style={styles.week}>
            {calendarWeek.map((calendarDay: CalendarDay, dayIdx: number) => {
              const dateStr = `${calendarDay.date.getFullYear()}-${String(calendarDay.date.getMonth() + 1).padStart(2, "0")}-${String(calendarDay.date.getDate()).padStart(2, "0")}`;
              const hasDiary = diaryDates.includes(dateStr);
              const snippetText = diarySnippets[dateStr] || "";
              
              return (
                <TouchableOpacity
                  key={dayIdx}
                  style={[
                    styles.day,
                    !calendarDay.currentMonth ? styles.otherMonthDay : null,
                    selectedDate && calendarDay.date.toDateString() === selectedDate.toDateString() ? styles.selectedDay : null,
                  ]}
                  onPress={() => handleDatePress(calendarDay.date)}
                >
                  <View style={styles.dayContent}>
                    <DefaultText
                      style={[
                        styles.dayText,
                        !calendarDay.currentMonth ? styles.otherMonthDayText : null,
                        dayIdx === 0 ? styles.sundayText : null,
                        dayIdx === 6 ? styles.saturdayText : null,
                      ]}
                    >
                      {calendarDay.date.getDate()}
                    </DefaultText>
                    
                    {/* 스니펫 표시만 하고 초록색 점은 제거 */}
                    {hasDiary && snippetText && (
                      <DefaultText style={styles.snippetText} numberOfLines={1}>
                        {snippetText}
                      </DefaultText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
      
        {/* 상태바를 달력 헤더 위에 배치 */}
        <SpouseStatusBar />
        
        {/* 달력 헤더 */}
        <View style={styles.calendarHeader}>
          <DefaultText style={styles.monthText}>
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </DefaultText>
        </View>
        
        {/* 달력 본문 */}
        <Animated.View 
          style={[
            styles.calendarContent,
            {
              transform: [
                {
                  translateX: calendarAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: 
                      animationDirection === 'slide-right' 
                        ? [-20, 100, 0] // 이전 달로 이동 시
                        : [20, -100, 0], // 다음 달로 이동 시
                  })
                }
              ],
              opacity: calendarAnimation.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [1, 0.7, 0.7, 1]
              })
            }
          ]}
        >
          {renderCalendar()}
        </Animated.View>
        
        {/* 하단 고정 버튼 영역 - 일주일치 다이어리 버튼만 표시
        <View style={styles.buttonFixedContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, {flex: 1}]}
            onPress={handleWeeklyDiaryPress}
          >
            <DefaultText style={styles.buttonText}>일주일치 다이어리</DefaultText>
          </TouchableOpacity>
        </View> */}
        
        {/* 메뉴 버튼 - 우측 하단 고정 */}
        {!menuVisible && (
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleMenu}
          >
            <Feather name="menu" size={24} color="#FFF" />
            {pendingRequests > 0 && (
              <View style={styles.notificationBadge}>
                <DefaultText style={styles.badgeText}>{pendingRequests}</DefaultText>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {/* 메뉴 버튼들 - 애니메이션으로 나타남 */}
        {menuVisible && (
          <View style={styles.menuButtonsContainer}>
            {/* 반투명 오버레이 */}
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={closeMenu}
            />
            
            {/* 다이어리 쓰기 버튼 (최상단) */}
            <Animated.View
              style={[
                styles.menuOptionButton,
                {
                  transform: [
                    {
                      translateY: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -400]
                      })
                    },
                    {
                      scale: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ],
                  opacity: menuButtonsAnimation
                }
              ]}
            >
              <View style={styles.menuItemRow}>
                <DefaultText style={styles.menuButtonLabel}>다이어리 쓰기</DefaultText>
                <TouchableOpacity
                  style={styles.menuIconButton}
                  onPress={handleDiaryWrite}
                >
                  <Feather name="edit-2" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            {/* 주간 분석 리포트 버튼 */}
            <Animated.View
              style={[
                styles.menuOptionButton,
                {
                  transform: [
                    {
                      translateY: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -320]  // 위치 조정 필요
                      })
                    },
                    {
                      scale: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ],
                  opacity: menuButtonsAnimation
                }
              ]}
            >
              <View style={styles.menuItemRow}>
                <DefaultText style={styles.menuButtonLabel}>감정 진단 & 맞춤 솔루션</DefaultText>
                <TouchableOpacity
                  style={styles.menuIconButton}
                  onPress={handleWeeklyDiaryPress}  // 기존 함수 재활용
                >
                  <Feather name="bar-chart-2" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>


            {/* 내 레포트함 버튼 */}
            <Animated.View
              style={[
                styles.menuOptionButton,
                {
                  transform: [
                    {
                      translateY: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -240]
                      })
                    },
                    {
                      scale: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ],
                  opacity: menuButtonsAnimation
                }
              ]}
            >
              <View style={styles.menuItemRow}>
                <DefaultText style={styles.menuButtonLabel}>내 레포트함</DefaultText>
                <TouchableOpacity
                  style={styles.menuIconButton}
                  onPress={handleReportsPage}
                >
                  <Feather name="file-text" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            {/* 부부 요청 확인 버튼 */}
            <Animated.View
              style={[
                styles.menuOptionButton,
                {
                  transform: [
                    {
                      translateY: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -160]
                      })
                    },
                    {
                      scale: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ],
                  opacity: menuButtonsAnimation
                }
              ]}
            >
              <View style={styles.menuItemRow}>
                <DefaultText style={styles.menuButtonLabel}>
                  부부 요청 확인
                  {pendingRequests > 0 && (
                    <View style={styles.menuBadge}>
                      <DefaultText style={styles.menuBadgeText}> {pendingRequests}</DefaultText>
                    </View>
                  )}
                </DefaultText>
                <TouchableOpacity
                  style={styles.menuIconButton}
                  onPress={handleSpouseRequestsPage}
                >
                  <Feather name="users" size={24} color="#FFF" />
                  {pendingRequests > 0 && (
                    <View style={styles.iconBadge}>
                      <DefaultText style={styles.iconBadgeText}>{pendingRequests}</DefaultText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            {/* 회원 프로필 버튼 */}
            <Animated.View
              style={[
                styles.menuOptionButton,
                {
                  transform: [
                    {
                      translateY: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -80]
                      })
                    },
                    {
                      scale: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ],
                  opacity: menuButtonsAnimation
                }
              ]}
            >
              <View style={styles.menuItemRow}>
                <DefaultText style={styles.menuButtonLabel}>회원 프로필</DefaultText>
                <TouchableOpacity
                  style={styles.menuIconButton}
                  onPress={handleProfilePage}
                >
                  <Feather name="user" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            {/* 돌아가기 버튼 (메뉴 버튼 자리) */}
            <Animated.View
              style={[
                styles.menuOptionButton,
                {
                  transform: [
                    {
                      translateY: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0]
                      })
                    },
                    {
                      scale: menuButtonsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ],
                  opacity: menuButtonsAnimation,
                  bottom: 20,
                  right: 20
                }
              ]}
            >
              <View style={styles.menuItemRow}>
                <DefaultText style={styles.menuButtonLabel}>돌아가기</DefaultText>
                <TouchableOpacity
                  style={[styles.menuIconButton, {backgroundColor: '#333'}]}
                  onPress={closeMenu}
                >
                  <Feather name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
        
        {/* 다이어리 미리보기 바텀 시트 */}
        <Animated.View 
          style={[
            styles.bottomSheet, 
            { height: bottomSheetHeight }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.bottomSheetHandle} />
          <ScrollView style={styles.bottomSheetContent} bounces={false}>
            <DefaultText style={styles.bottomSheetDate}>{selectedDiaryDate}</DefaultText>
            <DefaultText style={styles.bottomSheetText}>{selectedDiaryContent}</DefaultText>
            <DefaultText style={styles.bottomSheetHint}>
              
            </DefaultText>
            
            {/* 작은 버튼으로 대체 */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={directNavigate}
            >
              <DefaultText style={styles.buttonText}>다이어리 작성</DefaultText>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFF",
    position: 'relative',
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  monthText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  calendarContent: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 15,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontWeight: "bold",
  },
  week: {
    flexDirection: "row",
    marginBottom: 15,
    height: 60, // 높이를 늘려 위아래 간격 확보
  },
  day: {
    flex: 1,
    height: 60, // 날짜 셀 높이 고정
    alignItems: "center",
    borderRadius: 5,
    padding: 2,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    paddingTop: 5, // 상단 패딩 추가
  },
  dayText: {
    fontSize: 16,
    marginBottom: 4, // 숫자 아래 여백 추가
  },
  selectedDay: {
    backgroundColor: "#E0E0E0",
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  otherMonthDayText: {
    color: "#AAA",
  },
  sundayText: {
    color: "#F00",
  },
  saturdayText: {
    color: "#00F",
  },
  diaryIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5DB075",
    marginTop: 2,
    marginBottom: 2,
  },
  snippetText: {
    fontSize: 9,
    color: "#666",
    textAlign: 'center',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  buttonFixedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
    backgroundColor: "#FFF",
    marginTop: 10,
    zIndex: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
    marginTop: 10,
    backgroundColor: "#FFF",
  },
  buttonText: {
    fontSize: 14,
    color: "#000",
  },
  // 메뉴 버튼 스타일
  menuButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 90, // 메뉴 오버레이보다 낮은 zIndex
  },
  menuButtonIcon: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // 메뉴 버튼 컨테이너
  menuButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  // 메뉴 오버레이
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 95,
  },
  // 개별 메뉴 옵션 버튼 컨테이너
  menuOptionButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 110,
    width: '100%',
    paddingRight: 0, // 오른쪽 여백 없앰
  },
  // 메뉴 항목 행 (라벨과 버튼을 가로로 배열)
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // 메뉴 닫기 버튼 (원래 메뉴 버튼 위치)
  menuCloseButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 110,
    width: 56,
    height: 56,
  },
  // 메뉴 아이콘 버튼
  menuIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    position: 'relative', // 배지 위치 지정을 위해 필요
  },
  // 메뉴 버튼 라벨
  menuButtonLabel: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
    textAlign: 'right',
  },
  // 알림 배지 스타일 (메뉴 버튼 우상단에 표시)
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 95,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  // 배지 내 텍스트
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 메뉴 라벨 내 배지
  menuBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingHorizontal: 3,
  },
  // 메뉴 라벨 배지 텍스트
  menuBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 아이콘 내 배지 (회원 요청 아이콘 우상단)
  iconBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#555',
  },
  // 아이콘 배지 텍스트
  iconBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 바텀 시트 스타일
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    zIndex: 100,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#DDDDDD',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
  },
  bottomSheetContent: {
    padding: 20,
    paddingTop: 10,
  },
  bottomSheetDate: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  bottomSheetText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  bottomSheetHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  }
});