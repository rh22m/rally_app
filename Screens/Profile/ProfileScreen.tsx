import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Settings, Shield, LogOut, ChevronRight, History, Dumbbell, Zap, Target, Award, ShoppingBag, X, CheckCircle2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Text as SvgText, TSpan } from 'react-native-svg';
import { getRmrTier } from '../../utils/rmrCalculator';
import { recommendRacket, RacketDetail } from '../../utils/racketRecommender';
import { AnalysisReport } from '../AI/AIAnalysis';

interface ProfileScreenProps {
  onLogout: () => void;
}

const TIER_IMAGES = {
  gold: require('../../assets/images/tier_gold.png'),
  silver: require('../../assets/images/tier_silver.png'),
  bronze: require('../../assets/images/tier_bronze.png'),
};

const RACKET_IMAGES: Record<string, any> = {
  ast_100ZZ: require('../../assets/images/rackets/ast_100ZZ.png'),
  apx_ziggler: require('../../assets/images/rackets/apx_ziggler.png'),
  ast_77PRO: require('../../assets/images/rackets/ast_77PRO.png'),
  vic_K12: require('../../assets/images/rackets/vic_K12.png'),
  acs_11PRO: require('../../assets/images/rackets/acs_11PRO.png'),
  vic_7K: require('../../assets/images/rackets/vic_7K.png'),
  vic_09: require('../../assets/images/rackets/vic_09.png'),
  mus_POW: require('../../assets/images/rackets/mus_POW.png'),
  nano_1000Z: require('../../assets/images/rackets/nano_1000Z.png'),
  nano_900POW: require('../../assets/images/rackets/nano_900POW.png'),
  nano_700: require('../../assets/images/rackets/nano_700.png'),
  nano_001: require('../../assets/images/rackets/nano_001.png'),
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

  // 상세보기 모달 상태 구성
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRacket, setSelectedRacket] = useState<RacketDetail | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const PYRAMID_HEIGHT = 200;
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
    /**
     * [임의 데이터 기반 스타일 분석 주석]
     * 1. 3번의 스윙 중 90km/h 이상이 100% (3/3)이므로 smashRatio 임계값 0.4를 상회함 -> 공격 가산점 부여
     * 2. 최신 경기 flow 데이터에서 Tempo(0.85)가 Endurance(0.45)보다 높아 빠른 템포 선호 -> 공격 가산점 부여
     * 3. 위 결과로 최종 밸런스는 "Head Heavy (공격형)" 도출
     * 4. RMR 1180은 중급자 가산점(1점)을 받으며, 평균 스윙 속도(약 106km/h)가 기준값(100)을 상회하므로
     * 최종 스피드 점수가 3점이 되어 "Stiff (딱딱함)" 샤프트가 추천됨.
     */
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

  const racketResult = useMemo(() => {
    return recommendRacket(user.videoHistory, user.rmr, user.latestFlow);
  }, [user.rmr, user.videoHistory, user.latestFlow]);

  const handleTierPress = (tierName: string) => {
    if (selectedTierName === tierName) setSelectedTierName(null);
    else setSelectedTierName(tierName);
  };

  const openRacketDetail = (racket: RacketDetail) => {
    setSelectedRacket(racket);
    setDetailModalVisible(true);
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
              <Text style={styles.pyramidSubtitle}>{selectedTierName ? '다시 누르면 내 정보로 돌아갑니다' : '다른 등급을 눌러 상세 정보를 확인하세요'}</Text>
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
                    let colorKey = (isCurrent || isSelected) ? level.type : 'disabled';
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

                    let line1 = '', line2 = '', labelColor = '#9CA3AF';
                    if (isTarget) {
                      const diff = level.minRmr - user.rmr;
                      if (isCurrent) { line1 = `◀ ${level.name} (현재 ${user.rmr}점)`; line2 = `   구간: ${level.minRmr} ~ ${TIER_LEVELS[index - 1]?.minRmr - 1 || 'MAX'}점`; labelColor = '#34D399'; }
                      else if (diff > 0) { line1 = `◀ ${level.name} (컷: ${level.minRmr}점)`; line2 = `   승급까지 +${diff}점 필요`; labelColor = '#F87171'; }
                      else { line1 = `◀ ${level.name} (컷: ${level.minRmr}점)`; line2 = `   달성 완료 (여유 +${Math.abs(diff)}점)`; labelColor = '#60A5FA'; }
                    }

                    return (
                      <G key={level.name} onPress={() => handleTierPress(level.name)}>
                        <Path d={sidePath} fill={colorSet.side} stroke={colorSet.side} strokeWidth={1} />
                        <Path d={frontPath} fill={`url(#grad_${colorKey})`} stroke={isSelected ? '#FFFFFF' : (isCurrent ? '#FFFFFF' : '#111827')} strokeWidth={isSelected ? 2 : 0.5} />
                        {isTarget && (
                          <SvgText fill={labelColor} fontSize="14" fontWeight="bold" x={xBottomRight + DEPTH_X + 12} y={yBottom - (PYRAMID_HEIGHT / totalLevels / 2)} textAnchor="start">
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
                  <Text style={styles.racketMainStyle}>플레이 스타일: {racketResult.balance}</Text>
                  <Text style={styles.racketSubStyle}>추천 샤프트: {racketResult.shaft}</Text>
                </View>
              </View>

              <Text style={styles.analysisDesc}>{racketResult.description}</Text>

              <View style={styles.racketGrid}>
                {/* 프리미엄 카드 */}
                <View style={styles.productCard}>
                  <View style={styles.productBadge}><Award size={12} color="#FDB931" /><Text style={styles.productBadgeText}>프리미엄</Text></View>
                  <Text style={styles.productName}>{racketResult.premium.name}</Text>
                  <Text style={styles.productTag}>숙련자용 최고 사양</Text>
                  <TouchableOpacity style={[styles.buyButton, {backgroundColor: '#374151'}]} onPress={() => openRacketDetail(racketResult.premium)}><ShoppingBag size={16} color="white" /><Text style={styles.buyText}>상세보기</Text></TouchableOpacity>
                </View>

                {/* 가성비 카드 */}
                <View style={styles.productCard}>
                  <View style={[styles.productBadge, {backgroundColor: 'rgba(96, 165, 250, 0.2)'}]}><Zap size={12} color="#60A5FA" /><Text style={[styles.productBadgeText, {color: '#60A5FA'}]}>가성비</Text></View>
                  <Text style={styles.productName}>{racketResult.budget.name}</Text>
                  <Text style={styles.productTag}>최고의 효율과 퍼포먼스</Text>
                  <TouchableOpacity style={[styles.buyButton, {backgroundColor: '#374151'}]} onPress={() => openRacketDetail(racketResult.budget)}><ShoppingBag size={16} color="white" /><Text style={styles.buyText}>상세보기</Text></TouchableOpacity>
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

      {/* 라켓 상세 정보 팝업 모달 */}
      <Modal animationType="slide" transparent={true} visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>라켓 상세 정보</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}><X size={24} color="white" /></TouchableOpacity>
            </View>

            <View style={styles.modalScroll}>
              <View style={styles.racketImagePlaceholder}>
                {selectedRacket && RACKET_IMAGES[selectedRacket.id] ? (
                  <Image source={RACKET_IMAGES[selectedRacket.id]} style={{ width: 200, height: 200, borderRadius: 20, resizeMode: 'contain' }} />
                ) : (
                  <Text style={{ color: '#4B5563' }}>이미지 불러오기 실패</Text>
                )}
              </View>

              <Text style={styles.detailRacketName}>{selectedRacket?.name}</Text>

              <View style={styles.specContainer}>
                <View style={styles.specRow}><Target size={18} color="#34D399" /><Text style={styles.specLabel}>무게:</Text><Text style={styles.specValue}>{selectedRacket?.weight}</Text></View>
                <View style={styles.specRow}><Zap size={18} color="#FDB931" /><Text style={styles.specLabel}>권장 장력:</Text><Text style={styles.specValue}>{selectedRacket?.tension}</Text></View>
              </View>

              <Text style={styles.featureTitle}>주요 특징</Text>
              {selectedRacket?.features.map((f, i) => (
                <View key={i} style={styles.featureRow}><CheckCircle2 size={16} color="#34D399" /><Text style={styles.featureText}>{f}</Text></View>
              ))}
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  pyramidSection: { alignItems: 'center', marginBottom: 0, marginTop: 2.7, },
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
  productBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(253, 185, 49, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 2, marginBottom: 8 },
  productBadgeText: { color: '#FDB931', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  productName: { color: 'white', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginTop:8, height: 28 },
  productTag: { color: '#6B7280', fontSize: 10, marginBottom: 10 },
  buyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34D399', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  buyText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  menuSection: { backgroundColor: '#1F2937', marginTop: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  menuText: { flex: 1, color: 'white', marginLeft: 12, fontSize: 15 },

  // 모달 스타일 (규격 보존 및 레이아웃 정의)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#1F2937', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#374151' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#9CA3AF', fontSize: 14, fontWeight: 'bold' },
  modalScroll: { alignItems: 'center' },
  racketImagePlaceholder: { width: 200, height: 200, backgroundColor: '#111827', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#374151' },
  detailRacketName: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  specContainer: { width: '100%', backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 20 },
  specRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  specLabel: { color: '#9CA3AF', fontSize: 14, marginLeft: 10, width: 70 },
  specValue: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  featureTitle: { color: 'white', fontSize: 15, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  featureText: { color: '#D1D5DB', fontSize: 13, marginLeft: 10 },
  modalCloseBtn: { backgroundColor: '#34D399', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalCloseBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
});