import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

// Firebase 연동을 위한 임포트 추가
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

export default function MatchHistoryScreen() {
  const navigation = useNavigation();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(getApp());
    const user = auth.currentUser;
    if (!user) {
        setLoading(false);
        return;
    }

    const db = getFirestore(getApp());
    const appId = 'rally-app-main';
    const historyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'matchHistory');
    // 최신 경기가 위로 오도록 내림차순 정렬
    const q = query(historyRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        const isWin = data.team2Wins > data.team1Wins;
        const isDraw = data.team2Wins === data.team1Wins;

        let result = 'LOSS';
        if (isWin) result = 'WIN';
        else if (isDraw) result = 'DRAW';

        // createdAt 타임스탬프를 YYYY.MM.DD 형식으로 변환
        const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;

        return {
          id: doc.id,
          date: dateStr,
          title: '랠리 매치', // 기본 타이틀 고정 (추후 매칭 시스템 고도화 시 제목 연동 가능)
          result: result,
          score: `${data.team2Wins} - ${data.team1Wins}`,
          rmrChange: Math.round(data.rmrChange || 0),
          opponent: data.team1Name || '상대팀',
        };
      });
      setHistoryData(list);
      setLoading(false);
    }, (error) => {
      console.error("Match History fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const isWin = item.result === 'WIN';
    const isDraw = item.result === 'DRAW';

    return (
      <View style={styles.card}>
        {/* 날짜 및 구분 */}
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.date}</Text>
          <View style={[styles.resultBadge, isWin ? styles.bgWin : (isDraw ? styles.bgDraw : styles.bgLoss)]}>
            <Text style={[styles.resultText, isWin ? styles.textWin : (isDraw ? styles.textDraw : styles.textLoss)]}>
              {item.result}
            </Text>
          </View>
        </View>

        {/* 경기 내용 */}
        <View style={styles.cardBody}>
          <View style={styles.infoContainer}>
            <Text style={styles.matchTitle}>{item.title}</Text>
            <Text style={styles.opponentText}>vs {item.opponent}</Text>
          </View>

          {/* 점수 및 RMR 변동 */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{item.score}</Text>
            <View style={styles.rmrContainer}>
              {isWin ? (
                <TrendingUp size={16} color="#34D399" />
              ) : isDraw ? (
                <Minus size={16} color="#9CA3AF" />
              ) : (
                <TrendingDown size={16} color="#EF4444" />
              )}
              <Text style={[styles.rmrText, isWin ? styles.textWin : (isDraw ? styles.textDraw : styles.textLoss)]}>
                {item.rmrChange > 0 ? '+' : ''}{item.rmrChange}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>경기 기록</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 리스트 로딩 및 빈 화면 처리 */}
      {loading ? (
        <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#34D399" />
        </View>
      ) : historyData.length === 0 ? (
        <View style={styles.centerBox}>
            <Text style={{color: '#9CA3AF'}}>저장된 경기 기록이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bgWin: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)', // Green background
  },
  bgDraw: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)', // Gray background
  },
  bgLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red background
  },
  resultText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textWin: {
    color: '#34D399',
  },
  textDraw: {
    color: '#9CA3AF',
  },
  textLoss: {
    color: '#EF4444',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  matchTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  opponentText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rmrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rmrText: {
    fontSize: 14,
    fontWeight: '600',
  },
});