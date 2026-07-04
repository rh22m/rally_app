import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, NativeModules, AppState } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-wear-connectivity';
import { RotateCcw, Play, Pause, RefreshCw, Square } from 'lucide-react-native';

const { OngoingActivityModule } = NativeModules;

const WatchScoreTracker = () => {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isSyncedSession, setIsSyncedSession] = useState(false);

  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isPause, setIsPause] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 🔥 [핵심 추가] 백그라운드에서도 정확한 시간을 계산하기 위한 변수
  const activeStartTimeRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);

  const [incomingData, setIncomingData] = useState<any>(null);
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);

  const [isChecking, setIsChecking] = useState(false);

  const formattedTimer = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

  // 🔥 [로직 변경] 단순 +1 대신 타임스탬프 비교 방식으로 타이머 고도화
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isGameStarted && !isPause) {
      // 경기 시작 및 재개 시점의 시간을 기록
      if (activeStartTimeRef.current === null) {
        activeStartTimeRef.current = Date.now();
      }

      interval = setInterval(() => {
        const now = Date.now();
        const diffSeconds = Math.floor((now - activeStartTimeRef.current!) / 1000);
        setElapsedSeconds(accumulatedSecondsRef.current + diffSeconds);
      }, 1000);
    } else {
      // 퍼즈(일시정지)되거나 종료되었을 때, 지금까지 흐른 시간을 누적 저장
      if (activeStartTimeRef.current !== null) {
        const now = Date.now();
        const diffSeconds = Math.floor((now - activeStartTimeRef.current) / 1000);
        accumulatedSecondsRef.current += diffSeconds;
        activeStartTimeRef.current = null;
      }
    }

    return () => clearInterval(interval);
  }, [isGameStarted, isPause]);

  // 🔥 [추가] 화면이 꺼졌다가 다시 켜질 때 즉각적으로 타이머를 최신화
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isGameStarted && !isPause && activeStartTimeRef.current !== null) {
        const now = Date.now();
        const diffSeconds = Math.floor((now - activeStartTimeRef.current) / 1000);
        setElapsedSeconds(accumulatedSecondsRef.current + diffSeconds);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isGameStarted, isPause]);

  const checkGameEndCondition = (score1: number, score2: number) => {
    if (score1 >= 21 && score1 - score2 >= 2) return true;
    if (score2 >= 21 && score2 - score1 >= 2) return true;
    if (score1 === 30 || score2 === 30) return true;
    return false;
  };

  useEffect(() => {
    if (isGameStarted && checkGameEndCondition(myScore, opponentScore)) {
      sendCommand('GAME_END');
      handleResetToInitial();
    }
  }, [myScore, opponentScore, isGameStarted]);

  // 🔥 [수정] 폰에서 타이머 동기화 시 누적 시간(accumulated)도 함께 업데이트
  const syncTimerFromString = (timerString: string) => {
    const parts = timerString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        const totalSec = minutes * 60 + seconds;
        setElapsedSeconds(totalSec);
        accumulatedSecondsRef.current = totalSec;
        if (isGameStarted && !isPause) {
          activeStartTimeRef.current = Date.now(); // 기준 시간 초기화
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = watchEvents.on('message', (msg: any) => {
      if (msg.type === 'PING') {
        setIsPhoneConnected(true);
        sendMessage({ type: 'PONG' });
        return;
      }

      if (msg.type === 'SYNC_TIMER' && msg.timer) {
        syncTimerFromString(msg.timer);
        return;
      }

      if (msg.type === 'SYNC_STATE' || msg.type === 'SYNC_UPDATE') {
        setIsPhoneConnected(true);

        if (!isGameStarted) {
          setMyScore(msg.myScore);
          setOpponentScore(msg.opponentScore);
          setIsPause(msg.isPause);
          if (msg.timer) syncTimerFromString(msg.timer);

          setIsGameStarted(true);
          setIsSyncedSession(true);

          if (OngoingActivityModule) {
            OngoingActivityModule.setMatchRecording(true);
          }
        } else {
          if (isSyncedSession) {
            setMyScore(msg.myScore);
            setOpponentScore(msg.opponentScore);
            setIsPause(msg.isPause);
            if (msg.timer) syncTimerFromString(msg.timer);
          } else {
            setIncomingData(msg);
            setShowSyncBanner(true);
          }
        }
      } else if (msg.type === 'GAME_END') {
        handleResetToInitial();
      }
    });
    return () => unsubscribe();
  }, [isGameStarted, isSyncedSession]);

  const sendCommand = (command: string) => {
    sendMessage({ command });
  };

  const handleManualConnectionCheck = () => {
    setIsChecking(true);
    sendMessage({ type: 'PING' });
    sendMessage({ command: 'REQUEST_SYNC' });

    setTimeout(() => {
      setIsChecking(false);
    }, 2000);
  };

  // 🔥 [수정] 초기화될 때 누적 타이머 Ref도 완벽히 초기화
  const handleResetToInitial = () => {
    setIsGameStarted(false);
    setIsSyncedSession(false);
    setMyScore(0);
    setOpponentScore(0);
    setElapsedSeconds(0);
    setIsPause(false);
    setShowSyncBanner(false);
    setIncomingData(null);

    accumulatedSecondsRef.current = 0;
    activeStartTimeRef.current = null;

    if (OngoingActivityModule) {
      OngoingActivityModule.setMatchRecording(false);
    }
  };

  const handleForceEnd = () => {
    sendCommand('GAME_END');
    handleResetToInitial();
  };

  const handleStartLocalGame = () => {
    setIsGameStarted(true);
    setIsSyncedSession(false);

    if (OngoingActivityModule) {
      OngoingActivityModule.setMatchRecording(true);
    }
  };

  const handleApplySync = () => {
    if (incomingData) {
      setMyScore(incomingData.myScore);
      setOpponentScore(incomingData.opponentScore);
      setIsPause(incomingData.isPause);
      if (incomingData.timer) syncTimerFromString(incomingData.timer);

      setIsSyncedSession(true);
    }
    setShowSyncBanner(false);
  };

  const handleIncrementOpponent = () => {
    const nextScore = opponentScore + 1;
    setOpponentScore(nextScore);
    sendCommand('INCREMENT_OPP');
  };

  const handleIncrementMy = () => {
    const nextScore = myScore + 1;
    setMyScore(nextScore);
    sendCommand('INCREMENT_MY');
  };

  const handleLocalUndo = () => {
    sendCommand('UNDO');
  };

  const handleLocalPauseToggle = () => {
    setIsPause(prev => !prev);
    sendCommand('PAUSE_TOGGLE');
  };

  if (!isGameStarted) {
    return (
      <View style={styles.waitingContainer}>
        <TouchableOpacity
          style={[styles.waitingIconCircle, isChecking && { borderColor: '#38BDF8' }]}
          onPress={handleManualConnectionCheck}
          activeOpacity={0.7}
          disabled={isChecking}
        >
          <Image
            source={require('../assets/images/card-logo.png')}
            style={{ width: 40, height: 40, resizeMode: 'contain', opacity: isChecking ? 0.5 : 1 }}
          />
        </TouchableOpacity>
        <Text style={styles.waitingTitle}>RECO</Text>

        {isChecking ? (
          <Text style={[styles.statusTextConnected, { color: '#38BDF8' }]}>폰 연결 확인 중...</Text>
        ) : isPhoneConnected ? (
          <Text style={styles.statusTextConnected}>폰 연동 준비 완료</Text>
        ) : (
          <Text style={styles.statusTextStandalone}>단독 기록 모드</Text>
        )}

        <Text style={styles.waitingSubtitle}>
          {isPhoneConnected
            ? "휴대폰에서 경기를 시작하거나\n아래 버튼을 눌러 직접 시작하세요."
            : "휴대폰과 연동되지 않아도\n단독으로 기록을 시작할 수 있습니다."}
        </Text>

        <TouchableOpacity style={styles.startButton} onPress={handleStartLocalGame}>
          <Text style={styles.startButtonText}>기록 시작</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showSyncBanner && (
        <TouchableOpacity style={styles.syncBanner} onPress={handleApplySync}>
          <RefreshCw size={12} color="#FFF" style={styles.syncIcon} />
          <Text style={styles.syncText}>폰 데이터로 동기화하기</Text>
        </TouchableOpacity>
      )}

      {!showSyncBanner && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formattedTimer}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.scoreHalf, { backgroundColor: '#34D399' }]}
        onPress={handleIncrementOpponent}
      >
        <Text style={styles.scoreText}>{opponentScore}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.scoreHalf, { backgroundColor: '#38BDF8' }]}
        onPress={handleIncrementMy}
      >
        <Text style={styles.scoreText}>{myScore}</Text>
      </TouchableOpacity>

      {isPause && (
        <View style={styles.centerOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.endButton} onPress={handleForceEnd}>
            <Square size={14} color="#FFF" fill="#FFF" style={styles.endButtonIcon} />
            <Text style={styles.endButtonText}>경기 중단</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.overlayButton, { left: 8 }]}>
        <TouchableOpacity
            style={styles.circleButton}
            onPress={handleLocalUndo}
        >
          <RotateCcw size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.overlayButton, { right: 8 }]}>
        <TouchableOpacity
            style={styles.circleButton}
            onPress={handleLocalPauseToggle}
        >
          {isPause ? (
            <Play size={22} color="#fff" fill="#fff" />
          ) : (
            <Pause size={22} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  timerContainer: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  timerText: { color: 'white', fontSize: 12, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  scoreHalf: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  scoreText: { fontSize: 52, fontWeight: '900', color: '#fff' },
  overlayButton: { position: 'absolute', top: '50%', marginTop: -22, justifyContent: 'center', zIndex: 10 },
  circleButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  centerOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  endButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#7f1d1d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  endButtonIcon: { marginRight: 6 },
  endButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  waitingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  waitingIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2, marginLeft: 11
  },
  statusTextConnected: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statusTextStandalone: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  waitingSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#34D399',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  startButtonText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncBanner: {
    position: 'absolute',
    top: 10,
    left: '6%',
    right: '6%',
    width: '88%',
    backgroundColor: '#EF4444',
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  syncIcon: { marginRight: 4 },
  syncText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});

export default WatchScoreTracker;