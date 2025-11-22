import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  Trophy,
  Flame,
  Clock,
  Instagram,
  MessageCircle,
  Send,
  Facebook,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';

interface GameSummaryProps {
  onNext: () => void;
  result: {
    duration: number;
    team1Wins: number;
    team2Wins: number;
    isForced: boolean;
  };
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const ActivityRing = () => {
  const radiusOuter = 56;
  const radiusInner = 42;
  const strokeWidth = 12;
  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const circumferenceInner = 2 * Math.PI * radiusInner;

  const progressOuter = 0.7;
  const progressInner = 0.8;

  const containerSize = radiusOuter * 2 + strokeWidth;

  return (
    <View style={[styles.ringContainer, { width: containerSize, height: containerSize }]}>
      <Svg width={containerSize} height={containerSize} viewBox={`0 0 ${containerSize} ${containerSize}`}>
        <G transform={`rotate(-90, ${containerSize / 2}, ${containerSize / 2})`}
           x={strokeWidth/2}
           y={strokeWidth/2}
        >
          {/* Outer Ring - Background */}
          <Circle
            cx={radiusOuter}
            cy={radiusOuter}
            r={radiusOuter - strokeWidth / 2}
            fill="none"
            stroke="rgba(52, 211, 153, 0.3)"
            strokeWidth={strokeWidth}
          />
          {/* Outer Ring - Foreground */}
          <Circle
            cx={radiusOuter}
            cy={radiusOuter}
            r={radiusOuter - strokeWidth / 2}
            fill="none"
            stroke="#34D399"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumferenceOuter * progressOuter} ${circumferenceOuter}`}
            strokeLinecap="round"
          />
          {/* Inner Ring - Background */}
          <Circle
            cx={radiusOuter}
            cy={radiusOuter}
            r={radiusInner - strokeWidth / 2}
            fill="none"
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth={strokeWidth}
          />
          {/* Inner Ring - Foreground */}
          <Circle
            cx={radiusOuter}
            cy={radiusOuter}
            r={radiusInner - strokeWidth / 2}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumferenceInner * progressInner} ${circumferenceInner}`}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
};

export function GameSummary({ onNext, result }: GameSummaryProps) {

  const today = new Date();
  const formattedDate = `${today.getFullYear()}.${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;

  const isUserWinner = result.team2Wins > result.team1Wins;
  const resultText = result.isForced ? "" : (isUserWinner ? "승리" : "패배");
  const scoreText = `${result.team2Wins}:${result.team1Wins}`;

  // 1. (신규) 칼로리 계산 (경기 시간(초) * 0.13)
  // .toFixed(0)는 소수점 자리를 반올림하여 정수로 만듭니다.
  const caloriesBurned = (result.duration * 0.13).toFixed(0);

  return (
    <LinearGradient
      colors={['#22D3EE', '#34D399']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>오늘도 랠리하셨군요!</Text>
          <Text style={styles.headerSubtitle}>{formattedDate}</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>한 줄 리포트</Text>
            <Text style={styles.reportBody}>
              경기 후반에도 지치지 않고{'\n'}엄청난 집중력을 보여줬어요!
            </Text>
          </View>

          <ActivityRing />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Trophy size={20} color={isUserWinner && !result.isForced ? "#38BDF8" : "#9CA3AF"} />
              <Text style={styles.statText}>{`${scoreText} ${resultText}`.trim()}</Text>
            </View>
            <View style={styles.statItem}>
              <Flame size={20} color="#F97316" />
              {/* 2. (수정) 고정된 '315 Kcal' 대신 계산된 변수(caloriesBurned) 사용 */}
              <Text style={styles.statText}>{caloriesBurned} Kcal</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={20} color="#34D399" />
              <Text style={styles.statText}>{formatTime(result.duration)}</Text>
            </View>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Rally</Text>
          </View>
        </View>

        {/* Social Share Buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconBg}>
              <Instagram size={28} color="white" />
            </View>
            <Text style={styles.socialLabel}>Instagram</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconBg}>
              <MessageCircle size={28} color="white" />
            </View>
            <Text style={styles.socialLabel}>kakaotalk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconBg}>
              <Send size={28} color="white" />
            </View>
            <Text style={styles.socialLabel}>Messenger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconBg}>
              <Facebook size={28} color="white" />
            </View>
            <Text style={styles.socialLabel}>facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
  },
  reportHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  reportBody: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    textAlign: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: 'white',
    fontSize: 14,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    alignItems: 'center',
    gap: 8,
  },
  socialIconBg: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialLabel: {
    color: 'white',
    fontSize: 12,
  },
  nextButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});