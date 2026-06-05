// utils/racketRecommender.ts
import { AnalysisReport } from '../Screens/AI/AIAnalysis';

export const THRESHOLD_FAST_SWING = 100;
export const PRO_LEVEL_RMR = 1300;
export const ADVANCED_LEVEL_RMR = 1100;

const BASE_SCORE = 50;
const SCORE_THRESHOLDS = {
  ATTACK: 70,
  DEFENSE: 35,
  STIFF: 65,
};
const MATCH_SCORES = {
  EXACT: 50,
  COMPROMISE: 20,
};

export interface RacketDetail {
  id?: string;
  name: string;
  weight: string;
  tension: string;
  features: string[];
  balanceType?: string; // 'ATTACK' | 'ALLROUND' | 'DEFENSE'
  shaftType?: string;   // 'STIFF' | 'SOFT'
  tier?: string;        // 'PREMIUM' | 'BUDGET'
  imageUrl?: string;
}

export interface RacketRecommendation {
  id?: string;
  balance: string;
  shaft: string;
  description: string;           // 기존 화면 레이아웃을 해치지 않을 한 줄 요약
  detailedReasons?: string[];    // '상세 분석 보기' 토글 클릭 시 보여줄 리스트
  suggestedWeight?: string;      // 무게 추천 가이드
  suggestedTension?: string;     // 텐션 추천 가이드
  premium: RacketDetail;
  budget: RacketDetail;
}

export const recommendRacket = (
  videoHistory: AnalysisReport[],
  currentRmr: number,
  latestFlow: { tempo: number; endurance: number },
  allRackets: RacketDetail[]
): RacketRecommendation | null => {
  if (!allRackets || allRackets.length === 0) return null;

  const reasons: string[] = [];
  const swingReports = videoHistory.filter(r => r.mode === 'SWING');

  const validSwings = swingReports.length;
  const highSpeedSwings = validSwings > 0 ? swingReports.filter(r => r.maxRecord >= 90).length : 0;
  const smashRatio = validSwings > 0 ? highSpeedSwings / validSwings : 0;
  const avgMaxSpeed = validSwings > 0 ? swingReports.reduce((a, r) => a + r.maxRecord, 0) / validSwings : 0;

  let attackScore = BASE_SCORE;
  let stiffnessScore = BASE_SCORE;

  // 상세 분석 기록 수집
  reasons.push(`[플레이 스타일]`);
  if (validSwings > 0) {
    const ratioPercent = (smashRatio * 100).toFixed(0);
    if (smashRatio > 0.4) {
      attackScore += 30;
      reasons.push(`강스윙 비율 ${ratioPercent}% : 공격적인 랠리 성향이 뚜렷합니다.`);
    } else if (smashRatio < 0.2) {
      attackScore -= 20;
      reasons.push(`강스윙 비율 ${ratioPercent}% : 파워보다 안정적인 궤적과 컨트롤을 선호합니다.`);
    } else {
      reasons.push(`강스윙 비율 ${ratioPercent}% : 공격과 수비 밸런스가 우수한 올라운더입니다.`);
    }
  } else {
    reasons.push(`누적 스윙 데이터 부족 : 기준점인 올라운드 성향을 적용했습니다.`);
  }

  if (latestFlow.tempo > latestFlow.endurance + 10) {
    attackScore += 20;
    reasons.push(`템포 우위 : 빠른 경기 운영으로 랠리 주도권 장악에 강점이 있습니다.`);
  } else if (latestFlow.endurance > latestFlow.tempo + 10) {
    attackScore -= 20;
    reasons.push(`지구력 우위 : 안정적인 수비 유지력과 체력전에 강점이 있습니다.`);
  }

  reasons.push(`\n[피지컬 및 실력 지표]`);
  if (avgMaxSpeed > THRESHOLD_FAST_SWING) {
    stiffnessScore += 25;
    reasons.push(`평균 스윙 속도 ${avgMaxSpeed.toFixed(1)}km/h : 라켓의 즉각적인 반응성을 활용할 수 있습니다.`);
  }

  if (currentRmr > PRO_LEVEL_RMR) {
    stiffnessScore += 25;
    reasons.push(`RMR ${currentRmr} (상급) : 단단한 샤프트(Stiff)를 제어하여 타구 정밀도를 극대화할 수 있습니다.`);
  } else if (currentRmr > ADVANCED_LEVEL_RMR) {
    stiffnessScore += 10;
    reasons.push(`RMR ${currentRmr} (중급) : 점진적으로 탄성이 적은 샤프트로 스윙 폼 고도화를 추천합니다.`);
  } else {
    stiffnessScore -= 15;
    reasons.push(`RMR ${currentRmr} (입문) : 힘 손실 및 부상 방지를 위해 유연한 샤프트(Soft)의 관용성 활용을 추천합니다.`);
  }

  let idealBalance: 'ATTACK' | 'ALLROUND' | 'DEFENSE' = 'ALLROUND';
  let balanceStr = "올라운드형";
  if (attackScore >= SCORE_THRESHOLDS.ATTACK) {
    idealBalance = 'ATTACK';
    balanceStr = "헤드헤비 (공격형)";
  } else if (attackScore <= SCORE_THRESHOLDS.DEFENSE) {
    idealBalance = 'DEFENSE';
    balanceStr = "헤드라이트 (수비형)";
  }

  let idealShaft: 'STIFF' | 'SOFT' = stiffnessScore >= SCORE_THRESHOLDS.STIFF ? 'STIFF' : 'SOFT';
  let shaftStr = idealShaft === 'STIFF' ? "스티프 (딱딱한)" : "소프트 (유연한)";

  const suggestedWeight = currentRmr > ADVANCED_LEVEL_RMR ? '3U ~ 4U (83g ~ 89g)' : '4U ~ 5U (75g ~ 84g)';
  const suggestedTension = currentRmr > PRO_LEVEL_RMR ? '26~28 lbs' : (currentRmr > ADVANCED_LEVEL_RMR ? '24~26 lbs' : '22~24 lbs');

  // 기본 인터페이스용 한 줄 요약 텍스트
  const shortDescription = `현재 누적된 데이터를 기반으로, [${balanceStr}] 밸런스와 [${shaftStr}] 샤프트를 조합한 라켓이 가장 이상적입니다.`;

  const calculateMatchScore = (racket: RacketDetail) => {
    let score = 0;
    if (racket.balanceType === idealBalance) score += MATCH_SCORES.EXACT;
    else if (racket.balanceType === 'ALLROUND') score += MATCH_SCORES.COMPROMISE;

    if (racket.shaftType === idealShaft) score += MATCH_SCORES.EXACT;
    return score;
  };

  const premiumRackets = allRackets
    .filter(r => r.tier === 'PREMIUM')
    .sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));

  const budgetRackets = allRackets
    .filter(r => r.tier === 'BUDGET')
    .sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));

  const finalPremium = premiumRackets.length > 0 ? premiumRackets[0] : allRackets[0];
  const finalBudget = budgetRackets.length > 0 ? budgetRackets[0] : (allRackets[1] || allRackets[0]);

  return {
    balance: balanceStr,
    shaft: shaftStr,
    description: shortDescription,
    detailedReasons: reasons,
    suggestedWeight,
    suggestedTension,
    premium: finalPremium,
    budget: finalBudget
  };
};