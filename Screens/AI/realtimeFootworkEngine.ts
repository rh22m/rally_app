export type CourtZone = 'CENTER' | 'FRONT_LEFT' | 'FRONT_RIGHT' | 'MID_LEFT' | 'MID_RIGHT' | 'BACK_LEFT' | 'BACK_RIGHT';

export interface StepEvent { ts: number; zone: CourtZone; dwellMs: number; splitStepDetected: boolean; recoveryToCenterMs?: number; reactionMs?: number; kneeAngleMin?: number; trunkLeanDeg?: number; balanceScore?: number; confidence?: number; }

export interface FootworkSetInput { sessionId: string; startedAt: number; endedAt: number; calibrationScore: number; conditions: { fullBodyVisible: boolean; singlePlayerOnly: boolean; indoorLightingOk: boolean; courtDetected: boolean; }; events: StepEvent[]; }

export interface FootworkSetSummary { durationSec: number; eventCount: number; averageReactionMs: number; averageRecoveryMs: number; splitStepRate: number; averageBalanceScore: number; averageKneeDepthScore: number; movementCoverageScore: number; postureScore: number; footworkScore: number; totalScore: number; strengths: string[]; weaknesses: string[]; recommendedDrill: string; }

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
function average(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function scoreReaction(ms: number) { if (ms <= 450) return 100; if (ms >= 1200) return 20; return clamp(100 - ((ms - 450) / 750) * 80); }
function scoreRecovery(ms: number) { if (ms <= 800) return 100; if (ms >= 2200) return 20; return clamp(100 - ((ms - 800) / 1400) * 80); }
function scoreKneeDepth(angle: number) { if (angle >= 110 && angle <= 145) return 100; if (angle < 80 || angle > 165) return 35; const dist = Math.min(Math.abs(angle - 127.5), 47.5); return clamp(100 - dist * 1.4); }
function scoreTrunkLean(deg: number) { if (deg >= 8 && deg <= 22) return 100; if (deg < 0 || deg > 35) return 40; return clamp(100 - Math.abs(deg - 15) * 3); }

export function summarizeFootworkSet(input: FootworkSetInput): FootworkSetSummary {
  const durationSec = Math.max(1, Math.round((input.endedAt - input.startedAt) / 1000));
  const eventCount = input.events.length;
  const reactionList = input.events.map(e => e.reactionMs).filter((v): v is number => typeof v === 'number');
  const recoveryList = input.events.map(e => e.recoveryToCenterMs).filter((v): v is number => typeof v === 'number');
  const balanceList = input.events.map(e => e.balanceScore).filter((v): v is number => typeof v === 'number');
  const kneeList = input.events.map(e => e.kneeAngleMin).filter((v): v is number => typeof v === 'number');
  const trunkList = input.events.map(e => e.trunkLeanDeg).filter((v): v is number => typeof v === 'number');
  const splitCount = input.events.filter(e => e.splitStepDetected).length;
  const zones = new Set(input.events.map(e => e.zone));

  const reactionScore = average(reactionList.map(scoreReaction));
  const recoveryScore = average(recoveryList.map(scoreRecovery));
  const balanceScore = average(balanceList);
  const kneeDepthScore = kneeList.length ? average(kneeList.map(scoreKneeDepth)) : 75;
  const trunkScore = trunkList.length ? average(trunkList.map(scoreTrunkLean)) : 75;
  const splitStepRate = eventCount ? splitCount / eventCount : 0;
  const splitScore = splitStepRate * 100;
  const movementCoverageScore = clamp((zones.size / 7) * 100);
  const postureScore = Math.round(kneeDepthScore * 0.4 + trunkScore * 0.25 + balanceScore * 0.35);
  const footworkScore = Math.round(reactionScore * 0.3 + recoveryScore * 0.25 + splitScore * 0.25 + movementCoverageScore * 0.2);
  const totalScore = Math.round(postureScore * 0.45 + footworkScore * 0.55);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (reactionScore >= 80) strengths.push('첫 반응 속도가 빠른 편입니다.');
  if (recoveryScore >= 80) strengths.push('중앙 복귀가 안정적으로 이뤄집니다.');
  if (splitScore >= 75) strengths.push('스플릿 스텝 타이밍이 전반적으로 좋습니다.');
  if (postureScore >= 80) strengths.push('하체 자세와 상체 중심 유지가 안정적입니다.');
  if (reactionScore < 65) weaknesses.push('첫 출발 반응이 늦어 셔틀 대응이 한 박자 밀립니다.');
  if (recoveryScore < 65) weaknesses.push('복귀 속도가 늦어 다음 볼 대비가 늦습니다.');
  if (splitScore < 60) weaknesses.push('스플릿 스텝이 누락되거나 타이밍이 불안정합니다.');
  if (balanceScore < 65) weaknesses.push('이동 후 착지와 체중 지지가 흔들립니다.');
  if (!strengths.length) strengths.push('세트 전체 움직임 기록이 정상적으로 수집되었습니다.');
  if (!weaknesses.length) weaknesses.push('큰 약점은 보이지 않지만, 반복 측정으로 안정성을 더 확인해보세요.');

  let recommendedDrill = '전후좌우 4코너 풋워크를 20초 x 5세트 수행하세요.';
  if (reactionScore < 65) recommendedDrill = '랜덤 방향 콜 풋워크 드릴을 15초 x 8세트 수행하세요.';
  else if (recoveryScore < 65) recommendedDrill = '각 코너 이동 후 반드시 중앙 복귀를 넣는 왕복 드릴을 권장합니다.';
  else if (postureScore < 65) recommendedDrill = '낮은 준비자세 유지 + 런지 정지 2초 드릴을 권장합니다.';

  return { durationSec, eventCount, averageReactionMs: Math.round(average(reactionList)), averageRecoveryMs: Math.round(average(recoveryList)), splitStepRate: Math.round(splitStepRate * 100) / 100, averageBalanceScore: Math.round(balanceScore), averageKneeDepthScore: Math.round(kneeDepthScore), movementCoverageScore: Math.round(movementCoverageScore), postureScore, footworkScore, totalScore, strengths, weaknesses, recommendedDrill };
}