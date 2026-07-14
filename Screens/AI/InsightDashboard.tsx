// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import {
  ArrowLeft, BrainCircuit, TrendingUp, Zap,
  Activity, Move, Music, ChevronRight, Target, Info, Flame,
  Trash2, CheckCircle, XCircle, Dumbbell, Compass
} from 'lucide-react-native';

// ✅ 삭제를 위한 deleteDoc, doc 임포트
import { getFirestore, collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

import { AnalysisMode, AnalysisReport } from './AIAnalysis';

const screenWidth = Dimensions.get('window').width;

// ✅ 어떠한 환경 포맷(MM/DD/YYYY 또는 YYYY.MM.DD)이든 년.월.일로 완벽하게 통일해주는 함수
const formatYMD = (dateStr: string) => {
  if (!dateStr) return '';
  let match = dateStr.match(/(\d{4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})/);
  if (match) return `${match[1]}. ${match[2]}. ${match[3]}.`;

  match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return `${match[3]}. ${match[1]}. ${match[2]}.`;

  return dateStr.split(',')[0].replace(/(오전|오후).*/, '').trim();
};

interface CrossAnalysisResult {
  coachMessage: string;
  missionTitle: string;
  missionType: AnalysisMode | 'REALTIME_MATCH';
  stats: {
    power: number;
    agility: number;
    stability: number;
    rhythm: number;
  };
  trendChart: {
    labels: string[];
    datasets: { data: number[] }[];
  };
}

export default function InsightDashboard() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [insights, setInsights] = useState<CrossAnalysisResult | null>(null);

  const [showReport, setShowReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);

  useEffect(() => {
    fetchAndAnalyzeData();
  }, []);

  const fetchAndAnalyzeData = async () => {
    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;

      if (user) {
        const db = getFirestore(getApp());

        const historyRef = collection(db, 'artifacts', 'rally-app-main', 'users', user.uid, 'videoHistory');
        const footworkRef = collection(db, 'artifacts', 'com.recobystackapp', 'users', user.uid, 'footworkSets');

        const [historySnap, footworkSnap] = await Promise.all([
          getDocs(query(historyRef)),
          getDocs(query(footworkRef))
        ]);

        const loadedHistory: AnalysisReport[] = [];

        historySnap.forEach((docSnap) => {
          const data = docSnap.data();
          loadedHistory.push({
            id: data.id || docSnap.id,
            docId: docSnap.id, // ✅ 문서 ID 추가
            date: data.date,
            mode: data.mode as AnalysisMode,
            avgScore: data.avgScore,
            pros: data.pros || [],
            cons: data.cons || [],
            training: data.training || '',
            totalCount: data.totalCount,
            maxRecord: data.maxRecord,
            difficulty: data.difficulty
          } as AnalysisReport);
        });

        footworkSnap.forEach((docSnap) => {
          const data = docSnap.data();
          loadedHistory.push({
            id: data.id || docSnap.id,
            docId: docSnap.id, // ✅ 문서 ID 추가
            date: data.date,
            mode: data.mode || 'REALTIME_MATCH',
            avgScore: data.avgScore,
            maxRecord: data.maxRecord,
            pros: data.summary?.strengths || [],
            cons: data.summary?.weaknesses || [],
            training: data.summary?.recommendedDrill || '',
            totalCount: data.maxRecord,
            durationSec: data.summary?.durationSec || 0,
            averageRecoveryMs: data.summary?.averageRecoveryMs || 0,
            courtCoveragePct: data.summary?.courtCoveragePct || 0,
            postureScore: data.summary?.postureScore || 0,
            difficulty: 'FULL MATCH' as any
          } as AnalysisReport);
        });

        loadedHistory.sort((a, b) => Number(b.id) - Number(a.id));
        const recent30 = loadedHistory.slice(0, 30);

        setHistory(recent30);
        generateCrossModalInsights(recent30);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCrossModalInsights = (data: any[]) => {
    if (data.length < 5) {
      setInsights({
        coachMessage: "아직 분석할 데이터가 부족해요! 스윙, 준비자세, 풋워크, 나와의 랠리 모드를 각각 2번씩 더 진행해 주시면, 제가 완벽한 맞춤형 성장 피드백을 해드릴게요.",
        missionTitle: "기초 데이터 수집하기",
        missionType: 'SWING',
        stats: { power: 50, agility: 50, stability: 50, rhythm: 50 },
        trendChart: { labels: ['1', '2', '3'], datasets: [{ data: [0, 0, 0] }] }
      });
      return;
    }

    const swings = data.filter(d => d.mode === 'SWING');
    const footworks = data.filter(d => d.mode === 'FOOTWORK');
    const lunges = data.filter(d => d.mode === 'LUNGE');
    const rhythms = data.filter(d => d.mode === 'RHYTHM');

    const avgPower = swings.slice(0, 3).reduce((acc, cur) => acc + cur.avgScore, 0) / (Math.min(swings.length, 3) || 1);
    const avgAgility = footworks.slice(0, 3).reduce((acc, cur) => acc + cur.avgScore, 0) / (Math.min(footworks.length, 3) || 1);
    const avgStability = lunges.slice(0, 3).reduce((acc, cur) => acc + cur.avgScore, 0) / (Math.min(lunges.length, 3) || 1);
    const avgRhythm = rhythms.slice(0, 3).reduce((acc, cur) => acc + cur.avgScore, 0) / (Math.min(rhythms.length, 3) || 1);

    const pastRhythm = rhythms.slice(3, 6).reduce((acc, cur) => acc + cur.avgScore, 0) / (Math.min(rhythms.slice(3, 6).length, 3) || 1);
    const isRhythmImproving = avgRhythm > pastRhythm + 5;
    const isRhythmDeclining = avgRhythm < pastRhythm - 5;

    let message = "";
    let mission = "";
    let mType: AnalysisMode = 'RHYTHM';

    if (isRhythmImproving && avgAgility > 70) {
      message = "최근 풋워크 훈련에서 민첩성이 눈에 띄게 올랐네요! 그 효과가 '나와의 랠리' 실전 템포 향상으로 완벽하게 이어지고 있습니다. 예전에는 놓치던 빠른 공격들도 이제는 여유롭게 걷어내고 있어요. 민첩성 훈련이 실전 수비력으로 직결된 최고의 사례입니다.";
      mission = "지금의 감각으로 '나와의 랠리 (HARD)' 도전하기";
      mType = 'RHYTHM';
    } else if (isRhythmDeclining && avgStability < 50) {
      message = "요즘 '나와의 랠리' 후반부에 언더 리시브(수비) 폼이 자주 무너지고 있습니다. 원인을 분석해 보니, 최근 '준비 자세(LUNGE)' 점수가 많이 떨어졌네요. 하체 근력이 먼저 지치면서 수비 밸런스가 흔들리는 현상입니다. 당분간은 코어 훈련에 집중해야 할 타이밍입니다.";
      mission = "하체 안정화 '준비 자세' 40초 버티기";
      mType = 'LUNGE';
    } else if (avgPower > 80 && avgRhythm < 60) {
      message = "스윙 파워와 상체 회전력은 상위 10% 수준으로 훌륭합니다! 하지만 랠리 점수가 정체된 이유는 공격 후 다음 동작을 준비하는 '리커버리 템포'가 반 박자 느리기 때문이에요. 폼은 이미 완성되었으니, 타격 후 즉시 중앙으로 돌아오는 잔발 스텝을 끌어올릴 차례입니다.";
      mission = "'풋워크 게임' 반응 속도 0.8초 벽 깨기";
      mType = 'FOOTWORK';
    } else if (avgPower < 50 && avgStability > 70) {
      message = "하체 밸런스는 철벽처럼 아주 단단합니다. 다만 스윙 궤적에서 상체 회전이 부족해 스피드가 제대로 나오지 않고 있어요. 하체의 힘을 상체로 전달하는 코어 꼬임을 훈련하면 스매시 파워가 폭발적으로 상승할 잠재력이 있습니다.";
      mission = "골반부터 회전하는 '스윙 모드' 파워 훈련";
      mType = 'SWING';
    } else {
      message = "전체적인 기초 스탯이 아주 안정적으로 밸런스를 이루고 있습니다. 폼이 완전히 내 몸에 익숙해지는 단계입니다. 지금처럼 꾸준히 4가지 모드를 번갈아 가며 훈련해 주세요!";
      mission = "오늘도 가볍게 '나와의 랠리' 한 판!";
      mType = 'RHYTHM';
    }

    const recent6 = data.slice(0, 6).reverse();

    const chartLabels = recent6.map(d => {
      // ✅ 차트 라벨에도 포맷 적용하여 에러 방지
      const formatted = formatYMD(d.date);
      const match = formatted.match(/(\d{1,2})\.\s*(\d{1,2})\./); // 월. 일. 파싱
      const dateStr = match ? `${match[1]}/${match[2]}` : d.date.substring(0, 5);

      const modeMap: any = { SWING: '스윙', LUNGE: '런지', FOOTWORK: '스텝', RHYTHM: '랠리', REALTIME_MATCH: '실전' };
      return `${dateStr} ${modeMap[d.mode] || '분석'}`;
    });

    const chartScores = recent6.map(d => d.avgScore);

    setInsights({
      coachMessage: message,
      missionTitle: mission,
      missionType: mType,
      stats: {
        power: avgPower || 50,
        agility: avgAgility || 50,
        stability: avgStability || 50,
        rhythm: avgRhythm || 50
      },
      trendChart: {
        labels: chartLabels.length > 0 ? chartLabels : ['-'],
        datasets: [{ data: chartScores.length > 0 ? chartScores : [0] }]
      }
    });
  };

  // ✅ 삭제 기능 (로컬 상태 및 Firestore 모두 삭제 처리)
  const deleteHistoryItem = (id: string, docId: string | undefined, itemMode: string) => {
    Alert.alert('기록 삭제', '이 기록을 정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => performDelete(id, docId, itemMode) },
    ]);
  };

  const performDelete = async (id: string, docId: string | undefined, itemMode: string) => {
    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;
      if (user && docId) {
        const db = getFirestore(getApp());
        const isRealtime = itemMode === 'REALTIME_MATCH';
        const collectionName = isRealtime ? 'footworkSets' : 'videoHistory';
        const appId = isRealtime ? 'com.recobystackapp' : 'rally-app-main';

        // ✅ 타임스탬프 id가 아닌 docId를 사용해 문서를 삭제합니다
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, docId));
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  const getModeIcon = (mode: string) => {
    switch(mode) {
      case 'SWING': return <Zap size={18} color="#F472B6" />;
      case 'LUNGE': return <Activity size={18} color="#60A5FA" />;
      case 'FOOTWORK': return <Move size={18} color="#FCD34D" />;
      case 'RHYTHM': return <Music size={18} color="#10B981" />;
      case 'REALTIME_MATCH': return <Flame size={18} color="#EF4444" />;
      default: return <Activity size={18} color="#FFF" />;
    }
  };

  const getModeName = (mode: string) => {
    switch(mode) {
      case 'SWING': return "스윙 분석";
      case 'LUNGE': return "준비 자세";
      case 'FOOTWORK': return "풋워크";
      case 'RHYTHM': return "나와의 랠리";
      case 'REALTIME_MATCH': return "실전 랠리 (반코트)";
      default: return "분석 모드";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34D399" />
        <Text style={styles.loadingText}>AI 코치가 누적 데이터를 교차 분석 중입니다...</Text>
      </View>
    );
  }

  const chartWidth = insights ? Math.max(screenWidth - 16, insights.trendChart.labels.length * 65) : screenWidth - 16;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 성장 인사이트</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <Text style={styles.sectionTitle}>📊 종합 스탯 밸런스</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Zap size={24} color="#F472B6" />
            <Text style={styles.statLabel}>파워 (Swing)</Text>
            <Text style={[styles.statValue, { color: '#F472B6' }]}>{Math.floor(insights?.stats.power || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Activity size={24} color="#60A5FA" />
            <Text style={styles.statLabel}>안정성 (Lunge)</Text>
            <Text style={[styles.statValue, { color: '#60A5FA' }]}>{Math.floor(insights?.stats.stability || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Move size={24} color="#FCD34D" />
            <Text style={styles.statLabel}>민첩성 (Step)</Text>
            <Text style={[styles.statValue, { color: '#FCD34D' }]}>{Math.floor(insights?.stats.agility || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Music size={24} color="#10B981" />
            <Text style={styles.statLabel}>리듬 (Rhythm)</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{Math.floor(insights?.stats.rhythm || 0)}</Text>
          </View>
        </View>

        <View style={styles.xaiContainer}>
          <View style={styles.xaiHeader}>
            <BrainCircuit size={22} color="#FCD34D" />
            <Text style={styles.xaiTitle}>AI 코치의 집중 피드백</Text>
          </View>
          <Text style={styles.xaiMessage}>{insights?.coachMessage}</Text>

          <TouchableOpacity
            style={styles.missionButton}
            activeOpacity={0.8}
            onPress={() => {
              navigation.goBack();
            }}
          >
            <Target size={20} color="#111827" />
            <Text style={styles.missionButtonText}>{insights?.missionTitle}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>📈 최근 성장 추세</Text>

        <View style={styles.chartDescBox}>
          <Info size={16} color="#60A5FA" />
          <Text style={styles.chartDescText}>
            그래프의 수치는 각 훈련의 <Text style={{fontWeight: 'bold', color: 'white'}}>'종합 달성 점수'</Text>입니다.{'\n'}
            (기초 분석/실전: 100점 만점 | 랠리: 콤보 누적 점수)
          </Text>
        </View>

        <View style={styles.chartContainer}>
          {insights && insights.trendChart.labels.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              <LineChart
                data={insights.trendChart}
                width={chartWidth}
                height={240}
                verticalLabelRotation={-30}
                fromZero={true}
                chartConfig={{
                  backgroundColor: '#1F2937',
                  backgroundGradientFrom: '#1F2937',
                  backgroundGradientTo: '#1F2937',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "5", strokeWidth: "2", stroke: "#1F2937" },
                  propsForLabels: { fontSize: 11 }
                }}
                bezier
                style={{ marginVertical: 8, paddingRight: 30, borderRadius: 16 }}
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyChart}>
              <TrendingUp size={32} color="#4B5563" style={{ marginBottom: 10 }} />
              <Text style={{ color: '#6B7280' }}>그래프를 생성하기엔 기록이 부족합니다.</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>📜 전체 분석 기록</Text>
        <View style={styles.historyList}>
          {history.map((item, index) => (
            <View key={item.id} style={styles.historyItem}>
              {/* 상세 내역 보기 터치 영역 */}
              <TouchableOpacity
                style={styles.historyItemContent}
                onPress={() => { setSelectedReport(item); setShowReport(true); }}
              >
                <View style={styles.historyItemLeft}>
                  <View style={styles.historyIconBox}>
                    {getModeIcon(item.mode)}
                  </View>
                  <View>
                    <Text style={styles.historyModeName}>{getModeName(item.mode)}</Text>
                    {/* ✅ 대시보드 리스트에도 formatYMD 적용 */}
                    <Text style={styles.historyDate}>{formatYMD(item.date)}</Text>
                  </View>
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={styles.historyScore}>{item.avgScore}점</Text>
                  <ChevronRight size={20} color="#4B5563" />
                </View>
              </TouchableOpacity>

              {/* 삭제 버튼 추가 */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteHistoryItem(item.id, item.docId, item.mode)}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {history.length === 0 && (
            <Text style={styles.emptyText}>저장된 기록이 없습니다.</Text>
          )}
        </View>

      </ScrollView>

      {/* ✅ 상세 분석 리포트 모달 (반코트 모드 호환 및 formatYMD 적용) */}
      <Modal animationType="slide" transparent={false} visible={showReport} onRequestClose={() => setShowReport(false)}>
        {selectedReport && (
          <View style={styles.reportContainer}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>AI 분석 리포트</Text>
                <Text style={styles.reportDate}>
                  {formatYMD(selectedReport.date)} ({getModeName(selectedReport.mode)})
                </Text>
                {(selectedReport.mode === 'FOOTWORK' || selectedReport.mode === 'RHYTHM' || selectedReport.mode === 'REALTIME_MATCH') && (<View style={styles.difficultyBadge}><Text style={styles.difficultyText}>{selectedReport.difficulty} MODE</Text></View>)}
              </View>

              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>종합 점수</Text>
                <Text style={styles.scoreValue}>{selectedReport.avgScore}<Text style={{ fontSize: 30 }}>점</Text></Text>
                <View style={styles.countBadge}>
                  <Text style={{ color: '#111827', fontWeight: 'bold' }}>
                    {selectedReport.mode === 'SWING' ? `${selectedReport.totalCount}회 수행` : selectedReport.mode === 'RHYTHM' ? `총 ${selectedReport.totalCount}노트 처리` : selectedReport.mode === 'REALTIME_MATCH' ? `총 ${selectedReport.totalCount}회 스텝` : `평균 안정성 ${selectedReport.avgScore}점`}
                    {' | '}최고기록: {Math.floor(selectedReport.maxRecord)}{selectedReport.mode === 'SWING' ? 'km/h' : selectedReport.mode === 'RHYTHM' ? 'Combo' : selectedReport.mode === 'REALTIME_MATCH' ? '스텝' : '초'}
                  </Text>
                </View>
              </View>

              {/* 반코트(실전 랠리) 전용 스탯 UI 조건부 렌더링 */}
              {selectedReport.mode === 'REALTIME_MATCH' && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={styles.subStatBox}>
                      <Activity size={24} color="#F472B6" />
                      <Text style={styles.subStatLabel}>평균 복귀</Text>
                      <Text style={styles.subStatValue}>{selectedReport.averageRecoveryMs && selectedReport.averageRecoveryMs > 0 ? `${selectedReport.averageRecoveryMs}ms` : '-'}</Text>
                      <Text style={styles.subStatSubText}>홈 포지션 회귀율</Text>
                  </View>
                  <View style={styles.subStatBox}>
                      <Compass size={24} color="#60A5FA" />
                      <Text style={styles.subStatLabel}>코트 장악력</Text>
                      <Text style={styles.subStatValue}>{selectedReport.courtCoveragePct}%</Text>
                      <Text style={styles.subStatSubText}>6코너 커버리지</Text>
                  </View>
                  <View style={styles.subStatBox}>
                      <Flame size={24} color="#FCD34D" />
                      <Text style={styles.subStatLabel}>하체 밸런스</Text>
                      <Text style={styles.subStatValue}>{selectedReport.postureScore}점</Text>
                      <Text style={styles.subStatSubText}>중심점 안정성</Text>
                  </View>
                </View>
              )}

              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>🔥 장점</Text>
                {selectedReport.pros && selectedReport.pros.length > 0 ? (
                  selectedReport.pros.map((item, idx) => (<View key={idx} style={styles.listItem}><CheckCircle size={20} color="#34D399" /><Text style={styles.listText}>{item}</Text></View>))
                ) : (<Text style={styles.emptyText}>노력이 조금 더 필요합니다.</Text>)}
              </View>

              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>⚠️ 보완점</Text>
                {selectedReport.cons && selectedReport.cons.length > 0 ? (
                  selectedReport.cons.map((item, idx) => (<View key={idx} style={styles.listItem}><XCircle size={20} color="#EF4444" /><Text style={styles.listText}>{item}</Text></View>))
                ) : (<Text style={styles.emptyText}>고칠 곳이 없습니다. 완벽합니다!</Text>)}
              </View>

              <View style={[styles.sectionContainer, { backgroundColor: '#1F2937', borderColor: '#FCD34D', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Dumbbell size={24} color="#FCD34D" /><Text style={[styles.sectionTitle, { color: '#FCD34D', marginBottom: 0, marginLeft: 8 }]}>추천 트레이닝</Text>
                </View>
                <Text style={styles.trainingText}>{selectedReport.training}</Text>
              </View>

              <TouchableOpacity style={styles.closeReportButton} onPress={() => setShowReport(false)}><Text style={styles.closeReportText}>닫기</Text></TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loadingContainer: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 16, fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 12, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 'bold' },

  xaiContainer: {
    marginTop: 30,
    backgroundColor: 'rgba(252, 211, 77, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.2)',
  },
  xaiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  xaiTitle: { color: '#FCD34D', fontSize: 16, fontWeight: 'bold' },
  xaiMessage: { color: '#D1D5DB', fontSize: 15, lineHeight: 24, letterSpacing: 0.5 },
  missionButton: {
    marginTop: 20,
    backgroundColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  missionButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'center'
  },

  chartDescBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)'
  },
  chartDescText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 10,
    flex: 1
  },

  chartContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    paddingVertical: 16,
    paddingLeft: 8,
    paddingRight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden'
  },
  emptyChart: { height: 200, width: '100%', justifyContent: 'center', alignItems: 'center' },

  // ✅ 통일된 히스토리 리스트 디자인 스타일 (삭제 버튼 포함)
  historyList: { backgroundColor: '#1F2937', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  historyItemContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 12 },
  historyItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  historyIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  historyModeName: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  historyDate: { color: '#6B7280', fontSize: 12 },
  historyItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyScore: { color: '#34D399', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, marginLeft: 4 },
  emptyText: { color: '#6B7280', textAlign: 'center', paddingVertical: 30 },

  // ✅ 모달 리포트 전용 UI 스타일
  reportContainer: { flex: 1, backgroundColor: '#111827', padding: 24 },
  reportHeader: { marginTop: 40, marginBottom: 30 },
  reportTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  reportDate: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  difficultyBadge: { alignSelf:'flex-start', backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingVertical:4, paddingHorizontal:8, borderRadius:8, marginTop:8 },
  difficultyText: { color: '#60A5FA', fontWeight:'bold', fontSize:12 },
  scoreCard: { backgroundColor: '#34D399', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  scoreLabel: { color: '#064E3B', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  scoreValue: { color: '#064E3B', fontSize: 48, fontWeight: 'bold' },
  countBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },

  subStatBox: { flex: 1, backgroundColor: '#1F2937', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  subStatLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 10, marginBottom: 4 },
  subStatValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  subStatSubText: { color: '#6B7280', fontSize: 10, marginTop: 4 },

  sectionContainer: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  listItem: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  listText: { color: '#D1D5DB', fontSize: 15, flex: 1, lineHeight: 22 },
  trainingText: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  closeReportButton: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  closeReportText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});