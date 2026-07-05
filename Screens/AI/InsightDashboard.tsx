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
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import {
  ArrowLeft, BrainCircuit, TrendingUp, Zap,
  Activity, Move, Music, ChevronRight, Target, Info
} from 'lucide-react-native';

import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

import { AnalysisMode, AnalysisReport } from './AIAnalysis';

const screenWidth = Dimensions.get('window').width;

interface CrossAnalysisResult {
  coachMessage: string;
  missionTitle: string;
  missionType: AnalysisMode;
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

  // Firestore에서 데이터를 가져와 orderBy 문제 우회 처리
  useEffect(() => {
    fetchAndAnalyzeData();
  }, []);

  const fetchAndAnalyzeData = async () => {
    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;

      if (user) {
        const db = getFirestore(getApp());
        const appId = 'rally-app-main';
        const historyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'videoHistory');

        const q = query(historyRef);
        const querySnapshot = await getDocs(q);

        const loadedHistory: AnalysisReport[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loadedHistory.push({
            id: data.id || doc.id,
            date: data.date,
            mode: data.mode as AnalysisMode,
            avgScore: data.avgScore,
            maxRecord: data.maxRecord,
          } as AnalysisReport);
        });

        // Date.now() 기반 ID로 최신순 정렬 후 최대 30개 사용
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

  // ==========================================
  // XAI 기반 다중 모드 교차 분석 (Cross-Modal)
  // ==========================================
  const generateCrossModalInsights = (data: AnalysisReport[]) => {
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

    // 데이터 최신순에서 오래된 순으로 뒤집어서 그래프 시계열 생성 (최대 6개)
    const recent6 = data.slice(0, 6).reverse();

    // 🔥 X축 날짜 텍스트 안전하게 파싱 (잘림 방지)
    const chartLabels = recent6.map(d => {
      // 정규식으로 "월/일" 또는 "월.일" 추출
      const match = d.date.match(/(\d{1,2})[\.\/]\s*(\d{1,2})/);
      const dateStr = match ? `${match[1]}/${match[2]}` : d.date.substring(0, 5);

      const modeMap = { SWING: '스윙', LUNGE: '런지', FOOTWORK: '스텝', RHYTHM: '랠리' };
      return `${dateStr} ${modeMap[d.mode]}`;
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

  const getModeIcon = (mode: AnalysisMode) => {
    switch(mode) {
      case 'SWING': return <Zap size={18} color="#F472B6" />;
      case 'LUNGE': return <Activity size={18} color="#60A5FA" />;
      case 'FOOTWORK': return <Move size={18} color="#FCD34D" />;
      case 'RHYTHM': return <Music size={18} color="#10B981" />;
    }
  };

  const getModeName = (mode: AnalysisMode) => {
    switch(mode) {
      case 'SWING': return "스윙 분석";
      case 'LUNGE': return "준비 자세";
      case 'FOOTWORK': return "풋워크";
      case 'RHYTHM': return "나와의 랠리";
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

  // 동적 가로 너비 계산 (최소 화면 크기를 보장하며 데이터가 많으면 확장됨)
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

        {/* 🔥 차트 설명 박스 추가 */}
        <View style={styles.chartDescBox}>
          <Info size={16} color="#60A5FA" />
          <Text style={styles.chartDescText}>
            그래프의 수치는 각 훈련의 <Text style={{fontWeight: 'bold', color: 'white'}}>'종합 달성 점수'</Text>입니다.{'\n'}
            (기초 분석: 100점 만점 / 랠리 모드: 콤보 누적 점수)
          </Text>
        </View>

        <View style={styles.chartContainer}>
          {insights && insights.trendChart.labels.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              <LineChart
                data={insights.trendChart}
                width={chartWidth}
                height={240}
                verticalLabelRotation={-30} // 🔥 라벨 회전으로 겹침 완벽 방지
                fromZero={true} // 스케일 안정화
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
              <View style={styles.historyItemLeft}>
                <View style={styles.historyIconBox}>
                  {getModeIcon(item.mode)}
                </View>
                <View>
                  <Text style={styles.historyModeName}>{getModeName(item.mode)}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
              </View>
              <View style={styles.historyItemRight}>
                <Text style={styles.historyScore}>{item.avgScore}점</Text>
                <ChevronRight size={20} color="#4B5563" />
              </View>
            </View>
          ))}
          {history.length === 0 && (
            <Text style={styles.emptyText}>저장된 기록이 없습니다.</Text>
          )}
        </View>

      </ScrollView>
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

  historyList: { backgroundColor: '#1F2937', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  historyItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  historyIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  historyModeName: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  historyDate: { color: '#6B7280', fontSize: 12 },
  historyItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyScore: { color: '#34D399', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#6B7280', textAlign: 'center', paddingVertical: 30 },
});