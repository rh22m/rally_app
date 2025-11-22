import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { RotateCcw, Play, Pause, ArrowLeft } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ScoreTrackerProps {
  onComplete: (result: {
    duration: number;
    team1Wins: number;
    team2Wins: number;
    isForced: boolean;
  }) => void;
  onCancel: () => void;
}

type ScoreState = {
  t1Score: number;
  t2Score: number;
  t1Wins: number;
  t2Wins: number;
};

const SetIndicators = ({ total, wins }: { total: number, wins: number }) => (
  <View style={styles.setIndicatorContainer}>
    {[...Array(total)].map((_, i) => (
      <View
        key={i}
        style={[
          styles.setIndicator,
          i < wins ? styles.setIndicatorActive : null,
        ]}
      />
    ))}
  </View>
);

export function ScoreTracker({ onComplete, onCancel }: ScoreTrackerProps) {
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [team1SetWins, setTeam1SetWins] = useState(0);
  const [team2SetWins, setTeam2SetWins] = useState(0);
  // 1. (핵심 수정) 3판 2선승제이므로, 승리 표기 동그라미를 2개로 수정
  const totalSets = 2;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [scoreHistory, setScoreHistory] = useState<ScoreState[]>([]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  useEffect(() => {
    Alert.alert(
      "경기 기록 시작",
      "지금부터 경기 기록과 타이머가 시작됩니다.",
      [
        {
          text: "나가기",
          onPress: () => onCancel(),
          style: "cancel",
        },
        { text: "계속하기", onPress: () => setIsTimerRunning(true) },
      ]
    );
  }, []); // 마운트 시 1회만 실행

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleScore = (team: 'team1' | 'team2') => {
    if (!isTimerRunning) return;

    setScoreHistory([
      ...scoreHistory,
      {
        t1Score: team1Score,
        t2Score: team2Score,
        t1Wins: team1SetWins,
        t2Wins: team2SetWins,
      },
    ]);

    let newT1Score = team === 'team1' ? team1Score + 1 : team1Score;
    let newT2Score = team === 'team2' ? team2Score + 1 : team2Score;
    let newT1SetWins = team1SetWins;
    let newT2SetWins = team2SetWins;

    let setWinner: 'team1' | 'team2' | null = null;

    if (newT1Score >= 21 || newT2Score >= 21) {
      if (newT1Score === 29 && newT2Score === 29) {
        if (newT1Score === 30) setWinner = 'team1';
        if (newT2Score === 30) setWinner = 'team2';
      }
      else if (newT1Score >= 21 && newT1Score >= newT2Score + 2) {
        setWinner = 'team1';
      } else if (newT2Score >= 21 && newT2Score >= newT1Score + 2) {
        setWinner = 'team2';
      }
      else if (newT1Score === 30) {
        setWinner = 'team1';
      } else if (newT2Score === 30) {
        setWinner = 'team2';
      }
    }

    if (setWinner) {
      if (setWinner === 'team1') newT1SetWins++;
      if (setWinner === 'team2') newT2SetWins++;

      newT1Score = 0;
      newT2Score = 0;
      setScoreHistory([]);
    }

    setTeam1Score(newT1Score);
    setTeam2Score(newT2Score);
    setTeam1SetWins(newT1SetWins);
    setTeam2SetWins(newT2SetWins);

    // 2. (로직 확인) 2세트 선취 (경기 종료) 확인 (totalSets=2 이므로 정상 작동)
    if (newT1SetWins === 2 || newT2SetWins === 2) {
      setIsTimerRunning(false);
      onComplete({
        duration: elapsedTime,
        team1Wins: newT1SetWins,
        team2Wins: newT2SetWins,
        isForced: false,
      });
    }
  };

  const handleUndo = () => {
    if (scoreHistory.length === 0) {
      Alert.alert("알림", "더 이상 되돌릴 점수가 없습니다.");
      return;
    }

    Alert.alert(
      "점수 되돌리기",
      "마지막 점수를 한 단계 전으로 되돌리시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "확인",
          onPress: () => {
            const lastState = scoreHistory[scoreHistory.length - 1];
            setTeam1Score(lastState.t1Score);
            setTeam2Score(lastState.t2Score);
            setTeam1SetWins(lastState.t1Wins);
            setTeam2SetWins(lastState.t2Wins);

            setScoreHistory(scoreHistory.slice(0, -1));
          },
          style: "destructive",
        },
      ]
    );
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleExit = () => {
    const wasTimerRunning = isTimerRunning;
    setIsTimerRunning(false);
    Alert.alert(
      "경기 종료",
      "정말로 경기 모드를 종료하시겠습니까? 기록이 저장되지 않을 수 있습니다.",
      [
        {
          text: "취소",
          onPress: () => {
            if (wasTimerRunning) {
              setIsTimerRunning(true);
            }
          },
          style: "cancel",
        },
        {
          text: "종료",
          onPress: () =>
            onComplete({
              duration: elapsedTime,
              team1Wins: team1SetWins,
              team2Wins: team2SetWins,
              isForced: true,
            }),
          style: "destructive",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.headerButton}>
          <ArrowLeft size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Team 1 Score Area */}
      <LinearGradient colors={['#6EE7B7', '#34D399']} style={styles.scoreArea}>
        <TouchableOpacity
          style={styles.touchableArea}
          onPress={() => handleScore('team1')}
        >
          <Text style={styles.scoreText}>{team1Score}</Text>
          <SetIndicators total={totalSets} wins={team1SetWins} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Team 2 Score Area */}
      <LinearGradient colors={['#38BDF8', '#22D3EE']} style={styles.scoreArea}>
        <TouchableOpacity
          style={styles.touchableArea}
          onPress={() => handleScore('team2')}
        >
          <Text style={styles.scoreText}>{team2Score}</Text>
          <SetIndicators total={totalSets} wins={team2SetWins} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          onPress={handleUndo}
          style={styles.controlButton}
          disabled={scoreHistory.length === 0}
        >
          <RotateCcw
            size={32}
            color={scoreHistory.length === 0 ? "#888" : "white"}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleTimer} style={styles.controlButton}>
          {isTimerRunning ? (
            <Pause size={32} color="white" />
          ) : (
            <Play size={32} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#6EE7B7',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scoreArea: {
    flex: 1,
  },
  touchableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scoreText: {
    fontSize: 120,
    color: 'white',
    fontWeight: 'bold',
    lineHeight: 120,
  },
  setIndicatorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  setIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  setIndicatorActive: {
    backgroundColor: 'white',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#22D3EE',
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});