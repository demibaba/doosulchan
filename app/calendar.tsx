// app/calendar.tsx - 고급 감성 웜톤 최종 버전
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, PanResponder, Easing, Dimensions, Alert } from "react-native";
import { useRouter } from "expo-router";
import DefaultText from "./components/DefaultText";
import { auth, db } from "../config/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Feather } from '@expo/vector-icons';
import SpouseStatusBar from './components/SpouseStatusBar';

export default function CalendarPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaryDates, setDiaryDates] = useState<string[]>([]);
  const [diarySnippets, setDiarySnippets] = useState<{ [date: string]: string }>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isMonthChanging, setIsMonthChanging] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('');
  const calendarAnimation = useRef(new Animated.Value(0)).current;
  const [animationProgress, setAnimationProgress] = useState(0);
  const dragX = useRef(new Animated.Value(0)).current;
  const [nextMonth, setNextMonth] = useState<Date | null>(null);
  const [prevMonth, setPrevMonth] = useState<Date | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const { width } = Dimensions.get('window');

  // 바텀 시트 관련 상수
  const BOTTOM_SHEET_CLOSED = 0;
  const BOTTOM_SHEET_PARTIAL = 300;

  // 바텀 시트 관련 상태 및 애니메이션 값
  const [selectedDiaryContent, setSelectedDiaryContent] = useState<string>("");
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const bottomSheetHeight = useRef(new Animated.Value(0)).current;

  // 일주일치 다이어리 가져오기 버튼 핸들러
  const handleWeeklyDiaryPress = () => {
    setMenuVisible(false);
    router.push('/screens/WeeklyDiaryScreen' as any);
  };

  // 프로필 페이지 이동 핸들러
  const handleProfilePage = () => {
    setMenuVisible(false);
    router.push('/profile' as any);
  };

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

  const changeMonth = (direction: 'next' | 'prev') => {
    if (transitioning) return;
    setIsMonthChanging(true);
    
    setAnimationDirection(direction);
    const { width } = Dimensions.get('window');
    const targetValue = direction === 'next' ? -width : width;
    
    Animated.timing(dragX, {
      toValue: targetValue,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setCurrentMonth(new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + (direction === 'next' ? 1 : -1),
        1
      ));
      
      dragX.setValue(0);
      setTransitioning(false);
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

  useEffect(() => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setNextMonth(next);
    
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setPrevMonth(prev);
  }, [currentMonth]);

  // 바텀 시트 열기
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
      bottomSheetHeight.setValue(0);
      setSelectedDiaryContent("");
      setSelectedDiaryDate("");
      
      try {
        router.push(`/diary/${selectedDiaryDate}` as any);
      } catch (error) {
        console.error("페이지 이동 오류:", error);
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

  // 다이어리 쓰기 핸들러
  const handleDiaryWrite = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    setMenuVisible(false);
    router.push(`/diary/${dateParam}` as any);
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
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTransitioning) return;
        
        let currentValue = 0;
        bottomSheetHeight.stopAnimation(value => {
          currentValue = value;
        });
        
        let newHeight = currentValue - gestureState.dy;
        
        if (newHeight < 0) newHeight = 0;
        if (newHeight > BOTTOM_SHEET_PARTIAL * 1.5) newHeight = BOTTOM_SHEET_PARTIAL * 1.5;
        
        bottomSheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isTransitioning) return;
        
        let currentValue = 0;
        bottomSheetHeight.stopAnimation(value => {
          currentValue = value;
        });
        
        if (gestureState.dy < -50 || gestureState.vy < -0.5 || currentValue > BOTTOM_SHEET_PARTIAL * 1.2) {
          setIsTransitioning(true);
          
          Animated.timing(bottomSheetHeight, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            directNavigate();
            
            setTimeout(() => {
              setIsTransitioning(false);
            }, 300);
          });
          
          return;
        }
        
        if (gestureState.dy > 50 || gestureState.vy > 0.3) {
          closeBottomSheet();
        } else {
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
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
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
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      if (transitioning) return;
      dragX.setValue(0);
    })
    .onUpdate((event) => {
      if (transitioning) return;
      dragX.setValue(event.translationX);
      
      if (Math.abs(event.translationX) > 15) {
        const direction = event.translationX > 0 ? 'prev' : 'next';
        setAnimationDirection(direction);
      }
    })
    .onEnd((event) => {
      if (transitioning) return;
      
      const threshold = 60;
      
      if (Math.abs(event.translationX) > threshold) {
        if (event.translationX > 0) {
          changeMonth('prev');
        } else {
          changeMonth('next');
        }
      } else {
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 10,
          tension: 50
        }).start();
      }
    });

  // 날짜 클릭 핸들러
  const handleDatePress = async (date: Date) => {
    setSelectedDate(date);
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    if (auth.currentUser) {
      try {
        const paddedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
        const diarySnap = await getDoc(diaryRef);
        
        if (diarySnap.exists()) {
          const data = diarySnap.data();
          setSelectedDiaryContent(data.text || "");
          setSelectedDiaryDate(dateParam);
          openBottomSheet();
        } else {
          router.push(`/diary/${dateParam}` as any);
        }
      } catch (error) {
        console.error("다이어리 내용 로드 오류:", error);
        router.push(`/diary/${dateParam}` as any);
      }
    } else {
      router.push(`/diary/${dateParam}` as any);
    }
  };

  // 달력 렌더링 로직
  const renderCalendarForMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    type CalendarDay = {
      date: Date;
      currentMonth: boolean;
    };
    
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
    
    // 다음 달 날짜 채우기
    const remainingDays = 42 - daysArray.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      daysArray.push({
        date: nextMonthDate,
        currentMonth: false,
      });
    }
    
    // 7일씩 그룹화
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
        <SpouseStatusBar />
        
        {/* 달력 헤더 */}
        <View style={styles.calendarHeader}>
          <DefaultText style={styles.monthText}>
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </DefaultText>
          <DefaultText style={styles.monthSubtitle}>
            소중한 순간들을 기록해보세요
          </DefaultText>
        </View>
        
        {/* 달력 컨테이너 */}
        <View style={styles.calendarContainer}>
          {/* 이전 달 */}
          <Animated.View
            style={[
              styles.calendarPage,
              {
                transform: [{
                  translateX: dragX.interpolate({
                    inputRange: [-width, 0, width],
                    outputRange: [-width*2, -width, 0],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            {prevMonth && renderCalendarForMonth(prevMonth)}
          </Animated.View>
          
          {/* 현재 달 */}
          <Animated.View
            style={[
              styles.calendarContent,
              {
                transform: [{
                  translateX: dragX
                }]
              }
            ]}
          >
            {renderCalendarForMonth(currentMonth)}
          </Animated.View>
          
          {/* 다음 달 */}
          <Animated.View
            style={[
              styles.calendarPage,
              {
                transform: [{
                  translateX: dragX.interpolate({
                    inputRange: [-width, 0, width],
                    outputRange: [0, width, width*2],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            {nextMonth && renderCalendarForMonth(nextMonth)}
          </Animated.View>
        </View>
        
        {/* 메뉴 버튼 - 웜톤 적용 */}
        {!menuVisible && (
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleMenu}
          >
            <Feather name="menu" size={24} color="#FFFFFF" />
            {pendingRequests > 0 && (
              <View style={styles.notificationBadge}>
                <DefaultText style={styles.badgeText}>{pendingRequests}</DefaultText>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {/* 정리된 메뉴 버튼들 - 3개만! */}
        {menuVisible && (
          <View style={styles.menuButtonsContainer}>
            {/* 반투명 오버레이 */}
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={closeMenu}
            />
            
            {/* 1. 다이어리 쓰기 버튼 */}
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
                <DefaultText style={styles.menuButtonLabel}>오늘의 이야기 남기기</DefaultText>
                <TouchableOpacity
                  style={[styles.menuIconButton, { backgroundColor: '#C7A488' }]}
                  onPress={handleDiaryWrite}
                >
                  <Feather name="edit-3" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* 2. 감정 진단 & 맞춤 솔루션 버튼 */}
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
                <DefaultText style={styles.menuButtonLabel}>마음 돌아보기</DefaultText>
                <TouchableOpacity
                  style={[styles.menuIconButton, { backgroundColor: '#B5896D' }]}
                  onPress={handleWeeklyDiaryPress}
                >
                  <Feather name="heart" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* 3. 내 페이지 버튼 */}
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
                <DefaultText style={styles.menuButtonLabel}>
                  나의 공간
                  {pendingRequests > 0 && (
                    <View style={styles.menuBadge}>
                      <DefaultText style={styles.menuBadgeText}> {pendingRequests}</DefaultText>
                    </View>
                  )}
                </DefaultText>
                <TouchableOpacity
                  style={[styles.menuIconButton, { backgroundColor: '#8A817C' }]}
                  onPress={handleProfilePage}
                >
                  <Feather name="user" size={22} color="#FFFFFF" />
                  {pendingRequests > 0 && (
                    <View style={styles.iconBadge}>
                      <DefaultText style={styles.iconBadgeText}>{pendingRequests}</DefaultText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            {/* 4. 돌아가기 버튼 */}
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
                  style={[styles.menuIconButton, { backgroundColor: '#F9F6F3', borderWidth: 1, borderColor: '#E7E1DB' }]}
                  onPress={closeMenu}
                >
                  <Feather name="arrow-left" size={22} color="#C7A488" />
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
          <ScrollView style={styles.bottomSheetContent} bounces={false} showsVerticalScrollIndicator={false}>
            <DefaultText style={styles.bottomSheetDate}>{selectedDiaryDate}</DefaultText>
            <DefaultText style={styles.bottomSheetText}>{selectedDiaryContent}</DefaultText>
            <DefaultText style={styles.bottomSheetHint}>
              위로 밀어서 자세히 보기
            </DefaultText>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={directNavigate}
            >
              <Feather name="edit-3" size={16} color="#C7A488" style={{ marginRight: 8 }} />
              <DefaultText style={styles.buttonText}>이어서 쓰기</DefaultText>
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
    padding: 24,
    backgroundColor: "#FFFBF7", // 웜톤 배경
    position: 'relative',
  },
  calendarHeader: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 20,
  },
  calendarContainer: {
    flex: 1,
    position: 'relative',
  },
  calendarPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFBF7',
    zIndex: 1,
  },
  monthText: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: 'center',
    color: '#3B3029',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  monthSubtitle: {
    fontSize: 15,
    color: '#8A817C',
    textAlign: 'center',
    fontWeight: '400',
  },
  calendarContent: {
    flex: 1,
    backgroundColor: '#FFFBF7',
    overflow: 'hidden',
    zIndex: 2, 
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontWeight: "600",
    color: '#3B3029',
    fontSize: 15,
  },
  week: {
    flexDirection: "row",
    marginBottom: 8,
    height: 68,
    paddingHorizontal: 4,
  },
  day: {
    flex: 1,
    height: 68,
    alignItems: "center",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 2,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    paddingTop: 8,
    justifyContent: 'flex-start',
  },
  dayText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#3B3029',
    fontWeight: '500',
  },
  selectedDay: {
    backgroundColor: "#C7A488",
    shadowColor: '#C7A488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  otherMonthDayText: {
    color: "#8A817C",
  },
  sundayText: {
    color: "#D2691E",
  },
  saturdayText: {
    color: "#5C3A2E",
  },
  snippetText: {
    fontSize: 9,
    color: '#B5896D',
    textAlign: 'center',
    width: '100%',
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    paddingHorizontal: 2,
    fontWeight: '400',
  },
  // 메뉴 버튼 스타일 - 웜톤 적용
  menuButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C7A488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#C7A488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 90,
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
    backgroundColor: 'rgba(59, 48, 41, 0.4)',
    zIndex: 95,
  },
  // 개별 메뉴 옵션 버튼 컨테이너
  menuOptionButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    zIndex: 110,
    width: '100%',
    paddingRight: 0,
  },
  // 메뉴 항목 행
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // 메뉴 아이콘 버튼
  menuIconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#3B3029',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    position: 'relative',
  },
  // 메뉴 버튼 라벨 - 웜톤 적용
  menuButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    backgroundColor: 'rgba(59, 48, 41, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 16,
    textAlign: 'right',
    fontWeight: '500',
    shadowColor: '#3B3029',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  // 알림 배지 스타일
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D2691E',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 95,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFBF7',
  },
  // 배지 내 텍스트
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 메뉴 라벨 내 배지
  menuBadge: {
    backgroundColor: '#D2691E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  // 메뉴 라벨 배지 텍스트
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 아이콘 내 배지
  iconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#D2691E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  // 아이콘 배지 텍스트
  iconBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 바텀 시트 스타일 - 웜톤 적용
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    borderTopWidth: 1,
    borderTopColor: '#F9F6F3',
  },
  bottomSheetHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#E7E1DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  bottomSheetContent: {
    padding: 24,
    paddingTop: 16,
  },
  bottomSheetDate: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#3B3029',
  },
  bottomSheetText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    color: '#3B3029',
    fontWeight: '400',
  },
  bottomSheetHint: {
    fontSize: 13,
    color: '#8A817C',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontWeight: '400',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E7E1DB',
    borderRadius: 12,
    backgroundColor: '#F9F6F3',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 15,
    color: '#C7A488',
    fontWeight: '500',
  },
});