import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';
// ★ RefreshCcw (새로고침 아이콘) 다시 추가
import { Activity, History, Bot, Play, Square, RefreshCcw } from 'lucide-react-native';
import { htmlContent } from './poseHtml';

const MAX_REALISTIC_SPEED = 450;
const TELEPORT_THRESHOLD = 0.3;
const SMOOTHING_FACTOR = 0.7;
const SPEED_BUFFER_SIZE = 5;

export default function AIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const [swingSpeed, setSwingSpeed] = useState(0);
  const [swingCount, setSwingCount] = useState(0);

  const prevPos = useRef<{x: number, y: number, time: number} | null>(null);
  const lastSwingTime = useRef<number>(0);
  const speedBuffer = useRef<number[]>([]);

  // 웹뷰 제어용 Ref
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          if (granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED) {
            setHasPermission(true);
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        setHasPermission(true);
      }
    };
    requestPermission();
  }, []);

  // ★ 카메라 전환 함수 (웹뷰로 명령 전송)
  const toggleCamera = () => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ type: 'switchCamera' }));
    }
  };

  const handleMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);

      if (parsed.type === 'log') {
        console.log("[WebView]", parsed.message);
        return;
      }

      if (parsed.type === 'poseData') {
        const rawX = parsed.x;
        const rawY = parsed.y;
        const currentTime = parsed.timestamp;

        if (!prevPos.current) {
          prevPos.current = { x: rawX, y: rawY, time: currentTime };
          return;
        }

        const smoothX = prevPos.current.x * SMOOTHING_FACTOR + rawX * (1 - SMOOTHING_FACTOR);
        const smoothY = prevPos.current.y * SMOOTHING_FACTOR + rawY * (1 - SMOOTHING_FACTOR);

        const dx = smoothX - prevPos.current.x;
        const dy = smoothY - prevPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let timeDiff = (currentTime - prevPos.current.time) / 1000;
        if (timeDiff < 0.03) timeDiff = 0.03;

        if (distance > TELEPORT_THRESHOLD) {
          prevPos.current = { x: rawX, y: rawY, time: currentTime };
          return;
        }

        let calculatedSpeed = 0;

        if (timeDiff < 0.5) {
          const velocity = distance / timeDiff;

          if (velocity < 0.4) {
             calculatedSpeed = 0;
          } else if (velocity < 1.5) {
             calculatedSpeed = velocity * 50;
          } else {
             calculatedSpeed = 75 + (velocity - 1.5) * 80;
          }

          if (calculatedSpeed > 180) {
             const excess = calculatedSpeed - 180;
             calculatedSpeed = 180 + (excess * 0.35);
          }
          if (calculatedSpeed > 350) calculatedSpeed = 350;
        }

        speedBuffer.current.push(calculatedSpeed);
        if (speedBuffer.current.length > SPEED_BUFFER_SIZE) {
          speedBuffer.current.shift();
        }
        const avgSpeed = speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length;

        if (avgSpeed > 15) {
          setSwingSpeed(Math.floor(avgSpeed));
          const isDownSwing = dy > 0.02;
          if (avgSpeed > 90 && (currentTime - lastSwingTime.current > 600) && isDownSwing) {
            setSwingCount(prev => prev + 1);
            lastSwingTime.current = currentTime;
          }
        } else {
          setSwingSpeed(prev => Math.floor(prev * 0.7));
        }

        prevPos.current = { x: smoothX, y: smoothY, time: currentTime };
      }
    } catch (e) {
       // ignore
    }
  };

  if (isAnalyzing) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />

        <WebView
          ref={webviewRef}
          style={styles.webview}
          source={{ html: htmlContent, baseUrl: 'https://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          onMessage={handleMessage}
        />

        <View style={styles.statsOverlay}>
          <View style={styles.statBox}>
            <Activity size={24} color="#F472B6" />
            <View>
              <Text style={styles.statLabel}>스윙 속도</Text>
              <Text style={styles.statValue}>
                {swingSpeed} <Text style={styles.unit}>km/h</Text>
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <History size={24} color="#60A5FA" />
            <View>
              <Text style={styles.statLabel}>스윙 횟수</Text>
              <Text style={styles.statValue}>
                {swingCount} <Text style={styles.unit}>회</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ★ 카메라 전환 버튼 (좌측 하단) */}
        <TouchableOpacity
          style={styles.switchButton}
          onPress={toggleCamera}
          activeOpacity={0.7}
        >
          <RefreshCcw size={24} color="white" />
        </TouchableOpacity>

        {/* 분석 종료 버튼 */}
        <TouchableOpacity
          style={styles.stopButton}
          onPress={() => {
            setIsAnalyzing(false);
            setSwingSpeed(0);
          }}
        >
          <Square size={20} color="white" fill="white" />
          <Text style={styles.stopButtonText}>분석 종료</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerSection}>
        <Bot size={80} color="#34D399" style={styles.mainIcon} />
        <Text style={styles.title}>AI 스윙 분석</Text>
        <Text style={styles.subText}>
          카메라 앞에서 배드민턴 스윙을 해보세요.{'\n'}
          실시간으로 속도와 횟수를 측정해 드립니다.
        </Text>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            if (hasPermission) setIsAnalyzing(true);
            else alert("카메라 권한이 필요합니다.");
          }}
          activeOpacity={0.8}
        >
          <Play size={24} color="#111827" fill="#111827" style={{marginRight: 8}} />
          <Text style={styles.startButtonText}>분석 시작하기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.guideContainer}>
        <Text style={styles.guideTitle}>💡 촬영 팁</Text>
        <Text style={styles.guideText}>• 전신이 나오도록 카메라를 멀리 두세요.</Text>
        <Text style={styles.guideText}>• 밝은 곳에서 촬영하면 더 정확합니다.</Text>
        <Text style={styles.guideText}>• 측면에서 촬영하는 것이 가장 좋습니다.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  contentContainer: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 40 },
  mainIcon: { marginBottom: 24 },
  title: { fontSize: 32, color: 'white', fontWeight: 'bold', marginBottom: 16 },
  subText: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', lineHeight: 24, marginBottom: 40 },

  startButton: {
    flexDirection: 'row',
    backgroundColor: '#34D399',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 40,
    alignItems: 'center',
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startButtonText: { color: '#111827', fontSize: 18, fontWeight: 'bold' },

  guideContainer: {
    backgroundColor: '#1F2937',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  guideTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  guideText: { color: '#D1D5DB', fontSize: 15, marginBottom: 8, paddingLeft: 4 },

  cameraContainer: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1, backgroundColor: 'transparent' },

  statsOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.85)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statBox: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, color: '#9CA3AF', fontWeight: 'normal' },
  divider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.2)' },

  stopButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stopButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // ★ 카메라 전환 버튼 스타일
  switchButton: {
    position: 'absolute',
    bottom: 50,
    left: 30, // 화면 왼쪽에 배치
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // 반투명
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});