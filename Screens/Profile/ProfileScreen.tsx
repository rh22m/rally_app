import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Settings, Shield, LogOut, ChevronRight, History, Dumbbell, Zap, Target, Award, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Text as SvgText, TSpan } from 'react-native-svg';
import { getRmrTier } from '../../utils/rmrCalculator';
import { recommendRacket } from '../../utils/racketRecommender';
import { AnalysisReport } from '../AI/AIAnalysis';

interface ProfileScreenProps {
  onLogout: () => void;
}

const TIER_IMAGES = {
  gold: require('../../assets/images/tier_gold.png'),
  silver: require('../../assets/images/tier_silver.png'),
  bronze: require('../../assets/images/tier_bronze.png'),
};

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

const COLORS = {
  gold: { front: ['#FFD700', '#FDB931'], side: '#B8860B' },
  silver: { front: ['#E0E0E0', '#BDBDBD'], side: '#757575' },
  bronze: { front: ['#FFA07A', '#CD7F32'], side: '#8B4513' },
  disabled: { front: ['#4B5563', '#374151'], side: '#1F2937' }
};

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'tier' | 'info' | 'racket'>('tier');
  const [selectedTierName, setSelectedTierName] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const PYRAMID_HEIGHT = 200; // 피라미드 높이 상향 조정
  const PYRAMID_WIDTH = 210;
  const CENTER_X = screenWidth / 3;
  const START_Y = 20;
  const DEPTH_X = 6;
  const DEPTH_Y = -12;

  // 데모 데이터 (실제 데이터는 API/DB 연동)
  const user = {
    name: '배드민턴 마스터',
    location: '안양시 동안구',
    rmr: 1180,
    wins: 15,
    losses: 8,
    avatar: require('../../assets/images/card-logo.png'),
    videoHistory: [
        { id: '1', mode: 'SWING', maxRecord: 115 } as AnalysisReport,
        { id: '2', mode: 'SWING', maxRecord: 95 } as AnalysisReport,
        { id: '3', mode: 'SWING', maxRecord: 108 } as AnalysisReport,
    ],
    latestFlow: { tempo: 0.85, endurance: 0.45 }
  };

  const currentTierName = getRmrTier(user.rmr);
  const currentTierData = TIER_LEVELS.find(t => t.name === currentTierName);
  const currentTierType = currentTierData ? currentTierData.type : 'bronze';
  const targetTierName = selectedTierName ?? currentTierName;

  // 라켓 추천 결과 도출
  const racketResult = useMemo(() => {
    return recommendRacket(user.videoHistory, user.rmr, user.latestFlow);
  }, [user.rmr, user.videoHistory, user.latestFlow]);

  const handleTierPress = (tierName: string) => {
    if (selectedTierName === tierName) setSelectedTierName(null);
    else setSelectedTierName(tierName);
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
        {/* 유저 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <Image source={user.avatar} style={styles.avatar} />
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.location}>{user.location}</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.profileRight}>
            <View style={styles.statItem}><Text style={styles.statLabel}>티어</Text><Text style={styles.statValueTier}>{currentTierName}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>전적</Text><Text style={styles.statValue}>{user.wins}승 {user.losses}패</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>매너</Text><Text style={styles.statValue}>4.8 / 5.0</Text></View>
          </View>
        </View>

        {/* 탭 네비게이션 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'tier' && styles.activeTabButton]} onPress={() => setActiveTab('tier')}>
            <Text style={[styles.tabText, activeTab === 'tier' && styles.activeTabText]}>티어</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'info' && styles.activeTabButton]} onPress={() => setActiveTab('info')}>
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>티어 정보</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'racket' && styles.activeTabButton]} onPress={() => setActiveTab('racket')}>
            <Text style={[styles.tabText, activeTab === 'racket' && styles.activeTabText]}>장비 추천</Text>
          </TouchableOpacity>
        </View>

        {/* 탭별 콘텐츠 */}
        <View style={styles.contentSection}>
          {activeTab === 'tier' ? (
            <View style={styles.tierTabContent}>
              <View style={styles.tierImageContainer}>
                 <Image source={TIER_IMAGES[currentTierType as keyof typeof TIER_IMAGES]} style={styles.mainTierImage} resizeMode="contain" />
              </View>
              <Text style={styles.myScoreText}>{user.rmr} RMR</Text>
              <Text style={styles.myTierLabel}>현재 나의 티어: <Text style={{color: COLORS[currentTierType as keyof typeof COLORS].front[0]}}>{currentTierName}</Text></Text>
            </View>
          ) : activeTab === 'info' ? (
            <View style={styles.pyramidSection}>
              <Text style={styles.pyramidTitle}>티어 표</Text>
              <Text style={styles.pyramidSubtitle}>
                {selectedTierName ? '다시 누르면 내 정보로 돌아갑니다' : '다른 등급을 눌러 상세 정보를 확인하세요'}
              </Text>
              <View style={styles.svgContainer}>
                <Svg height={PYRAMID_HEIGHT + 42} width={screenWidth}>
                  <Defs>
                    {Object.keys(COLORS).map((key) => (
                      <LinearGradient id={`grad_${key}`} x1="0" y1="0" x2="1" y2="1" key={key}>
                        <Stop offset="0" stopColor={COLORS[key as keyof typeof COLORS].front[0]} stopOpacity="1" />
                        <Stop offset="1" stopColor={COLORS[key as keyof typeof COLORS].front[1]} stopOpacity="1" />
                      </LinearGradient>
                    ))}
                  </Defs>
                  {TIER_LEVELS.map((level, index) => {
                    const isCurrent = level.name === currentTierName;
                    const isSelected = level.name === selectedTierName;
                    const isTarget = level.name === targetTierName;
                    let colorKey = 'disabled';
                    if (isCurrent || isSelected) colorKey = level.type;
                    const colorSet = COLORS[colorKey as keyof typeof COLORS];

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

                    const frontPath = `M ${xTopLeft} ${yTop} L ${xTopRight} ${yTop} L ${xBottomRight} ${yBottom} L ${xBottomLeft} ${yBottom} Z`;
                    const sidePath = `M ${xTopRight} ${yTop} L ${xTopRight + DEPTH_X} ${yTop + DEPTH_Y} L ${xBottomRight + DEPTH_X} ${yBottom + DEPTH_Y} L ${xBottomRight} ${yBottom} Z`;

                    // --- [복구된 상세 텍스트 로직] ---
                    let line1 = '';
                    let line2 = '';
                    let labelColor = '#9CA3AF';

                     if (isTarget) {
                       const diff = level.minRmr - user.rmr;
                       if (isCurrent) {
                         line1 = `◀ ${level.name} (현재 ${user.rmr}점)`;
                         const nextTier = TIER_LEVELS[index - 1];
                         const rangeEnd = nextTier ? nextTier.minRmr - 1 : 'MAX';
                         line2 = `   구간: ${level.minRmr} ~ ${rangeEnd}점`;
                         labelColor = '#34D399';
                       } else if (diff > 0) {
                         line1 = `◀ ${level.name} (컷: ${level.minRmr}점)`;
                         line2 = `   승급까지 +${diff}점 필요`;
                         labelColor = '#F87171';
                       } else {
                         line1 = `◀ ${level.name} (컷: ${level.minRmr}점)`;
                         line2 = `   달성 완료 (여유 +${Math.abs(diff)}점)`;
                         labelColor = '#60A5FA';
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
                            fill={labelColor}
                            fontSize="14"
                            fontWeight="bold"
                            x={xBottomRight + DEPTH_X + 12}
                            y={yBottom - (PYRAMID_HEIGHT / totalLevels / 2)}
                            textAnchor="start"
                          >
                            <TSpan x={xBottomRight + DEPTH_X + 12} dy="-6">{line1}</TSpan>
                            <TSpan x={xBottomRight + DEPTH_X + 12} dy="16" fontSize="11" fontWeight="normal" fill="#9CA3AF">{line2}</TSpan>
                          </SvgText>
                        )}
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </View>
          ) : (
            /* 장비 추천 섹션 */
            <View style={styles.racketSection}>
              <View style={styles.racketHeaderCard}>
                <Dumbbell size={28} color="#34D399" />
                <View style={{marginLeft: 12}}>
                  <Text style={styles.racketMainStyle}>{racketResult.balance}</Text>
                  <Text style={styles.racketSubStyle}>{racketResult.shaft}</Text>
                </View>
              </View>

              <Text style={styles.analysisDesc}>{racketResult.description}</Text>

              <View style={styles.racketGrid}>
                {/* 프리미엄 카드 */}
                <View style={styles.productCard}>
                  <View style={styles.productBadge}><Award size={12} color="#FDB931" /><Text style={styles.productBadgeText}>프리미엄</Text></View>
                  <Text style={styles.productName}>{racketResult.premiumModel}</Text>
                  <Text style={styles.productTag}>숙련자용 최고 사양</Text>
                  <TouchableOpacity style={styles.buyButton}><ShoppingBag size={16} color="white" /><Text style={styles.buyText}>상세보기</Text></TouchableOpacity>
                </View>

                {/* 가성비 카드 */}
                <View style={styles.productCard}>
                  <View style={[styles.productBadge, {backgroundColor: 'rgba(96, 165, 250, 0.2)'}]}><Zap size={12} color="#60A5FA" /><Text style={[styles.productBadgeText, {color: '#60A5FA'}]}>가성비</Text></View>
                  <Text style={styles.productName}>{racketResult.budgetModel}</Text>
                  <Text style={styles.productTag}>최고의 효율과 퍼포먼스</Text>
                  <TouchableOpacity style={[styles.buyButton, {backgroundColor: '#374151'}]}><ShoppingBag size={16} color="white" /><Text style={styles.buyText}>상세보기</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}><Settings size={22} color="#9CA3AF" /><Text style={styles.menuText}>계정 설정</Text><ChevronRight size={20} color="#9CA3AF" /></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}><Shield size={22} color="#9CA3AF" /><Text style={styles.menuText}>개인정보 및 보안</Text><ChevronRight size={20} color="#9CA3AF" /></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}><LogOut size={22} color="#EF4444" /><Text style={[styles.menuText, {color: '#EF4444'}]}>로그아웃</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#1F2937' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  historyButton: { padding: 4 },
  profileCard: { flexDirection: 'row', backgroundColor: '#1F2937', margin: 16, borderRadius: 16, padding: 16, alignItems: 'center' },
  profileLeft: { flex: 4, alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8, backgroundColor: '#374151' },
  name: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  location: { fontSize: 11, color: '#9CA3AF' },
  verticalDivider: { width: 1, height: '80%', backgroundColor: '#374151', marginHorizontal: 15 },
  profileRight: { flex: 6, gap: 8 },
  statItem: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { color: '#9CA3AF', fontSize: 13 },
  statValue: { color: 'white', fontWeight: 'bold' },
  statValueTier: { color: '#34D399', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1F2937', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#374151' },
  tabText: { color: '#9CA3AF', fontSize: 14 },
  activeTabText: { color: 'white', fontWeight: 'bold' },
  contentSection: { minHeight: 300 },
  tierTabContent: { alignItems: 'center', paddingVertical: 1 },
  tierImageContainer: { width: 200, height: 200, marginBottom: 15 },
  mainTierImage: { width: '100%', height: '100%' },
  myScoreText: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  myTierLabel: { color: '#9CA3AF', marginTop: 4, marginBottom: 40 },
  pyramidSection: { alignItems: 'center', marginBottom: 0, marginTop: 2, },
  pyramidTitle: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1.5 },
  pyramidSubtitle: { color: '#6B7280', fontSize: 11, marginBottom: 20, },
  svgContainer: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10, },
  racketSection: { paddingHorizontal: 16 },
  racketHeaderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#34D399' },
  racketMainStyle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  racketSubStyle: { color: '#34D399', fontSize: 14 },
  analysisDesc: { color: '#9CA3AF', fontSize: 13, marginVertical: 16, lineHeight: 20, textAlign: 'center' },
  racketGrid: { flexDirection: 'row', gap: 12 },
  productCard: { flex: 1, backgroundColor: '#1F2937', borderRadius: 16, padding: 12, alignItems: 'center' },
  productBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(253, 185, 49, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  productBadgeText: { color: '#FDB931', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  productName: { color: 'white', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, height: 36 },
  productTag: { color: '#6B7280', fontSize: 10, marginBottom: 12 },
  buyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34D399', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  buyText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  menuSection: { backgroundColor: '#1F2937', marginTop: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  menuText: { flex: 1, color: 'white', marginLeft: 12, fontSize: 15 },
});