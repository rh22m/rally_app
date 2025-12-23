import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Settings, Shield, LogOut, ChevronRight, History } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Text as SvgText, TSpan } from 'react-native-svg';
import { getRmrTier } from '../../utils/rmrCalculator';

interface ProfileScreenProps {
  onLogout: () => void;
}

// [데이터] 티어 정의 및 커트라인 점수 (Gold 3 -> Bronze 1)
const TIER_LEVELS = [
  { name: 'Gold 1', type: 'gold', minRmr: 1500 },
  { name: 'Gold 2', type: 'gold', minRmr: 1400 },
  { name: 'Gold 3', type: 'gold', minRmr: 1300 },
  { name: 'Silver 1', type: 'silver', minRmr: 1200 },
  { name: 'Silver 2', type: 'silver', minRmr: 1100 },
  { name: 'Silver 3', type: 'silver', minRmr: 1000 },
  { name: 'Bronze 1', type: 'bronze', minRmr: 900 },
  { name: 'Bronze 2', type: 'bronze', minRmr: 800 },
  { name: 'Bronze 3', type: 'bronze', minRmr: 0 },
];

// [설정] 색상 팔레트
const COLORS = {
  gold: { front: ['#FFD700', '#FDB931'], side: '#B8860B' },
  silver: { front: ['#E0E0E0', '#BDBDBD'], side: '#757575' },
  bronze: { front: ['#FFA07A', '#CD7F32'], side: '#8B4513' },
  disabled: { front: ['#4B5563', '#374151'], side: '#1F2937' }
};

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation<any>();

  // [상태] 사용자가 선택한 티어 (없으면 null)
  const [selectedTierName, setSelectedTierName] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const PYRAMID_HEIGHT = 150;
  const PYRAMID_WIDTH = 190;
  const CENTER_X = screenWidth / 3;
  const START_Y = 40;

  const DEPTH_X = 5;
  const DEPTH_Y = -10;

  const user = {
    name: '배드민턴 마스터',
    location: '안양시 동안구',
    rmr: 1180, // 예시: Silver 2
    wins: 15,
    losses: 8,
    avatar: require('../../assets/images/card-logo.png'),
  };

  const currentTier = getRmrTier(user.rmr);

  // 현재 보여줘야 할 정보의 대상 티어 결정
  const targetTierName = selectedTierName ?? currentTier;

  // 티어 클릭 핸들러
  const handleTierPress = (tierName: string) => {
    if (selectedTierName === tierName) {
      setSelectedTierName(null);
    } else {
      setSelectedTierName(tierName);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 정보</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MatchHistory')} style={styles.historyButton}>
          <History size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* [수정] 통합 프로필 카드 섹션 */}
        <View style={styles.profileCard}>
          {/* 좌측: 기본 정보 */}
          <View style={styles.profileLeft}>
            <Image source={user.avatar} style={styles.avatar} />
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.location}>{user.location}</Text>
          </View>

          {/* 구분선 */}
          <View style={styles.verticalDivider} />

          {/* 우측: 통계 정보 */}
          <View style={styles.profileRight}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>티어</Text>
              <Text style={styles.statValueTier}>{currentTier}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>전적</Text>
              <Text style={styles.statValue}>{user.wins}승 {user.losses}패</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>매너</Text>
              <Text style={styles.statValue}>4.8 / 5.0</Text>
            </View>
          </View>
        </View>

        <View style={styles.pyramidSection}>
          <Text style={styles.pyramidTitle}>티어 표</Text>
          <Text style={styles.pyramidSubtitle}>
            {selectedTierName ? '다시 누르면 내 정보로 돌아갑니다' : '다른 등급을 눌러 정보를 확인하세요'}
          </Text>

          <View style={styles.svgContainer}>
            <Svg height={PYRAMID_HEIGHT + 70} width={screenWidth}>
              <Defs>
                {Object.keys(COLORS).map((key) => (
                  <LinearGradient id={`grad_${key}`} x1="0" y1="0" x2="1" y2="1" key={key}>
                    <Stop offset="0" stopColor={COLORS[key as keyof typeof COLORS].front[0]} stopOpacity="1" />
                    <Stop offset="1" stopColor={COLORS[key as keyof typeof COLORS].front[1]} stopOpacity="1" />
                  </LinearGradient>
                ))}
              </Defs>

              {TIER_LEVELS.map((level, index) => {
                const isCurrent = level.name === currentTier;
                const isSelected = level.name === selectedTierName;
                const isTarget = level.name === targetTierName;

                let colorKey = 'disabled';
                if (isCurrent || isSelected) colorKey = level.type;
                const colorSet = COLORS[colorKey as keyof typeof COLORS];

                // 좌표 계산
                const totalLevels = TIER_LEVELS.length;
                const topRatio = index / totalLevels;
                const bottomRatio = (index + 1) / totalLevels;

                const yTop = START_Y + (topRatio * PYRAMID_HEIGHT);
                const yBottom = START_Y + (bottomRatio * PYRAMID_HEIGHT);
                const wTop = PYRAMID_WIDTH * topRatio;
                const wBottom = PYRAMID_WIDTH * bottomRatio;

                const xTopLeft = CENTER_X - (wTop / 2);
                const xTopRight = CENTER_X + (wTop / 2);
                const xBottomLeft = CENTER_X - (wBottom / 2);
                const xBottomRight = CENTER_X + (wBottom / 2);

                const dX = DEPTH_X;
                const dY = DEPTH_Y;

                const frontPath = `M ${xTopLeft} ${yTop} L ${xTopRight} ${yTop} L ${xBottomRight} ${yBottom} L ${xBottomLeft} ${yBottom} Z`;
                const sidePath = `M ${xTopRight} ${yTop} L ${xTopRight + dX} ${yTop + dY} L ${xBottomRight + dX} ${yBottom + dY} L ${xBottomRight} ${yBottom} Z`;

                // 정보 텍스트
                let line1 = '';
                let line2 = '';
                let textColor = '#9CA3AF';

                if (isTarget) {
                  const diff = level.minRmr - user.rmr;
                  if (isCurrent) {
                    line1 = `◀ ${level.name} (현재 ${user.rmr}점)`;
                    const nextTier = TIER_LEVELS[index - 1];
                    const rangeEnd = nextTier ? nextTier.minRmr - 1 : 'MAX';
                    line2 = `   구간: ${level.minRmr} ~ ${rangeEnd}점`;
                    textColor = '#34D399';
                  } else if (diff > 0) {
                    line1 = `◀ ${level.name} (컷: ${level.minRmr}점)`;
                    line2 = `   승급까지 +${diff}점 필요`;
                    textColor = '#F87171';
                  } else {
                    line1 = `◀ ${level.name} (컷: ${level.minRmr}점)`;
                    line2 = `   달성 완료 (여유 +${Math.abs(diff)}점)`;
                    textColor = '#60A5FA';
                  }
                }

                return (
                  <G key={level.name} onPress={() => handleTierPress(level.name)}>
                    <Path d={sidePath} fill={colorSet.side} stroke={colorSet.side} strokeWidth={1} />
                    <Path
                      d={frontPath}
                      fill={`url(#grad_${colorKey})`}
                      stroke={isSelected ? '#FFFFFF' : (isCurrent ? '#FFFFFF' : '#111827')}
                      strokeWidth={isSelected ? 2 : (isCurrent ? 1.5 : 0.5)}
                      strokeOpacity={isSelected ? 1 : 0.5}
                    />
                    {isTarget && (
                      <SvgText
                        fill={textColor}
                        fontSize="14"
                        fontWeight="bold"
                        x={xBottomRight + dX + 12}
                        y={yBottom - (PYRAMID_HEIGHT / totalLevels / 2)}
                        textAnchor="start"
                      >
                        <TSpan x={xBottomRight + dX + 12} dy="-6">{line1}</TSpan>
                        <TSpan x={xBottomRight + dX + 12} dy="16" fontSize="11" fontWeight="normal" fill="#9CA3AF">{line2}</TSpan>
                      </SvgText>
                    )}
                  </G>
                );
              })}
            </Svg>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Settings size={22} color="#9CA3AF" />
            <Text style={styles.menuText}>계정 설정</Text>
            <ChevronRight size={20} color="#9CA3AF" style={styles.menuArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Shield size={22} color="#9CA3AF" />
            <Text style={styles.menuText}>개인정보 및 보안</Text>
            <ChevronRight size={20} color="#9CA3AF" style={styles.menuArrow} />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <LogOut size={22} color="#EF4444" />
            <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  historyButton: {
    padding: 4,
  },
  // [수정] 통합 프로필 카드 스타일
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  profileLeft: {
    flex: 4, // 4:6 비율
    alignItems: 'center',
    paddingRight: 0,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 35,
    marginBottom: 10,
    backgroundColor: '#374151',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
    textAlign: 'center',
  },
  location: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '85%',
    backgroundColor: '#374151',
    marginHorizontal: 15,
  },
  profileRight: {
    flex: 6,
    justifyContent: 'center',
    gap: 10, // 아이템 간 간격
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statValue: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  statValueTier: {
    fontSize: 16,
    color: '#34D399', // 티어 강조색
    fontWeight: 'bold',
  },

  pyramidSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  pyramidTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  pyramidSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 10,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  menuSection: { marginTop: 0, backgroundColor: '#1F2937' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  menuText: { flex: 1, fontSize: 16, color: 'white', marginLeft: 16 },
  menuArrow: { marginLeft: 'auto' },
  logoutText: { color: '#EF4444' },
});