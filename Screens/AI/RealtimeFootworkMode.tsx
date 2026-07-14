import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { ChevronLeft, RotateCcw, Square, CheckCircle, XCircle, Dumbbell, Activity, Compass, Flame, Move, User, Info, X } from 'lucide-react-native';
import Orientation from 'react-native-orientation-locker';
import { useNavigation } from '@react-navigation/native';

import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

import { footworkSetHtml } from './realtimeFootworkHtml';
import { summarizeFootworkSet, StepEvent } from './realtimeFootworkEngine';
import { evaluateBadmintonAiSet, PoseSnapshot } from './badmintonAiEvaluator';
// ✅ 통합된 원근감 구역 판별 로직 임포트
import { getPerspectiveZone } from './badmintonKinematicAnalyzer';

const LANDMARK_NAMES = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear', 'mouth_left', 'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index', 'right_index', 'left_thumb', 'right_thumb',
  'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index'
];

function mapLandmarks(arr: any[]) {
  if (!arr || !arr.length) return {};
  const res: any = {};
  arr.forEach((pt, i) => { if (LANDMARK_NAMES[i]) res[LANDMARK_NAMES[i]] = pt; });
  return res;
}

function distance(a: any, b: any) {
  if (!a || !b) return 0;
  const dx = (a.x || 0) - (b.x || 0);
  const dy = (a.y || 0) - (b.y || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: any, b: any) {
  if (!a || !b) return undefined;
  return { x: ((a.x || 0) + (b.x || 0)) / 2, y: ((a.y || 0) + (b.y || 0)) / 2 };
}

function isSplitStepCandidate(snapshots: PoseSnapshot[]) {
  if (snapshots.length < 3) return false;
  const prev = snapshots[snapshots.length - 3].landmarks;
  const cur = snapshots[snapshots.length - 2].landmarks;
  const next = snapshots[snapshots.length - 1].landmarks;

  const prevAnkleWidth = distance(prev.left_ankle, prev.right_ankle);
  const curAnkleWidth = distance(cur.left_ankle, cur.right_ankle);
  const nextAnkleWidth = distance(next.left_ankle, next.right_ankle);
  const hipPrev = midpoint(prev.left_hip, prev.right_hip);
  const hipCur = midpoint(cur.left_hip, cur.right_hip);
  const hipNext = midpoint(next.left_hip, next.right_hip);

  const stanceExpansion = curAnkleWidth > prevAnkleWidth * 1.06 && curAnkleWidth >= nextAnkleWidth * 0.96;
  const smallHop = !!hipPrev && !!hipCur && !!hipNext && (hipCur.y < hipPrev.y - 0.008) && (hipNext.y >= hipCur.y);
  return stanceExpansion || smallHop;
}

export default function RealtimeFootworkMode({ onBack }: { onBack: () => void }) {
  const navigation = useNavigation();

  const [cameraState, setCameraState] = useState<'LOADING' | 'READY' | 'RUNNING' | 'FINISHED'>('LOADING');
  const [courtDetected, setCourtDetected] = useState(false);
  const [hasWarnedNoCourt, setHasWarnedNoCourt] = useState(false);
  const [status, setStatus] = useState('가로 모드로 전환하여 카메라를 준비합니다.');
  const [report, setReport] = useState<any>(null);
  const [currentDisplayZone, setCurrentDisplayZone] = useState('CENTER');

  const [showGuideModal, setShowGuideModal] = useState(false);

  const webviewRef = useRef<WebView>(null);
  const infiniteEventsRef = useRef<StepEvent[]>([]);
  const poseSnapshotsRef = useRef<PoseSnapshot[]>([]);

  const startedAtRef = useRef(Date.now());
  const lastZoneRef = useRef('CENTER');
  const zoneEnteredAtRef = useRef(0);
  const lastNonCenterAtRef = useRef(0);

  const centerEnteredAtRef = useRef(0);
  const lastCenterStableAtRef = useRef(0);

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) parent.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      if (parent) parent.setOptions({ tabBarStyle: undefined });
      Orientation.lockToPortrait();
    };
  }, [navigation]);

  useEffect(() => {
    if (report) Orientation.lockToPortrait();
    else Orientation.lockToLandscapeRight();
  }, [report]);

  const handlePoseMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);

      if (parsed.type === 'CAMERA_READY') {
        setCameraState('READY');
        setStatus('시작 버튼을 누르고 코트 안으로 이동해 자세를 잡으세요.');
      } else if (parsed.type === 'COURT_DETECTED') {
        setCourtDetected(true);
      } else if (parsed.type === 'poseMetrics') {

        if (cameraState === 'RUNNING') {
           const now = parsed.ts;
           let zone = 'UNKNOWN';

           if (parsed.landmarks) {
               const mappedLandmarks = mapLandmarks(parsed.landmarks);

               // ✅ AI 역학 엔진의 통합된 원근감 로직으로 구역(Zone) 판별
               const perspectiveResult = getPerspectiveZone(mappedLandmarks);
               zone = perspectiveResult.zone;

               const snapshot: PoseSnapshot = {
                   ts: now,
                   landmarks: mappedLandmarks,
                   court: { left: 0, right: 1, top: 0, bottom: 1, centerX: 0.5, serviceY: 0.5, confidence: parsed.courtConfidence }
               };
               poseSnapshotsRef.current.push(snapshot);
               if (poseSnapshotsRef.current.length > 2000) poseSnapshotsRef.current.shift();
           }

           if (zone === 'UNKNOWN') return;
           if (zone !== currentDisplayZone) setCurrentDisplayZone(zone);

           if (!lastZoneRef.current || lastZoneRef.current === 'UNKNOWN') {
             lastZoneRef.current = zone;
             zoneEnteredAtRef.current = now;
             if (zone !== 'CENTER') lastNonCenterAtRef.current = now;
             return;
           }

           if (zone !== lastZoneRef.current) {
             const dwellMs = Math.max(120, now - zoneEnteredAtRef.current);

             infiniteEventsRef.current.push({
               ts: now,
               zone: lastZoneRef.current as any,
               dwellMs,
               splitStepDetected: isSplitStepCandidate(poseSnapshotsRef.current),
               reactionMs: lastCenterStableAtRef.current ? now - lastCenterStableAtRef.current : undefined,
               recoveryToCenterMs: zone === 'CENTER' && lastNonCenterAtRef.current ? now - lastNonCenterAtRef.current : undefined,
               kneeAngleMin: parsed.kneeAngleMin,
               trunkLeanDeg: parsed.trunkLeanDeg,
               balanceScore: parsed.balanceScore
             });

             if (zone !== 'CENTER') lastNonCenterAtRef.current = now;
             lastZoneRef.current = zone;
             zoneEnteredAtRef.current = now;
           }

           if (zone === 'CENTER') {
               if (lastZoneRef.current !== 'CENTER') {
                   centerEnteredAtRef.current = now;
                   lastCenterStableAtRef.current = now;
               } else if (now - centerEnteredAtRef.current > 240) {
                   lastCenterStableAtRef.current = now;
               }
           }
        }
      }
    } catch (e) {}
  };

  const startSet = () => {
    startedAtRef.current = Date.now();
    infiniteEventsRef.current = [];
    poseSnapshotsRef.current = [];
    setCameraState('RUNNING');
    setStatus('분석이 진행 중입니다. 카메라 안쪽 코트에서 자유롭게 움직이세요.');
    webviewRef.current?.injectJavaScript('window.__RECO_FOOTWORK_START();');
  };

  const handleStartPress = () => {
    if (!courtDetected && !hasWarnedNoCourt) {
       Alert.alert(
         '코트 인식 미흡',
         '코트 라인이 완벽히 일치하지 않습니다.\n그래도 분석을 시작하시겠습니까?',
         [
           { text: '취소', style: 'cancel' },
           { text: '시작', style: 'destructive', onPress: () => {
               setHasWarnedNoCourt(true);
               setShowGuideModal(true);
           }}
         ]
       );
       return;
    }
    setShowGuideModal(true);
  };

  const confirmAndStart = () => {
      setShowGuideModal(false);
      startSet();
  };

  const stopSet = async () => {
    setCameraState('FINISHED');
    webviewRef.current?.injectJavaScript('window.__RECO_FOOTWORK_STOP();');
    setStatus('초정밀 랠리 데이터를 분석하고 있습니다...');

    const localSummary = summarizeFootworkSet({
      sessionId: `reco_fw_${Date.now()}`,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      calibrationScore: 0.8,
      conditions: { fullBodyVisible: true, singlePlayerOnly: true, indoorLightingOk: true, courtDetected: true },
      events: infiniteEventsRef.current
    });

    const aiResult = evaluateBadmintonAiSet({
      snapshots: poseSnapshotsRef.current,
      events: infiniteEventsRef.current,
      courtConfidence: 0.8
    });

    setReport({ ...localSummary, aiEvaluation: aiResult });

    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore(getApp());
        const appId = 'com.recobystackapp';

        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'footworkSets'), {
          id: Date.now().toString(),
          date: new Date().toLocaleString(),
          mode: 'REALTIME_MATCH',
          avgScore: localSummary.totalScore,
          maxRecord: localSummary.eventCount,
          summary: localSummary,
          aiEvaluation: aiResult,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("실시간 반코트 분석 저장 오류:", error);
    }
  };

  return (
    <Modal
      visible={true}
      transparent={false}
      animationType="fade"
      onRequestClose={onBack}
      supportedOrientations={['landscape', 'portrait']}
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <Modal animationType="fade" transparent visible={showGuideModal} onRequestClose={() => setShowGuideModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 실전 랠리 AI 정밀 분석 가이드</Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)} style={{ padding: 4 }}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.guideCard}>
                <View style={styles.guideCardHeader}>
                  <View style={styles.guideIconBox}><Activity size={24} color="#60A5FA" /></View>
                  <Text style={styles.guideCardTitle}>하체 및 무게 중심 안정성</Text>
                </View>
                <Text style={styles.guideDescText}>기동 중 무릎의 굽힘 각도와 상체 기울기를 추적하여 타구 및 착지 시 밸런스가 굳건하게 유지되는지 분석합니다.</Text>
              </View>

              <View style={styles.guideCard}>
                <View style={styles.guideCardHeader}>
                  <View style={styles.guideIconBox}><Move size={24} color="#34D399" /></View>
                  <Text style={styles.guideCardTitle}>스텝 반응성 및 코트 장악</Text>
                </View>
                <Text style={styles.guideDescText}>전후좌우 이동 반경을 파악하고, 스플릿 스텝 타이밍과 타구 직후 홈 포지션 복귀 속도를 정밀하게 측정합니다.</Text>
              </View>

              <View style={styles.guideCard}>
                <View style={styles.guideCardHeader}>
                  <View style={styles.guideIconBox}><User size={24} color="#FBBF24" /></View>
                  <Text style={styles.guideCardTitle}>스윙 연계 및 프로 비교</Text>
                </View>
                <Text style={styles.guideDescText}>이동 중에 라켓이 충분히 준비되어 있는지 평가하고, 추출된 역학 데이터를 프로 선수들의 랠리 패턴과 비교합니다.</Text>
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={confirmAndStart}>
                <Text style={styles.confirmButtonText}>숙지했습니다 (카메라 추적 시작)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {report ? (
        <SafeAreaView style={[styles.container, { paddingTop: 40 }]}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>AI 실전 랠리 분석</Text>
              <Text style={styles.reportDate}>{new Date().toLocaleString()} (반코트 추적)</Text>
              <View style={styles.difficultyBadge}><Text style={styles.difficultyText}>FULL MATCH MODE</Text></View>
            </View>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>실전 기동력 종합 점수</Text>
              <Text style={styles.scoreValue}>{report.totalScore}<Text style={{ fontSize: 30 }}>점</Text></Text>
              <View style={styles.countBadge}>
                <Text style={{ color: '#111827', fontWeight: 'bold' }}>
                  총 {report.eventCount}회 스텝 | 랠리 시간: {report.durationSec}초
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={styles.subStatBox}>
                    <Activity size={24} color="#F472B6" />
                    <Text style={styles.subStatLabel}>평균 복귀</Text>
                    <Text style={styles.subStatValue}>{report.averageRecoveryMs > 0 ? `${report.averageRecoveryMs}ms` : '-'}</Text>
                    <Text style={styles.subStatSubText}>홈 포지션 회귀율</Text>
                </View>
                <View style={styles.subStatBox}>
                    <Compass size={24} color="#60A5FA" />
                    <Text style={styles.subStatLabel}>코트 장악력</Text>
                    <Text style={styles.subStatValue}>{report.courtCoveragePct}%</Text>
                    <Text style={styles.subStatSubText}>6코너 커버리지</Text>
                </View>
                <View style={styles.subStatBox}>
                    <Flame size={24} color="#FCD34D" />
                    <Text style={styles.subStatLabel}>하체 밸런스</Text>
                    <Text style={styles.subStatValue}>{report.postureScore}점</Text>
                    <Text style={styles.subStatSubText}>중심점 안정성</Text>
                </View>
            </View>

            {report.aiEvaluation && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>🤖 AI 정밀 역학 분석</Text>
                  <View style={styles.listItem}>
                      <Activity size={20} color="#60A5FA" />
                      <Text style={styles.listText}>{report.aiEvaluation.swingDetail}</Text>
                  </View>
                  <View style={styles.listItem}>
                      <Move size={20} color="#34D399" />
                      <Text style={styles.listText}>{report.aiEvaluation.footworkDetail}</Text>
                  </View>
                  <View style={styles.listItem}>
                      <User size={20} color="#FBBF24" />
                      <Text style={styles.listText}>{report.aiEvaluation.proComparison}</Text>
                  </View>
                </View>
            )}

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🔥 장점</Text>
              {report.strengths && report.strengths.length > 0 ? (
                report.strengths.map((item: string, idx: number) => (
                  <View key={idx} style={styles.listItem}><CheckCircle size={20} color="#34D399" /><Text style={styles.listText}>{item}</Text></View>
                ))
              ) : (<Text style={styles.emptyText}>장점을 찾기 위해 데이터가 더 필요합니다.</Text>)}
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>⚠️ 보완점</Text>
              {report.weaknesses && report.weaknesses.length > 0 ? (
                report.weaknesses.map((item: string, idx: number) => (
                  <View key={idx} style={styles.listItem}><XCircle size={20} color="#EF4444" /><Text style={styles.listText}>{item}</Text></View>
                ))
              ) : (<Text style={styles.emptyText}>훌륭한 랠리 방어력을 보여주었습니다.</Text>)}
            </View>

            <View style={[styles.sectionContainer, { backgroundColor: '#1F2937', borderColor: '#FCD34D', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Dumbbell size={24} color="#FCD34D" /><Text style={[styles.sectionTitle, { color: '#FCD34D', marginBottom: 0, marginLeft: 8 }]}>추천 트레이닝</Text>
              </View>
              <Text style={styles.trainingText}>{report.recommendedDrill}</Text>
            </View>

            <TouchableOpacity style={styles.closeReportButton} onPress={onBack}>
              <Text style={styles.closeReportText}>결과 닫고 돌아가기</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

      ) : (

        <View style={styles.cameraRoot}>
          <WebView
            ref={webviewRef}
            style={styles.webview}
            source={{ html: footworkSetHtml, baseUrl: 'https://localhost' }}
            javaScriptEnabled={true}
            onMessage={handlePoseMessage}
          />

          <View pointerEvents="none" style={styles.overlayWrapper}>
            <View style={styles.halfCourtOverlay}>
                <Svg width="100%" height="100%" viewBox="0 0 1280 720" preserveAspectRatio="none">
                    <Polygon points="560,100 720,100 820,220 460,220" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.4)" strokeDasharray="5, 5" strokeWidth="2" />
                    <SvgText x="640" y="165" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="bold" textAnchor="middle">상대편 코트</SvgText>
                    <Polygon points="460,220 820,220 1250,680 30,680" fill="rgba(52,211,153,0.06)" stroke={courtDetected ? '#34D399' : '#FBBF24'} strokeWidth="5" />
                    <Line x1="400" y1="220" x2="880" y2="220" stroke="#EF4444" strokeWidth="6" />
                    <SvgText x="640" y="210" fill="#EF4444" fontSize="24" fontWeight="bold" textAnchor="middle">NET</SvgText>
                    <Line x1="640" y1="220" x2="640" y2="680" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
                    <Line x1="339" y1="350" x2="941" y2="350" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeDasharray="10, 8" />
                    <Line x1="108" y1="600" x2="1172" y2="600" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                    <Line x1="496" y1="220" x2="152" y2="680" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="10, 8" />
                    <Line x1="784" y1="220" x2="1128" y2="680" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="10, 8" />
                </Svg>
            </View>
            <Text style={styles.overlayGuideText}>화면 상단 빨간 선을 중앙 네트에 맞춰주세요</Text>

            {cameraState === 'RUNNING' && currentDisplayZone !== 'UNKNOWN' && (
                <View style={styles.zoneIndicator}>
                    <Text style={styles.zoneIndicatorText}>현재 구역: {currentDisplayZone}</Text>
                </View>
            )}
          </View>

          <View style={styles.topBar}>
            <TouchableOpacity onPress={onBack}><ChevronLeft size={30} color="white" /></TouchableOpacity>
            <Text style={styles.statusText}>{status}</Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => webviewRef.current?.injectJavaScript('window.__RECO_SWITCH_CAMERA()')}>
                <RotateCcw size={24} color="white" />
            </TouchableOpacity>

            {cameraState === 'RUNNING' ? (
              <TouchableOpacity style={[styles.mainBtn, { borderColor: '#EF4444' }]} onPress={stopSet}>
                <Square size={24} color="#EF4444" fill="#EF4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.mainBtn, { borderColor: courtDetected ? 'white' : '#FBBF24' }]} onPress={handleStartPress}>
                 <View style={{ width: 40, height: 40, backgroundColor: courtDetected ? 'white' : '#FBBF24', borderRadius: 20 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  cameraRoot: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1 },
  overlayWrapper: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  halfCourtOverlay: { width: '100%', height: '100%', position: 'absolute' },
  overlayGuideText: { color: 'white', fontSize: 16, fontWeight: 'bold', backgroundColor: 'rgba(239, 68, 68, 0.8)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, position: 'absolute', bottom: '15%' },
  zoneIndicator: { position: 'absolute', top: 80, backgroundColor: 'rgba(52, 211, 153, 0.8)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  zoneIndicatorText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  topBar: { position: 'absolute', top: 20, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  statusText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  bottomBar: { position: 'absolute', bottom: 30, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 60, zIndex: 10 },
  controlBtn: { padding: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30 },
  mainBtn: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },

  reportHeader: { marginBottom: 30 },
  reportTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  reportDate: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  difficultyBadge: { alignSelf:'flex-start', backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingVertical:4, paddingHorizontal:8, borderRadius:8, marginTop:8 },
  difficultyText: { color: '#60A5FA', fontWeight:'bold', fontSize:12 },
  scoreCard: { backgroundColor: '#34D399', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  scoreLabel: { color: '#064E3B', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  scoreValue: { color: '#064E3B', fontSize: 48, fontWeight: 'bold' },
  countBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 8 },

  subStatBox: { flex: 1, backgroundColor: '#1F2937', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  subStatLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 10, marginBottom: 4 },
  subStatValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  subStatSubText: { color: '#6B7280', fontSize: 10, marginTop: 4 },

  sectionContainer: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  listItem: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  listText: { color: '#D1D5DB', fontSize: 15, flex: 1, lineHeight: 22 },
  emptyText: { color: '#6B7280', fontStyle: 'italic' },
  trainingText: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  closeReportButton: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  closeReportText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#1F2937', borderRadius: 24, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  guideCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  guideCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  guideIconBox: { width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  guideCardTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  guideDescText: { color: '#D1D5DB', fontSize: 14, lineHeight: 22 },
  tipBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(96, 165, 250, 0.1)', padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.2)' },
  tipBoxText: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginLeft: 8, flex: 1 },
  confirmButton: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});