// rally_app/Screens/AI/AIAnalysis.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, PermissionsAndroid, Platform, StatusBar,
  Alert, Animated, Vibration, ScrollView, Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Bot, Activity, Maximize2, Move, Zap, RefreshCcw, Square, History,
  Clock, CheckCircle, XCircle, Dumbbell, Play, Trash2, FileText,
  Smartphone, PersonStanding, ScanEye, Timer
} from 'lucide-react-native';
import { htmlContent } from './poseHtml';

// --- 설정값 ---
const ANALYSIS_DURATION = 20; 
const SMOOTHING_FACTOR = 0.7;
const SPEED_BUFFER_SIZE = 5;
const USER_HEIGHT_CM = 175;
const ARM_LENGTH_RATIO = 0.45;
const PIXEL_TO_REAL_SCALE = (USER_HEIGHT_CM * ARM_LENGTH_RATIO) / 200;

type AnalysisMode = 'SWING' | 'LUNGE';

interface ResultData {
  value: number; subValue?: number; isGood: boolean; type: AnalysisMode; grade?: string; score?: number;
}

interface AnalysisReport {
  id: string; date: string; mode: AnalysisMode; avgScore: number; pros: string[]; cons: string[]; training: string; totalCount: number; maxRecord: number;
}

export default function AIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('SWING');

  // 실시간 데이터
  const [swingSpeed, setSwingSpeed] = useState(0);
  const [currentElbowAngle, setCurrentElbowAngle] = useState(0);
  const [currentKneeAngle, setCurrentKneeAngle] = useState(0);
  
  // 측정 요소
  const [swingScore, setSwingScore] = useState(0);
  const [lungeTime, setLungeTime] = useState(0);
  const [lungeStability, setLungeStability] = useState(100);

  // 타이머 및 상태
  const [timeLeft, setTimeLeft] = useState(ANALYSIS_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);

  // 애니메이션
  const [lastResult, setLastResult] = useState<ResultData | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // 데이터 누적 Refs
  const sessionDataRef = useRef({
    swingSpeeds: [] as number[],
    swingAngles: [] as number[],
    lungeAngles: [] as number[],
    lungeStabilities: [] as number[],
    count: 0
  });

  // 로직 Refs
  const prevPos = useRef<{ x: number, y: number, time: number, speed: number } | null>(null);
  const speedBuffer = useRef<number[]>([]);
  const webviewRef = useRef<WebView>(null);
  const isSwingingRef = useRef(false);
  const tempMaxSpeedRef = useRef(0);
  const angleAtMaxRef = useRef(0);
  const isLungingRef = useRef(false);
  const lungeStartTimeRef = useRef(0);

  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          if (granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED) setHasPermission(true);
        } catch (err) { console.warn(err); }
      } else { setHasPermission(true); }
    };
    requestPermission();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing && isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft((prev) => prev - 1); }, 1000);
    } else if (isAnalyzing && isTimerRunning && timeLeft === 0) {
      finishAnalysis();
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isTimerRunning, timeLeft]);

  const enterAnalysisMode = () => {
    if (hasPermission) {
      setTimeLeft(ANALYSIS_DURATION); setIsTimerRunning(false);
      sessionDataRef.current = { swingSpeeds: [], swingAngles: [], lungeAngles: [], lungeStabilities: [], count: 0 };
      setLastResult(null); setIsAnalyzing(true);
    } else { Alert.alert("알림", "카메라 권한이 필요합니다."); }
  };

  const startTimer = () => { setIsTimerRunning(true); Vibration.vibrate(100); };

  const finishAnalysis = () => {
    setIsAnalyzing(false); setIsTimerRunning(false);
    const newReport = createReport();
    setHistory(prev => [newReport, ...prev]);
    setSelectedReport(newReport); setShowReport(true);
  };

  // ★ [등급별 색상 반환 함수]
  const getGradeColor = (grade?: string) => {
    switch (grade) {
        case 'SS': return '#FFD700'; // Gold
        case 'S': return '#A78BFA';  // Purple
        case 'A': return '#60A5FA';  // Blue
        case 'B': return '#34D399';  // Green
        default: return '#9CA3AF';   // Gray (C)
    }
  };

  const createReport = (): AnalysisReport => {
    const data = sessionDataRef.current;
    
    let report: AnalysisReport = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      mode: mode,
      avgScore: 0,
      pros: [],
      cons: [],
      training: '',
      totalCount: data.count,
      maxRecord: 0
    };

    if (data.count === 0) {
        report.training = "측정된 데이터가 없습니다. 동작을 조금 더 크게 수행해주세요.";
        return report;
    }

    if (mode === 'SWING') {
      const maxSpeed = Math.max(...data.swingSpeeds);
      const avgSpeed = data.swingSpeeds.reduce((a, b) => a + b, 0) / data.swingSpeeds.length;
      const avgAngle = data.swingAngles.reduce((a, b) => a + b, 0) / data.swingAngles.length;

      report.maxRecord = maxSpeed;
      report.avgScore = Math.min(100, Math.floor((avgSpeed * 0.7) + (avgAngle >= 160 ? 30 : avgAngle / 180 * 20)));

      // ★ [리포트 기준] 동호인 평균 기준 반영
      if (maxSpeed >= 110) report.pros.push("상급자 수준의 강력한 스매시 파워입니다.");
      else if (maxSpeed >= 90) report.pros.push("동호인 평균 이상의 스윙 스피드입니다.");
      else if (maxSpeed >= 60) report.pros.push("스윙 메커니즘이 안정적입니다.");
      
      if (avgAngle >= 165) report.pros.push("임팩트 타점이 높고 팔을 완벽하게 뻗습니다.");
      else if (avgAngle >= 150) report.pros.push("타점 높이가 준수합니다.");

      if (avgSpeed < 60) report.cons.push("스윙 속도가 다소 느립니다. 손목 스냅을 더 활용하세요.");
      if (avgAngle < 150) report.cons.push(`팔이 구부러져 있습니다. (평균 ${Math.floor(avgAngle)}°)`);
      
      if (avgAngle < 160) report.training = "💡 [타점 교정] 수건을 이용해 머리 위 가장 높은 곳에서 '탁' 소리가 나게 터는 연습을 하세요.";
      else if (avgSpeed < 90) report.training = "💡 [파워 강화] 라켓 커버를 씌우고 빈 스윙 연습을 하여 손목 근력을 키우세요.";
      else report.training = "💡 [실전 감각] 폼이 완벽합니다. 이제 풋워크와 연결하는 복합 훈련을 추천합니다.";

    } else { // LUNGE
      const avgStab = data.lungeStabilities.reduce((a, b) => a + b, 0) / data.lungeStabilities.length;
      const avgAngle = data.lungeAngles.reduce((a, b) => a + b, 0) / data.lungeAngles.length;
      
      report.maxRecord = avgStab;
      report.avgScore = Math.floor(avgStab);

      if (avgStab >= 90) report.pros.push("코어 밸런스가 매우 훌륭하여 흔들림이 없습니다.");
      if (avgAngle >= 85 && avgAngle <= 105) report.pros.push("무릎 각도가 90도 근처로 이상적입니다.");

      if (avgAngle < 85) report.cons.push("무릎이 과도하게 굽혀져 무릎 부상 위험이 있습니다.");
      if (avgStab < 80) report.cons.push("자세를 유지할 때 상체의 흔들림이 감지되었습니다.");

      if (avgStab < 90) report.training = "💡 [밸런스] 런지 자세에서 눈을 감고 10초 버티기 훈련을 해보세요.";
      else report.training = "💡 [순발력] 제자리 점프 런지(Jump Lunge)로 하체 근지구력을 키우세요.";
    }

    if (report.pros.length === 0) report.pros.push("꾸준한 연습이 가장 큰 무기입니다!");
    if (report.cons.length === 0) report.cons.push("특별한 단점이 발견되지 않았습니다. 훌륭합니다!");

    return report;
  };

  const deleteHistory = (id: string) => { Alert.alert("삭제", "이 기록을 삭제하시겠습니까?", [{ text: "취소", style: "cancel" }, { text: "삭제", style: 'destructive', onPress: () => setHistory(prev => prev.filter(item => item.id !== id)) }]); };
  const toggleCamera = () => webviewRef.current?.postMessage(JSON.stringify({ type: 'switchCamera' }));
  
  const toggleMode = () => { 
    if (isTimerRunning) {
        Alert.alert("알림", "분석 중에는 모드를 변경할 수 없습니다.\n먼저 종료해 주세요.");
        return;
    }
    setMode(prev => prev === 'SWING' ? 'LUNGE' : 'SWING'); 
    setLastResult(null); popAnim.setValue(0); 
    setSwingScore(0); setLungeTime(0); setLungeStability(100); 
  };
  
  const triggerResultAnimation = () => { popAnim.setValue(0); Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start(); };
  const triggerSmashEffect = () => { Vibration.vibrate(100); flashAnim.setValue(1); Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };

  const handleMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.type === 'log') return;
      if (parsed.type === 'poseData') {
        const rawX = parsed.x; const rawY = parsed.y; const currentTime = parsed.timestamp;
        const elbowAngle = Number(parsed.elbowAngle || 0); const kneeAngle = Number(parsed.kneeAngle || 0);
        setCurrentElbowAngle(elbowAngle); setCurrentKneeAngle(kneeAngle);

        if (mode === 'SWING') {
          if (!prevPos.current) { prevPos.current = { x: rawX, y: rawY, time: currentTime, speed: 0 }; return; }
          const smoothX = prevPos.current.x * SMOOTHING_FACTOR + rawX * (1 - SMOOTHING_FACTOR);
          const smoothY = prevPos.current.y * SMOOTHING_FACTOR + rawY * (1 - SMOOTHING_FACTOR);
          const dx = smoothX - prevPos.current.x; const dy = smoothY - prevPos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          let timeDiff = (currentTime - prevPos.current.time) / 1000; if (timeDiff < 0.03) timeDiff = 0.03;
          let currentSpeed = 0;
          if (timeDiff < 0.5) {
            const pixelSpeed = distance / timeDiff; currentSpeed = pixelSpeed * 40 * PIXEL_TO_REAL_SCALE;
            if (currentSpeed > 350) currentSpeed = 350;
          }
          speedBuffer.current.push(currentSpeed);
          if (speedBuffer.current.length > SPEED_BUFFER_SIZE) speedBuffer.current.shift();
          const avgSpeed = speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length;
          setSwingSpeed(Math.floor(avgSpeed));

          let tempScore = (avgSpeed / 2) + (elbowAngle > 160 ? 50 : (elbowAngle / 180 * 40));
          if (tempScore > 100) tempScore = 100;
          setSwingScore(Math.floor(tempScore));

          if (avgSpeed > 30 && isTimerRunning) {
            if (!isSwingingRef.current) { isSwingingRef.current = true; tempMaxSpeedRef.current = 0; }
            if (avgSpeed > tempMaxSpeedRef.current) { tempMaxSpeedRef.current = avgSpeed; angleAtMaxRef.current = elbowAngle; }
          } else {
            if (isSwingingRef.current) {
              isSwingingRef.current = false;
              // ★ [데이터 수집] 기준 30km/h (테스트 용이)
              if (tempMaxSpeedRef.current > 30) {
                const maxSpeed = tempMaxSpeedRef.current;
                
                sessionDataRef.current.swingSpeeds.push(maxSpeed);
                sessionDataRef.current.swingAngles.push(angleAtMaxRef.current);
                sessionDataRef.current.count += 1;
                
                // ★ [이펙트] 기준 90km/h (동호인 A등급 기준)
                if (maxSpeed >= 90) triggerSmashEffect();

                // ★ [등급 산정] 동호인 평균 기준 적용
                // SS: 140 (선수급) / S: 110 (고수) / A: 90 (중수) / B: 60 (초보)
                let grade = "C";
                if (maxSpeed >= 140) grade = "SS";
                else if (maxSpeed >= 110) grade = "S";
                else if (maxSpeed >= 90) grade = "A";
                else if (maxSpeed >= 60) grade = "B";

                const finalScore = Math.min(100, Math.floor((maxSpeed * 0.6) + (angleAtMaxRef.current >= 165 ? 40 : 20)));
                
                setLastResult({ 
                    value: Math.floor(maxSpeed), 
                    subValue: angleAtMaxRef.current, 
                    isGood: angleAtMaxRef.current >= 165, 
                    type: 'SWING', 
                    grade: grade,
                    score: finalScore 
                });
                triggerResultAnimation();
              }
            }
          }
          prevPos.current = { x: smoothX, y: smoothY, time: currentTime, speed: currentSpeed };
        }

        // LUNGE 로직 유지
        if (mode === 'LUNGE') {
          const LUNGE_MIN_ANGLE = 70; const LUNGE_MAX_ANGLE = 130;
          if (kneeAngle >= LUNGE_MIN_ANGLE && kneeAngle <= LUNGE_MAX_ANGLE) {
            if (!isLungingRef.current) { isLungingRef.current = true; lungeStartTimeRef.current = currentTime; }
            const duration = (currentTime - lungeStartTimeRef.current) / 1000;
            setLungeTime(Number(duration.toFixed(1)));
            const deviation = Math.abs(90 - kneeAngle);
            const stability = Math.max(0, 100 - (deviation * 1.5));
            setLungeStability(Math.floor(stability));
          } else {
            if (isLungingRef.current) {
              isLungingRef.current = false;
              if (lungeTime > 1.0 && isTimerRunning) {
                sessionDataRef.current.lungeAngles.push(kneeAngle);
                sessionDataRef.current.lungeStabilities.push(lungeStability);
                sessionDataRef.current.count += 1;
                setLastResult({ value: Math.floor(kneeAngle), subValue: lungeTime, isGood: lungeStability > 80, type: 'LUNGE', score: lungeStability });
                triggerResultAnimation();
              }
              setLungeTime(0);
            }
          }
        }
      }
    } catch (e) { }
  };

  if (isAnalyzing) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashAnim, zIndex: 5 }]} pointerEvents="none" />
        <WebView ref={webviewRef} style={styles.webview} source={{ html: htmlContent, baseUrl: 'https://localhost' }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback={true} onMessage={handleMessage} />

        <View style={styles.topControlContainer}>
          <TouchableOpacity onPress={toggleMode} style={styles.modeBadge}>
            {mode === 'SWING' ? <Zap size={14} color="#F472B6" /> : <Move size={14} color="#60A5FA" />}
            <Text style={styles.modeText}>{mode === 'SWING' ? '스윙 모드' : '런지 모드'}</Text>
          </TouchableOpacity>
          <View style={[styles.timerBadge, isTimerRunning && { borderColor: '#FCD34D', borderWidth: 1, backgroundColor: 'rgba(252, 211, 77, 0.2)' }]}>
            <Clock size={14} color={isTimerRunning ? "#FCD34D" : "#9CA3AF"} />
            <Text style={[styles.timerText, { color: isTimerRunning ? "#FCD34D" : "#9CA3AF" }]}>
              {timeLeft}초 {isTimerRunning ? "측정중" : "대기"}
            </Text>
          </View>
        </View>

        <View style={styles.statsOverlay}>
          {mode === 'SWING' ? (
            <>
              <View style={styles.statBox}><Activity size={20} color="#F472B6" /><View style={styles.statContent}><Text style={styles.statLabel}>속도</Text><Text style={styles.statValue}>{swingSpeed}</Text></View></View>
              <View style={styles.divider} />
              <View style={styles.statBox}><Maximize2 size={20} color="#A78BFA" /><View style={styles.statContent}><Text style={styles.statLabel}>각도</Text><Text style={styles.statValue}>{Math.floor(currentElbowAngle)}°</Text></View></View>
              <View style={styles.divider} />
              <View style={styles.statBox}><History size={20} color="#FCD34D" /><View style={styles.statContent}><Text style={styles.statLabel}>점수</Text><Text style={styles.statValue}>{swingScore}</Text></View></View>
            </>
          ) : (
            <>
              <View style={styles.statBox}><Move size={20} color="#60A5FA" /><View style={styles.statContent}><Text style={styles.statLabel}>각도</Text><Text style={styles.statValue}>{Math.floor(currentKneeAngle)}°</Text></View></View>
              <View style={styles.divider} />
              <View style={styles.statBox}><History size={20} color="#A78BFA" /><View style={styles.statContent}><Text style={styles.statLabel}>시간</Text><Text style={styles.statValue}>{lungeTime}<Text style={{fontSize: 14}}>s</Text></Text></View></View>
              <View style={styles.divider} />
              <View style={styles.statBox}><Activity size={20} color="#34D399" /><View style={styles.statContent}><Text style={styles.statLabel}>안정성</Text><Text style={styles.statValue}>{lungeStability}</Text></View></View>
            </>
          )}
        </View>

        {lastResult && (
          // ★ 등급별 테두리 색상 적용
          <Animated.View style={[
              styles.feedbackCard, 
              { 
                borderColor: mode === 'SWING' ? getGradeColor(lastResult.grade) : (lastResult.isGood ? '#34D399' : '#EF4444'),
                transform: [{ scale: popAnim }], 
                opacity: popAnim 
              }
          ]}>
            <View style={styles.feedbackHeader}>
              <Text style={[
                  styles.feedbackTitle,
                  // 텍스트 색상도 등급 색상으로 강조
                  { color: mode === 'SWING' ? getGradeColor(lastResult.grade) : 'white' }
              ]}>
                  {lastResult.grade ? `${lastResult.grade} CLASS` : (lastResult.isGood ? "GOOD!" : "BAD")}
              </Text>
              <Text style={{ color: 'white', fontSize: 16 }}>점수: {lastResult.score || lastResult.value}점</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomControlContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <RefreshCcw size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#EF4444', paddingHorizontal: 20 }]} onPress={() => { setIsAnalyzing(false); setIsTimerRunning(false); setSwingSpeed(0); setLastResult(null); }}>
            <Square size={20} color="white" fill="white" />
            <Text style={styles.controlButtonText}>종료</Text>
          </TouchableOpacity>

          {!isTimerRunning && (
            <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#FCD34D' }]} onPress={startTimer}>
              <Play size={24} color="black" fill="black" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (showReport && selectedReport) {
    return (
      <Modal animationType="slide" transparent={false} visible={showReport}>
        <View style={styles.reportContainer}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>AI 분석 리포트</Text>
              <Text style={styles.reportDate}>{selectedReport.date} ({selectedReport.mode === 'SWING' ? '스윙' : '런지'})</Text>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>종합 점수</Text>
              <Text style={styles.scoreValue}>{selectedReport.avgScore}<Text style={{ fontSize: 30 }}>점</Text></Text>
              <View style={styles.countBadge}>
                  <Text style={{ color: '#111827', fontWeight: 'bold' }}>
                      {selectedReport.totalCount}회 수행 | 최고기록: {Math.floor(selectedReport.maxRecord)}{selectedReport.mode==='SWING'?'km/h':'점'}
                  </Text>
              </View>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🔥 장점 (Pros)</Text>
              {selectedReport.pros.length > 0 ? selectedReport.pros.map((item, idx) => <View key={idx} style={styles.listItem}><CheckCircle size={20} color="#34D399" /><Text style={styles.listText}>{item}</Text></View>) : <Text style={styles.emptyText}>노력이 필요합니다.</Text>}
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>⚠️ 보완점 (Cons)</Text>
              {selectedReport.cons.length > 0 ? selectedReport.cons.map((item, idx) => <View key={idx} style={styles.listItem}><XCircle size={20} color="#EF4444" /><Text style={styles.listText}>{item}</Text></View>) : <Text style={styles.emptyText}>완벽합니다.</Text>}
            </View>
            <View style={[styles.sectionContainer, { backgroundColor: '#1F2937', borderColor: '#FCD34D', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}><Dumbbell size={24} color="#FCD34D" /><Text style={[styles.sectionTitle, { color: '#FCD34D', marginBottom: 0, marginLeft: 8 }]}>추천 트레이닝</Text></View>
              <Text style={styles.trainingText}>{selectedReport.training}</Text>
            </View>
            <TouchableOpacity style={styles.closeReportButton} onPress={() => setShowReport(false)}>
              <Text style={styles.closeReportText}>닫기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.logoSection}>
          <Bot size={60} color="#34D399" style={{ marginBottom: 16 }} />
          <Text style={styles.mainTitle}>AI 영상 분석</Text>
          <Text style={styles.mainSubTitle}>스윙 속도, 각도, 자세를 실시간으로 분석하여{"\n"}전문적인 피드백을 제공합니다.</Text>
        </View>

        <TouchableOpacity style={styles.mainStartButton} onPress={enterAnalysisMode} activeOpacity={0.8}>
          <Text style={styles.mainStartButtonText}>분석 시작</Text>
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>📌 정확한 분석을 위한 가이드</Text>
          <View style={styles.stepItem}>
            <View style={styles.iconBox}><Smartphone size={24} color="#34D399" /></View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText}>삼각대를 이용해 휴대폰을 <Text style={styles.boldWhite}>고정</Text>해 주세요.</Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.iconBox}><PersonStanding size={24} color="#60A5FA" /></View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText}>머리부터 발끝까지 <Text style={styles.boldWhite}>전신</Text>이 화면에 나와야 합니다.</Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.iconBox}><ScanEye size={24} color="#A78BFA" /></View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText}>정면보다는 <Text style={styles.boldWhite}>측면</Text>에서 촬영할 때 가장 정확합니다.</Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.iconBox}><Timer size={24} color="#FCD34D" /></View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText}>재생 버튼을 누르면 <Text style={{ fontWeight: 'bold', color: '#FCD34D' }}>20초간 측정</Text>이 시작됩니다.</Text>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>📜 최근 분석 내역</Text>
          {history.length > 0 ? (
            history.map((item) => (
              <View key={item.id} style={styles.historyItemCard}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedReport(item); setShowReport(true); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.mode === 'SWING' ? <Zap size={16} color="#F472B6" /> : <Move size={16} color="#60A5FA" />}
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                    <Text style={styles.historyScore}>{item.avgScore}점</Text>
                    <Text style={styles.historyCount}>{item.totalCount}회 수행</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteHistory(item.id)}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.historyPlaceholder}>
              <FileText size={24} color="#4B5563" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#6B7280' }}>아직 저장된 기록이 없습니다.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24, paddingTop: 40 },
  logoSection: { alignItems: 'center', marginBottom: 30 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  mainSubTitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  mainStartButton: { backgroundColor: '#34D399', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 30 },
  mainStartButtonText: { color: '#111827', fontSize: 18, fontWeight: 'bold' },
  tipCard: { backgroundColor: '#1F2937', padding: 24, borderRadius: 20, marginBottom: 30 },
  tipTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepTextBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepText: { color: '#D1D5DB', fontSize: 14, flex: 1, lineHeight: 20 },
  boldWhite: { fontWeight: 'bold', color: 'white' },
  historySection: { marginBottom: 40 },
  historyTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  historyPlaceholder: { backgroundColor: '#1F2937', height: 100, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#374151' },
  historyItemCard: { backgroundColor: '#1F2937', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { color: '#D1D5DB', fontSize: 14, fontWeight: 'bold' },
  historyScore: { color: '#34D399', fontSize: 18, fontWeight: 'bold' },
  historyCount: { color: '#9CA3AF', fontSize: 14 },
  deleteButton: { padding: 8 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  topControlContainer: { position: 'absolute', top: 50, alignSelf: 'center', alignItems: 'center', gap: 12, zIndex: 10 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(31, 41, 55, 0.9)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 8 },
  modeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  timerText: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 14 },
  statsOverlay: { position: 'absolute', top: 150, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(31, 41, 55, 0.85)', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statContent: { alignItems: 'center' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginBottom: 4 },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  divider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.2)' },
  
  // ★ 등급별 색상 적용을 위해 borderWidth를 3으로 설정
  feedbackCard: { position: 'absolute', bottom: 150, alignSelf: 'center', width: '70%', backgroundColor: 'rgba(17, 24, 39, 0.95)', borderRadius: 20, padding: 20, borderWidth: 3, alignItems: 'center' },
  feedbackHeader: { alignItems: 'center', gap: 5 },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  bottomControlContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  controlButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: 14, borderRadius: 30, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  controlButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  reportContainer: { flex: 1, backgroundColor: '#111827', padding: 24 },
  reportHeader: { marginTop: 40, marginBottom: 30 },
  reportTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  reportDate: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  scoreCard: { backgroundColor: '#34D399', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  scoreLabel: { color: '#064E3B', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  scoreValue: { color: '#064E3B', fontSize: 48, fontWeight: 'bold' },
  countBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  sectionContainer: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  listItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  listText: { color: '#D1D5DB', fontSize: 15, flex: 1, lineHeight: 22 },
  emptyText: { color: '#6B7280', fontStyle: 'italic' },
  trainingText: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  closeReportButton: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  closeReportText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});