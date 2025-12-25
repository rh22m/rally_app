import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-wear-connectivity';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RotateCcw, Play, Pause } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

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
    sendMessage({ command });
  };

  return (
    <View style={styles.container}>
      {/* 상단: 상대방 점수 (#38bdf8) */}
      <TouchableOpacity
        style={[styles.scoreHalf, { backgroundColor: '#38bdf8' }]}
        onPress={() => sendCommand('INCREMENT_OPP')}
      >
        {/* 상대방 방향에 맞춰 텍스트 뒤집기 가능 (transform: [{ rotate: '180deg' }]) */}
        <Text style={styles.scoreText}>{opponentScore}</Text>
      </TouchableOpacity>

      {/* 하단: 내 점수 (#34d399) */}
      <TouchableOpacity
        style={[styles.scoreHalf, { backgroundColor: '#34d399' }]}
        onPress={() => sendCommand('INCREMENT_MY')}
      >
        <Text style={styles.scoreText}>{myScore}</Text>
      </TouchableOpacity>

      {/* 좌측 오버레이: Undo */}
      <View style={[styles.overlayButton, { left: 0 }]}>
        <TouchableOpacity
            style={styles.circleButton}
            onPress={() => sendCommand('UNDO')}
        >
          <Icon name="undo" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 우측 오버레이: Pause */}
      <View style={[styles.overlayButton, { right: 0 }]}>
        <TouchableOpacity
            style={styles.circleButton}
            onPress={() => sendCommand('PAUSE_TOGGLE')}
        >
          <Icon name={isPause ? "play" : "pause"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scoreText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  overlayButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25, // 버튼 높이 절반
    padding: 5,
    justifyContent: 'center',
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default WatchScoreTracker;