import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal, // ✅ 네비게이션 탭 오버라이드를 위한 모달
} from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { ChevronLeft, RotateCcw, Square, CheckCircle, XCircle, Dumbbell, Activity, Clock } from 'lucide-react-native';
import Orientation from 'react-native-orientation-locker';

import { footworkSetHtml } from './realtimeFootworkHtml';
import { summarizeFootworkSet, StepEvent } from './realtimeFootworkEngine';

export default function RealtimeFootworkMode({ onBack }: { onBack: () => void }) {
  const [cameraState, setCameraState] = useState<'LOADING' | 'READY' | 'RUNNING' | 'FINISHED'>('LOADING');
  const [courtDetected, setCourtDetected] = useState(false);
  const [playerDetected, setPlayerDetected] = useState(false);
  const [status, setStatus] = useState('가로 모드로 전환하여 카메라를 준비합니다.');
  const [report, setReport] = useState<any>(null);
  const [currentDisplayZone, setCurrentDisplayZone] = useState('CENTER');
  const webviewRef = useRef<WebView>(null);

  const infiniteEventsRef = useRef<StepEvent[]>([]);
  const startedAtRef = useRef(Date.now());
  const lastZoneRef = useRef('CENTER');
  const zoneEnteredAtRef = useRef(0);
  const lastNonCenterAtRef = useRef(0);

  useEffect(() => {
    Orientation.lockToLandscapeRight();
    return () => {
      Orientation.lockToPortrait();
    };
  }, []);

  useEffect(() => {
    if (report) {
      Orientation.lockToPortrait();
    } else {
      Orientation.lockToLandscapeRight();
    }
  }, [report]);

  const handlePoseMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);

      if (parsed.type === 'CAMERA_READY') {
        setCameraState('READY');
        setStatus('전신과 코트 반면을 화면에 맞춰주세요.');
      } else if (parsed.type === 'COURT_DETECTED') {
        setCourtDetected(true);
      } else if (parsed.type === 'poseMetrics') {
        setPlayerDetected(parsed.playerConfidence >= 0.70);

        if (cameraState === 'RUNNING') {
           const zone = parsed.zone;
           const now = parsed.ts;

           if (zone !== currentDisplayZone) {
               setCurrentDisplayZone(zone);
           }

           if (!lastZoneRef.current) {
             lastZoneRef.current = zone;
             zoneEnteredAtRef.current = now;
             if (zone !== 'CENTER') lastNonCenterAtRef.current = now;
             return;
           }

           if (zone !== lastZoneRef.current) {
             const dwellMs = Math.max(120, now - zoneEnteredAtRef.current);
             infiniteEventsRef.current.push({
               ts: now,
               zone,
               dwellMs,
               splitStepDetected: false,
               recoveryToCenterMs: zone === 'CENTER' && lastNonCenterAtRef.current ? now - lastNonCenterAtRef.current : undefined,
               kneeAngleMin: parsed.kneeAngleMin,
               trunkLeanDeg: parsed.trunkLeanDeg,
               balanceScore: parsed.balanceScore
             });

             if (zone !== 'CENTER') lastNonCenterAtRef.current = now;
             lastZoneRef.current = zone;
             zoneEnteredAtRef.current = now;
           }
        }
      }
    } catch (e) {}
  };

  const startSet = () => {
    startedAtRef.current = Date.now();
    infiniteEventsRef.current = [];
    setCameraState('RUNNING');
    setStatus('경기 분석이 시작되었습니다. 1시간 이상 무제한 측정이 가능합니다.');
    webviewRef.current?.injectJavaScript('window.__RECO_FOOTWORK_START();');
  };

  const stopSet = () => {
    setCameraState('FINISHED');
    webviewRef.current?.injectJavaScript('window.__RECO_FOOTWORK_STOP();');
    setStatus('데이터 압축 및 요약 중입니다...');

    const localSummary = summarizeFootworkSet({
      sessionId: `reco_fw_${Date.now()}`,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      calibrationScore: 0.8,
      conditions: { fullBodyVisible: true, singlePlayerOnly: true, indoorLightingOk: true, courtDetected: true },
      events: infiniteEventsRef.current
    });

    setReport(localSummary);
  };

  // ✅ 네비게이션 바 완벽 차단을 위한 FullScreen Modal 속성 부여
  return (
    <Modal
      visible={true}
      transparent={false}
      animationType="fade"
      onRequestClose={onBack}
      supportedOrientations={['landscape', 'portrait']}
      presentationStyle="fullScreen"
      statusBarTranslucent={true} // 안드로이드 시스템 바까지 덮기 위함
    >
      {report ? (
        <SafeAreaView style={[styles.container, { paddingTop: 40 }]}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>AI 실시간 분석 리포트</Text>
              <Text style={styles.reportDate}>{new Date().toLocaleString()} (반코트 분석)</Text>
              <View style={styles.difficultyBadge}><Text style={styles.difficultyText}>FULL MATCH MODE</Text></View>
            </View>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>종합 점수</Text>
              <Text style={styles.scoreValue}>{report.totalScore}<Text style={{ fontSize: 30 }}>점</Text></Text>
              <View style={styles.countBadge}>
                <Text style={{ color: '#111827', fontWeight: 'bold' }}>
                  총 {report.eventCount}회 스텝 | 자세 {report.postureScore}점 / 풋워크 {report.footworkScore}점
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={styles.subStatBox}>
                    <Clock size={20} color="#60A5FA" />
                    <Text style={styles.subStatLabel}>평균 반응</Text>
                    <Text style={styles.subStatValue}>{report.averageReactionMs}ms</Text>
                </View>
                <View style={styles.subStatBox}>
                    <Activity size={20} color="#F472B6" />
                    <Text style={styles.subStatLabel}>평균 복귀</Text>
                    <Text style={styles.subStatValue}>{report.averageRecoveryMs}ms</Text>
                </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🔥 칭찬해요 (Pros)</Text>
              {report.strengths && report.strengths.length > 0 ? (
                report.strengths.map((item: string, idx: number) => (
                  <View key={idx} style={styles.listItem}><CheckCircle size={20} color="#34D399" /><Text style={styles.listText}>{item}</Text></View>
                ))
              ) : (<Text style={styles.emptyText}>노력이 조금 더 필요합니다.</Text>)}
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>⚠️ 보완점 (Cons & 원인 분석)</Text>
              {report.weaknesses && report.weaknesses.length > 0 ? (
                report.weaknesses.map((item: string, idx: number) => (
                  <View key={idx} style={styles.listItem}><XCircle size={20} color="#EF4444" /><Text style={styles.listText}>{item}</Text></View>
                ))
              ) : (<Text style={styles.emptyText}>고칠 곳이 없습니다. 완벽합니다!</Text>)}
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

          {/* ✅ 완벽하게 수정된 원근감 + 6분할 기준선 오버레이 */}
          <View pointerEvents="none" style={styles.overlayWrapper}>
            <View style={styles.halfCourtOverlay}>
                {/* 화면에 꽉 차게 그리기 위해 viewBox 설정 및 비율 무시(stretch) 적용 */}
                <Svg width="100%" height="100%" viewBox="0 0 1280 720" preserveAspectRatio="none">

                    {/* 전체 반코트 영역 다각형 (네트를 위로 확 올림) */}
                    <Polygon points="400,220 880,220 1200,680 80,680" fill="rgba(52,211,153,0.06)" stroke={courtDetected ? '#34D399' : '#FBBF24'} strokeWidth="5" />

                    {/* ✅ 가장 핵심인 빨간색 네트 라인 (y=220) */}
                    <Line x1="380" y1="220" x2="900" y2="220" stroke="#EF4444" strokeWidth="6" />
                    <SvgText x="640" y="210" fill="#EF4444" fontSize="24" fontWeight="bold" textAnchor="middle">NET</SvgText>

                    {/* 센터 라인 (정중앙 수직선) */}
                    <Line x1="640" y1="220" x2="640" y2="680" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />

                    {/* 숏 서비스 라인 (원근감에 맞춰 y=380 쯤에 위치) */}
                    <Line x1="289" y1="380" x2="991" y2="380" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeDasharray="10, 8" />

                    {/* 복식 롱 서비스 라인 (y=611) */}
                    <Line x1="128" y1="611" x2="1152" y2="611" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

                    {/* 단식 사이드 라인 (원근감을 계산한 각도) */}
                    <Line x1="436" y1="220" x2="164" y2="680" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="10, 8" />
                    <Line x1="844" y1="220" x2="1116" y2="680" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="10, 8" />
                </Svg>
            </View>
            <Text style={styles.overlayGuideText}>화면 상단 빨간 선(NET)을 실제 네트에 위치시켜주세요</Text>

            {cameraState === 'RUNNING' && (
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
              <TouchableOpacity style={[styles.mainBtn, { borderColor: (courtDetected && playerDetected) ? 'white' : 'gray' }]} onPress={startSet} disabled={!courtDetected || !playerDetected}>
                 <View style={{ width: 40, height: 40, backgroundColor: (courtDetected && playerDetected) ? 'white' : 'gray', borderRadius: 20 }} />
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

  // 리포트 전용 UI 스타일
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
  subStatLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 6, marginBottom: 2 },
  subStatValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  sectionContainer: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  listItem: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  listText: { color: '#D1D5DB', fontSize: 15, flex: 1, lineHeight: 22 },
  emptyText: { color: '#6B7280', fontStyle: 'italic' },
  trainingText: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  closeReportButton: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  closeReportText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});