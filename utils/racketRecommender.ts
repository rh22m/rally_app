// utils/racketRecommender.ts
import { AnalysisReport } from '../Screens/AI/AIAnalysis';

export const THRESHOLD_FAST_SWING = 100; // km/h 기준 (S등급 수준)
export const PRO_LEVEL_RMR = 1300; // Gold 3 이상

export interface RacketProduct {
  name: string;
  tier: 'Premium' | 'Budget';
}

export interface RacketRecommendation {
  balance: string;
  shaft: string;
  description: string;
  premiumModel: string;
  budgetModel: string;
}

/**
 * 6가지 유형별 라켓 데이터베이스
 */
const RACKET_DB = {
  ATTACK: {
    STIFF: { premium: "요넥스 아스트록스 100ZZ", budget: "아펙스 Z-지글러" },
    SOFT: { premium: "요넥스 아스트록스 77 프로", budget: "빅터 스러스터 K 12" }
  },
  ALLROUND: {
    STIFF: { premium: "요넥스 아크세이버 11 프로", budget: "빅터 드라이브X 7K" },
    SOFT: { premium: "빅터 드라이브X 09", budget: "요넥스 머슬파워 29" }
  },
  DEFENSE: {
    STIFF: { premium: "요넥스 나노플레어 1000Z", budget: "아펙스 나노 900 파워" },
    SOFT: { premium: "요넥스 나노플레어 700", budget: "요넥스 나노플레어 001 어빌리티" }
  }
};

export const recommendRacket = (
  videoHistory: AnalysisReport[],
  currentRmr: number,
  latestFlow: { tempo: number; endurance: number }
): RacketRecommendation => {
  let scoreAttack = 0;
  let scoreSpeed = 0;

  // --- 1. 밸런스 분석 ---
  const swingReports = videoHistory.filter(r => r.mode === 'SWING');
  const highSpeedSwings = swingReports.filter(r => r.maxRecord >= 90).length;
  const smashRatio = swingReports.length > 0 ? highSpeedSwings / swingReports.length : 0;

  if (smashRatio > 0.4) scoreAttack += 3;
  if (latestFlow.tempo > latestFlow.endurance) scoreAttack += 2;

  let balanceKey: 'ATTACK' | 'ALLROUND' | 'DEFENSE' = 'ALLROUND';
  let balanceStr = "Even Balance (올라운드)";

  if (scoreAttack >= 3) {
    balanceKey = 'ATTACK';
    balanceStr = "Head Heavy (공격형)";
  } else if (scoreAttack <= 1) {
    balanceKey = 'DEFENSE';
    balanceStr = "Head Light (수비형)";
  }

  // --- 2. 샤프트 강도 분석 ---
  const avgMaxSpeed = swingReports.length > 0
    ? swingReports.reduce((acc, r) => acc + r.maxRecord, 0) / swingReports.length
    : 0;

  if (avgMaxSpeed > THRESHOLD_FAST_SWING) scoreSpeed += 3;
  if (currentRmr > PRO_LEVEL_RMR) scoreSpeed += 1;

  let shaftKey: 'STIFF' | 'SOFT' = scoreSpeed >= 3 ? 'STIFF' : 'SOFT';
  let shaftStr = shaftKey === 'STIFF' ? "Stiff (딱딱함)" : "Flexible (부드러움)";

  // --- 3. 데이터 매칭 ---
  const models = RACKET_DB[balanceKey][shaftKey];

  // 상세 설명 생성
  let description = "";
  if (balanceKey === 'ATTACK') description = "강력한 스매시 위주의 공격적인 플레이에 최적화된 조합입니다. ";
  else if (balanceKey === 'DEFENSE') description = "빠른 반응 속도와 정교한 수비 리턴에 특화된 장비를 추천합니다. ";
  else description = "공수 전환이 빠르고 안정적인 경기 운영을 지원하는 밸런스입니다. ";

  description += shaftKey === 'STIFF'
    ? "빠른 스윙 스피드를 가진 숙련자를 위한 단단한 샤프트 모델입니다."
    : "적은 힘으로도 탄성을 이용하기 좋은 부드러운 샤프트 모델입니다.";

  return {
    balance: balanceStr,
    shaft: shaftStr,
    description,
    premiumModel: models.premium,
    budgetModel: models.budget
  };
};