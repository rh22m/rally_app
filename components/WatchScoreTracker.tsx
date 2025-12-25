import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-wear-connectivity';
import { RotateCcw, Play, Pause } from 'lucide-react-native';

const WatchScoreTracker = () => {
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isPause, setIsPause] = useState(false);

  useEffect(() => {
    // 휴대폰에서 보내는 점수 동기화 메시지 수신
    const unsubscribe = watchEvents.on('message', (msg: any) => {
      if (msg.type === 'SYNC_UPDATE') {
        setMyScore(msg.myScore);
        setOpponentScore(msg.opponentScore);
        setIsPause(msg.isPause);
      }
    });
    return () => unsubscribe();
  }, []);

  const sendCommand = (command: string) => {
    // 폰으로 명령 전송 (폰이 연결 안 되어 있으면 무시됨, fire-and-forget)
    sendMessage({ command });
  };

  return (
    <View style={styles.container}>
      {/* 상단: 상대방 점수 (#34D399 - 폰 앱 Team 1 색상 매칭) */}
      <TouchableOpacity
        style={[styles.scoreHalf, { backgroundColor: '#34D399' }]}
        onPress={() => sendCommand('INCREMENT_OPP')}
      >
        {/* 상대방이 보기 편하게 텍스트 180도 회전 */}
        <Text style={[styles.scoreText, { transform: [{ rotate: '180deg' }] }]}>
          {opponentScore}
        </Text>
      </TouchableOpacity>

      {/* 하단: 내 점수 (#38BDF8 - 폰 앱 Team 2 색상 매칭) */}
      <TouchableOpacity
        style={[styles.scoreHalf, { backgroundColor: '#38BDF8' }]}
        onPress={() => sendCommand('INCREMENT_MY')}
      >
        <Text style={styles.scoreText}>{myScore}</Text>
      </TouchableOpacity>

      {/* 좌측 오버레이: Undo 버튼 */}
      <View style={[styles.overlayButton, { left: 10 }]}>
        <TouchableOpacity
            style={styles.circleButton}
            onPress={() => sendCommand('UNDO')}
        >
          <RotateCcw size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 우측 오버레이: Pause/Play 버튼 */}
      <View style={[styles.overlayButton, { right: 10 }]}>
        <TouchableOpacity
            style={styles.circleButton}
            onPress={() => sendCommand('PAUSE_TOGGLE')}
        >
          {/* 멈춰있으면(isPause=true) -> Play 아이콘 보여줌 (재개 의미) */}
          {isPause ? (
            <Play size={24} color="#fff" fill="#fff" />
          ) : (
            <Pause size={24} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  scoreHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scoreText: {
    fontSize: 60, // 시인성을 위해 크게 설정
    fontWeight: '900',
    color: '#fff',
  },
  overlayButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25, // 버튼 높이(50)의 절반만큼 올려서 수직 중앙 정렬
    justifyContent: 'center',
    zIndex: 10,
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.4)', // 반투명 배경
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  }
});

export default WatchScoreTracker;