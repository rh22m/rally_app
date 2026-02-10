import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  PermissionsAndroid,
  Alert,
} from 'react-native';

// 네비게이션 필수 라이브러리
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// 안드로이드 안전 영역 처리
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// 아이콘
import {
  MessageCircleMore,
  Search,
  User as UserIcon,
  Bot,
  Flame,
  ChevronDown,
  X
} from 'lucide-react-native';

// 컴포넌트 임포트
import { Home } from './components/Home';
import { BottomNav } from './components/BottomNav';
import { ScoreTracker } from './components/ScoreTracker';
import { GameSummary } from './components/GameSummary';
import { OpponentEvaluation } from './components/OpponentEvaluation';
import WatchScoreTracker from './components/WatchScoreTracker';

import AIAnalysis from './Screens/AI/AIAnalysis';
import LoginScreen from './Screens/Auth/LoginScreen';
import SignUpScreen from './Screens/Auth/SignUpScreen';
import ChatListScreen from './Screens/Chat/ChatListScreen';
import ChatRoomScreen from './Screens/Chat/ChatRoomScreen';
import ProfileScreen from './Screens/Profile/ProfileScreen';
import MatchHistoryScreen from './Screens/Profile/MatchHistoryScreen';

import { PointLog } from './utils/rmrCalculator';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCKl2OZU06cWYFDkODLqsd3i4vtlGlzems",
  authDomain: "rally-app-14c24.firebaseapp.com",
  projectId: "rally-app-14c24",
  storageBucket: "rally-app-14c24.firebasestorage.app",
  messagingSenderId: "451873318217",
  appId: "1:451873318217:web:b99a488672291fa0686698",
  measurementId: "G-345DR2NF7F"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  // 앱 중복 초기화 방지
}
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'rally-app-main';

const Stack = createNativeStackNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWatch = Platform.OS === 'android' && SCREEN_WIDTH < 350;

export type Screen = 'home' | 'chat' | 'ai' | 'match' | 'profile' | 'score' | 'summary' | 'evaluation';

// -------------------------------------------------------------------------
// [TutorialOverlay] 튜토리얼 오버레이 컴포넌트
// -------------------------------------------------------------------------
interface TutorialStep {
  id: string;
  title: string;
  desc: string;
  targetTab: Screen | null;
  highlightTabId?: Screen;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '랠리(Rally)에 오신 것을 환영합니다!',
    desc: '배드민턴 파트너 찾기부터 경기 분석까지,\n랠리의 주요 기능을 소개해 드릴게요.',
    targetTab: null,
  },
  {
    id: 'match',
    title: '매칭',
    desc: '가장 먼저, 내 주변의 경기 모임을 찾거나\n직접 방을 만들어 파트너를 모집해보세요.',
    targetTab: 'match',
    highlightTabId: 'match',
  },
  {
    id: 'chat',
    title: '대화',
    desc: '매칭된 파트너들과 채팅방에서\n일정과 장소를 조율할 수 있습니다.',
    targetTab: 'chat',
    highlightTabId: 'chat',
  },
  {
    id: 'home',
    title: '경기 모드',
    desc: '경기 당일, 점수판 기능을 사용해보세요.\n승패 기록과 플레이 데이터가 자동으로 저장됩니다.',
    targetTab: 'chat',
    highlightTabId: 'home',
  },
  {
    id: 'summary',
    title: '경기 결과 & RMR',
    desc: '경기가 끝나면 상세 기록과 함께\n나의 실력 지표를 확인할 수 있습니다.',
    targetTab: 'summary',
    highlightTabId: undefined,
  },
  {
    id: 'ai',
    title: 'AI 분석 (Beta)',
    desc: 'AI가 실시간으로\n자세 분석과 훈련을 도와줍니다.',
    targetTab: 'ai',
    highlightTabId: 'ai',
  },
  {
    id: 'profile',
    title: '내 정보',
    desc: '나의 티어, 매너 점수, 경기 전적을\n한눈에 관리하고 실력을 증명하세요!',
    targetTab: 'profile',
    highlightTabId: 'profile',
  },
];

