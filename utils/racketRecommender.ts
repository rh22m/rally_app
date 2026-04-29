// utils/racketRecommender.ts
import { AnalysisReport } from '../Screens/AI/AIAnalysis';

export const THRESHOLD_FAST_SWING = 100;
export const PRO_LEVEL_RMR = 1300;

export interface RacketDetail {
  id?: string;
  name: string;
  weight: string;
  tension: string;
  features: string[];
  balanceType?: string; // 'ATTACK' | 'ALLROUND' | 'DEFENSE'
  shaftType?: string;   // 'STIFF' | 'SOFT'
  tier?: string;        // 'PREMIUM' | 'BUDGET'
  imageUrl?: string;    // Firestore에서 불러올 이미지 URL
}

export interface RacketRecommendation {
  id?: string;
  balance: string;
  shaft: string;
  description: string;
  premium: RacketDetail;
  budget: RacketDetail;
}

export const recommendRacket = (
  videoHistory: AnalysisReport[],
  currentRmr: number,
  latestFlow: { tempo: number; endurance: number },
  allRackets: RacketDetail[] // DB에서 불러온 라켓 리스트 추가
): RacketRecommendation | null => {
  if (!allRackets || allRackets.length === 0) return null;

  let scoreAttack = 0;
  let scoreSpeed = 0;

  // 1. 밸런스 분석 (Attack/Allround/Defense)
  const swingReports = videoHistory.filter(r => r.mode === 'SWING');
  const highSpeedSwings = swingReports.filter(r => r.maxRecord >= 90).length;
  const smashRatio = swingReports.length > 0 ? highSpeedSwings / swingReports.length : 0;

  if (smashRatio > 0.4) scoreAttack += 3;
  if (latestFlow.tempo > latestFlow.endurance) scoreAttack += 2;

  let bKey: 'ATTACK' | 'ALLROUND' | 'DEFENSE' = 'ALLROUND';
  let balanceStr = "올라운드형";                                              //헤드 밸런스
  if (scoreAttack >= 3) { bKey = 'ATTACK'; balanceStr = "공격형"; }          //헤드 무거움
  else if (scoreAttack <= 1) { bKey = 'DEFENSE'; balanceStr = "수비형"; }    //헤드 가벼움

  // 2. 샤프트 강도 분석 (Stiff vs Soft)
  const avgMaxSpeed = swingReports.length > 0 ? swingReports.reduce((a, r) => a + r.maxRecord, 0) / swingReports.length : 0;

  if (avgMaxSpeed > THRESHOLD_FAST_SWING) scoreSpeed += 2; // 스윙 속도 비중
  if (currentRmr > PRO_LEVEL_RMR) scoreSpeed += 2;       // 실력 지표(RMR) 비중
  else if (currentRmr > 1100) scoreSpeed += 1;          // 중급자 가산점

  // scoreSpeed가 3점 이상일 때만 Stiff 추천
  let sKey: 'STIFF' | 'SOFT' = scoreSpeed >= 3 ? 'STIFF' : 'SOFT';
  let shaftStr = sKey === 'STIFF' ? "스티프 (딱딱한)" : "소프트 (유연한)";

  // DB 데이터에서 조건에 맞는 라켓 필터링
  const premiumRacket = allRackets.find(r => r.balanceType === bKey && r.shaftType === sKey && r.tier === 'PREMIUM');
  const budgetRacket = allRackets.find(r => r.balanceType === bKey && r.shaftType === sKey && r.tier === 'BUDGET');

  // 조건에 딱 맞는 라켓이 없을 경우를 대비한 폴백 처리
  const finalPremium = premiumRacket || allRackets.find(r => r.tier === 'PREMIUM') || allRackets[0];
  const finalBudget = budgetRacket || allRackets.find(r => r.tier === 'BUDGET') || allRackets[1] || allRackets[0];

  return {
    balance: balanceStr,
    shaft: shaftStr,
    description: `${balanceStr} 성향에 ${shaftStr} 샤프트를 조합하여 \n ${bKey === 'ATTACK' ? '강력한 파워' : bKey === 'DEFENSE' ? '빠른 수비' : '균형 잡힌 플레이'}를 지원합니다.`,
    premium: finalPremium,
    budget: finalBudget
  };
};