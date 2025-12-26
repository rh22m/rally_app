// utils/racketRecommender.ts
import { AnalysisReport } from '../Screens/AI/AIAnalysis';

export const THRESHOLD_FAST_SWING = 100;
export const PRO_LEVEL_RMR = 1300;

export interface RacketDetail {
  name: string;
  weight: string;
  tension: string;
  features: string[];
}

export interface RacketRecommendation {
  id: string;
  balance: string;
  shaft: string;
  description: string;
  premium: RacketDetail;
  budget: RacketDetail;
}

const RACKET_SPECS: Record<string, RacketDetail> = {
  "요넥스 아스트록스 100ZZ": { id: "ast_100ZZ", name: "요넥스 아스트록스 100ZZ", weight: "3U, 4U", tension: "20-28 Lbs", features: ["하이퍼 슬림 샤프트", "부드러운 타구감", "파워풀한 연속 스매시"] },
  "아펙스 Z-지글러": { id: "apx_ziggler", name: "아펙스 Z-지글러", weight: "4U", tension: "최대 38 Lbs", features: ["컴팩트 프레임", "고탄성 카본", "강력한 가성비 공격력"] },
  "요넥스 아스트록스 77 프로": { id: "ast_77PRO", name: "요넥스 아스트록스 77 프로", weight: "4U", tension: "20-28 Lbs", features: ["플렉스 퓨즈 기술", "부드러운 타구감", "공격적 올라운더"] },
  "빅터 스러스터 K 12": { id: "vic_K12", name: "빅터 스러스터 K 12", weight: "4U, 5U", tension: "최대 30 Lbs", features: ["헤드무게 중심", "입문자용 파워형", "빠른 복원력"] },
  "요넥스 아크세이버 11 프로": { id: "acs_11PRO", name: "요넥스 아크세이버 11 프로", weight: "3U, 4U", tension: "20-28 Lbs", features: ["포켓팅 부스터", "정교한 컨트롤", "전통의 올라운드"] },
  "빅터 드라이브X 7K": { id: "vic_7K", name: "빅터 드라이브X 7K", weight: "3U, 4U", tension: "최대 31 Lbs", features: ["안정적인 드라이브", "나노 포트 기술", "단단한 프레임"] },
  "빅터 드라이브X 09": { id: "vic_09", name: "빅터 드라이브X 09", weight: "4U", tension: "최대 26 Lbs", features: ["부드러운 반발력", "편안한 핸들링", "안정적 수비"] },
  "요넥스 머슬파워 29": { id: "mus_POW", name: "요넥스 머슬파워 29", weight: "3U", tension: "19-24 Lbs", features: ["머슬파워 프레임", "높은 내구성", "입문용 정석"] },
  "요넥스 나노플레어 1000Z": { id: "nano_1000Z", name: "요넥스 나노플레어 1000Z", weight: "3U, 4U", tension: "20-28 Lbs", features: ["소닉 플레어 시스템", "최고속 스윙", "날카로운 드라이브"] },
  "아펙스 나노 900 파워": { id: "nano_900POW", name: "아펙스 나노 900 파워", weight: "4U", tension: "최대 30 Lbs", features: ["경량 헤드 라이트", "빠른 반응성", "연속 수비 최적화"] },
  "요넥스 나노플레어 700": { id: "nano_700", name: "요넥스 나노플레어 700", weight: "4U, 5U", tension: "20-28 Lbs", features: ["와이드 프레임", "피로도 감소", "국민 배드민턴 채"] },
  "요넥스 나노플레어 001 어빌리티": { id: "nano_001", name: "요넥스 나노플레어 001 어빌리티", weight: "5U (초경량)", tension: "최대 27 Lbs", features: ["초보자용 경량형", "부드러운 조작", "손목 부담 최소화"] }
};

export const recommendRacket = (
  videoHistory: AnalysisReport[],
  currentRmr: number,
  latestFlow: { tempo: number; endurance: number }
): RacketRecommendation => {
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
  // [로직 검토 및 수정]: RMR이 1300 이상이면 숙련자로 판단하여 강도 점수 부여
  const avgMaxSpeed = swingReports.length > 0 ? swingReports.reduce((a, r) => a + r.maxRecord, 0) / swingReports.length : 0;

  if (avgMaxSpeed > THRESHOLD_FAST_SWING) scoreSpeed += 2; // 스윙 속도 비중
  if (currentRmr > PRO_LEVEL_RMR) scoreSpeed += 2;       // 실력 지표(RMR) 비중
  else if (currentRmr > 1100) scoreSpeed += 1;          // 중급자 가산점

  // scoreSpeed가 3점 이상일 때만 Stiff 추천 (스윙이 아주 빠르거나, 적당히 빠르면서 실력이 높을 때)
  let sKey: 'STIFF' | 'SOFT' = scoreSpeed >= 3 ? 'STIFF' : 'SOFT';
  let shaftStr = sKey === 'STIFF' ? "스티프 (딱딱한)" : "소프트 (유연한)";

  const DB = {
    ATTACK: { STIFF: ["요넥스 아스트록스 100ZZ", "아펙스 Z-지글러"], SOFT: ["요넥스 아스트록스 77 프로", "빅터 스러스터 K 12"] },
    ALLROUND: { STIFF: ["요넥스 아크세이버 11 프로", "빅터 드라이브X 7K"], SOFT: ["빅터 드라이브X 09", "요넥스 머슬파워 29"] },
    DEFENSE: { STIFF: ["요넥스 나노플레어 1000Z", "아펙스 나노 900 파워"], SOFT: ["요넥스 나노플레어 700", "요넥스 나노플레어 001 어빌리티"] }
  };

  const models = DB[bKey][sKey];
  return {
    balance: balanceStr,
    shaft: shaftStr,
    description: `${balanceStr} 성향에 ${shaftStr} 샤프트를 조합하여 \n ${bKey === 'ATTACK' ? '강력한 파워' : bKey === 'DEFENSE' ? '빠른 수비' : '균형 잡힌 플레이'}를 지원합니다.`,
    premium: RACKET_SPECS[models[0]],
    budget: RACKET_SPECS[models[1]]
  };
};