const TutorialOverlay = ({ visible, stepIndex, onNext, onSkip }: {
  visible: boolean;
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: '경기 모드', Icon: Flame },
    { id: 'chat', label: '대화', Icon: MessageCircleMore },
    { id: 'ai', label: 'AI 분석', Icon: Bot },
    { id: 'match', label: '매칭', Icon: Search },
    { id: 'profile', label: '정보', Icon: UserIcon },
  ];

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [stepIndex, visible]);

  useEffect(() => {
    if (visible && step.highlightTabId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 10, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, step]);

  if (!visible) return null;

  const activeTabIndex = tabs.findIndex(t => t.id === step.highlightTabId);
  const tabWidth = SCREEN_WIDTH / tabs.length;

  const arrowBottomPos = (60 + insets.bottom) + 5;
  const arrowLeftPos = (activeTabIndex * tabWidth) + (tabWidth / 2) - 20;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.tutorialContainer}>
        <View style={styles.tutorialBackdrop} />

        <SafeAreaView style={styles.tutorialHeader}>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>건너뛰기</Text>
            <X size={20} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={[
          styles.contentWrapper,
          step.id === 'summary' && styles.contentWrapperBottom
        ]}>
          <Animated.View style={[styles.tutorialContent, { opacity: fadeAnim }]}>
            <Text style={styles.tutorialTitle}>{step.title}</Text>
            <Text style={styles.tutorialDesc}>{step.desc}</Text>

            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>{isLastStep ? '시작하기' : '다음'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {step.highlightTabId && (
          <Animated.View
            style={[
              styles.pointerContainer,
              {
                left: arrowLeftPos,
                bottom: arrowBottomPos,
                transform: [{ translateY: bounceAnim }]
              }
            ]}
          >
            <ChevronDown size={40} color="#34D399" />
          </Animated.View>
        )}

        {step.highlightTabId && (
          <View style={[styles.replicaContainer, { paddingBottom: 2 + insets.bottom }]}>
            {tabs.map((tab) => {
              const isHighlight = tab.id === step.highlightTabId;
              return (
                <View
                  key={tab.id}
                  style={[
                    styles.replicaTabButton,
                    isHighlight ? styles.tabButtonActive : { opacity: 0 }
                  ]}
                >
                  <View>
                    <tab.Icon color={isHighlight ? '#FFFFFF' : '#6B7280'} size={28} />
                    {tab.id === 'ai' && (
                      <View style={styles.betaBadge}>
                        <Text style={styles.betaText}>BETA</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.replicaTabLabel,
                    isHighlight && styles.tabLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
};

// ==========================================
// [MainScreen] 메인 탭 화면
// ==========================================
function MainScreen({
  navigation,
  handleLogout,
  isFirstLogin,
  user,
  userProfile
}: any) {

  const [currentScreen, setCurrentScreen] = useState<Screen>('match');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [rallies, setRallies] = useState<any[]>([]);

  // 튜토리얼용 가짜 경기 데이터
  const tutorialDummyResult = {
    duration: 1540,
    team1Wins: 1,
    team2Wins: 2,
    isForced: false,
    team1Name: '상대팀',
    team2Name: '나 & 파트너',
    pointLogs: [
        { scorer: 'B', scoreA: 0, scoreB: 1, setIndex: 1, timestamp: Date.now(), duration: 10 },
        { scorer: 'B', scoreA: 0, scoreB: 2, setIndex: 1, timestamp: Date.now(), duration: 4 },
        { scorer: 'A', scoreA: 1, scoreB: 2, setIndex: 1, timestamp: Date.now(), duration: 15 },
        { scorer: 'B', scoreA: 1, scoreB: 21, setIndex: 1, timestamp: Date.now(), duration: 20 },
        { scorer: 'A', scoreA: 21, scoreB: 15, setIndex: 2, timestamp: Date.now(), duration: 25 },
        { scorer: 'B', scoreA: 20, scoreB: 20, setIndex: 3, timestamp: Date.now(), duration: 30 },
        { scorer: 'B', scoreA: 20, scoreB: 22, setIndex: 3, timestamp: Date.now(), duration: 10 },
    ] as PointLog[]
  };

  // [수정] 튜토리얼 표시 로직 개선 (지연 시간 추가)
  useEffect(() => {
    if (isFirstLogin) {
      // 화면 전환 후 안정적으로 모달을 띄우기 위해 약간의 지연(500ms)을 둡니다.
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstLogin]);

  useEffect(() => {
    if (!user) return;
    const ralliesRef = collection(db, 'artifacts', appId, 'public', 'data', 'rallies');
    const unsubscribe = onSnapshot(ralliesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRallies(list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => {
      console.error("Firestore error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const handleTutorialNext = () => {
    const nextStepIndex = tutorialStep + 1;
    if (nextStepIndex >= TUTORIAL_STEPS.length) {
      setShowTutorial(false);
      setCurrentScreen('match');
      return;
    }
    setTutorialStep(nextStepIndex);
    const nextTab = TUTORIAL_STEPS[nextStepIndex].targetTab;
    if (nextTab) {
      setCurrentScreen(nextTab);
    }
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
    setCurrentScreen('match');
  };

  const [gameResult, setGameResult] = useState({
    duration: 0,
    team1Wins: 0,
    team2Wins: 0,
    isForced: false,
    team1Name: '',
    team2Name: '',
    pointLogs: [] as PointLog[],
  });

  const handleTabChange = (tab: Screen) => {
    if (!showTutorial) {
      setCurrentScreen(tab);
    }
  };

  const goToSummary = useCallback((result: any) => {
    setGameResult(result);
    setCurrentScreen('summary');
  }, []);

  const goToScore = useCallback(() => {
    setCurrentScreen('score');
  }, []);

  const goToMatch = useCallback(() => {
    setCurrentScreen('match');
  }, []);

  const goToEvaluation = useCallback(() => {
    setCurrentScreen('evaluation');
  }, []);

  const handleCreateRally = async (title: string, location: string) => {
    if (!user || !title || !location) {
      Alert.alert('오류', '로그인이 필요하거나 정보가 부족합니다.');
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rallies'), {
        title,
        location,
        creatorUid: user.uid,
        creatorNickname: userProfile?.nickname || '익명',
        participants: [user.uid],
        createdAt: serverTimestamp(),
      });
      Alert.alert('성공', '새로운 랠리가 개설되었습니다!');
    } catch (e) {
      console.error("Create Rally Error:", e);
      Alert.alert('실패', '랠리 개설에 실패했습니다.');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'match':
        return (
          <Home
            onStartGame={goToScore}
            onGoToChat={() => handleTabChange('chat')}
            rallies={rallies}
            onCreateRally={handleCreateRally}
            user={user}
          />
        );
      case 'score':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'summary':
        return (
          <GameSummary
            onNext={goToEvaluation}
            result={showTutorial && TUTORIAL_STEPS[tutorialStep].id === 'summary' ? tutorialDummyResult : gameResult}
          />
        );
      case 'evaluation':
        return (
            <OpponentEvaluation
                onComplete={goToMatch}
                opponentName={gameResult.team1Name || '상대방'}
            />
        );
      case 'ai':
        return <AIAnalysis />;
      case 'chat':
        return <ChatListScreen />;
      case 'profile':
        return <ProfileScreen userProfile={userProfile} onLogout={handleLogout} />;
      default:
        return (
          <View style={stubStyles.stubContainer}>
            <Text style={stubStyles.stubText}>{currentScreen} 화면</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderScreen()}

      {currentScreen !== 'home' &&
        currentScreen !== 'score' &&
        currentScreen !== 'summary' &&
        currentScreen !== 'evaluation' && (
          <BottomNav
            currentTab={currentScreen}
            onTabChange={handleTabChange}
          />
        )}

      <TutorialOverlay
        visible={showTutorial}
        stepIndex={tutorialStep}
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
      />
    </SafeAreaView>
  );
}

// ==========================================
// [App] 전체 앱 진입점
// ==========================================
export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  // [상태] 첫 로그인 여부
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        try {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]);
          if (
            result['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED ||
            result['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            // 권한 거부 시 처리 (필요시)
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {
        await fetchUserProfile(currentUser.uid);
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid: string) => {
    const userDocRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'info');
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 로그인 시에는 튜토리얼을 띄우지 않도록 false 설정
      setIsFirstLogin(false);
    } catch (error: any) {
      Alert.alert("로그인 실패", error.message);
    }
  };

  // [수정] 회원가입 핸들러: 성공 시 isFirstLogin을 true로 설정하여 튜토리얼 유도
  const handleSignUp = async (email, password, nickname) => {
    if (!email || !password) {
        Alert.alert("오류", "정보가 부족합니다.");
        return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const safeEmail = email.toLowerCase();

      const profileData = {
        uid: cred.user.uid,
        email: safeEmail,
        nickname: nickname || '사용자',
        createdAt: serverTimestamp(),
        rallyCount: 0,
      };

      await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'info'), profileData);

      // 순서 중요: 프로필 설정 -> 첫 로그인 플래그 True
      setUserProfile(profileData);
      setIsFirstLogin(true);

      Alert.alert("환영합니다!", "회원가입이 완료되었습니다.");
    } catch (error: any) {
      console.error(error);
      Alert.alert("회원가입 실패", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsFirstLogin(false); // 로그아웃 시 초기화
      setAuthScreen('login');
    } catch (e) {
      console.error(e);
    }
  };

  if (isWatch) {
    return <WatchScoreTracker />;
  }

  if (initializing) {
    return (
      <View style={stubStyles.stubContainer}>
        <Text style={stubStyles.stubText}>RALLY SYSTEM LOADING...</Text>
      </View>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#111827" />
          {authScreen === 'login' ? (
            <LoginScreen
              onGoToSignUp={() => setAuthScreen('signup')}
              onLogin={handleLogin}
            />
          ) : (
            <SignUpScreen
              onGoToLogin={() => setAuthScreen('login')}
              onSignUp={handleSignUp}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
          }}
        >
          {/* [중요] Main 화면에 isFirstLogin 상태를 props로 전달 */}
          <Stack.Screen name="Main">
            {(props) => (
              <MainScreen
                {...props}
                handleLogout={handleLogout}
                isFirstLogin={isFirstLogin}
                user={user}
                userProfile={userProfile}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  // --- Tutorial Overlay Styles ---
  tutorialContainer: {
    flex: 1,
  },
  tutorialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tutorialHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 20,
    width: '100%',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skipText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 22,
    paddingBottom: 100,
  },
  contentWrapperBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  tutorialContent: {
    width: '80%',
    backgroundColor: '#1F2937',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34D399',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialDesc: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: '#34D399',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointerContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 20,
  },
  // --- Replica Tab Bar Styles ---
  replicaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  replicaTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 20,
    height: 60,
    overflow: 'hidden',
  },
  tabButtonActive: {
    backgroundColor: '#34D399',
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  replicaTabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  betaBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
});

const stubStyles = StyleSheet.create({
  stubContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  stubText: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
});