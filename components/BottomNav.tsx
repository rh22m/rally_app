import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../App';
import {
  MessageCircleMore,
  Search,
  User,
  Bot,
  Flame,
} from 'lucide-react-native';

interface BottomNavProps {
  currentTab: Screen;
  onTabChange: (tab: Screen) => void;
}

// 탭 아이템 데이터 타입 정의
interface TabItemProps {
  tab: { id: Screen; label: string; Icon: React.ElementType };
  isActive: boolean;
  onPress: () => void;
}

// [추가] 애니메이션 처리를 위한 개별 탭 버튼 컴포넌트
const TabButton = ({ tab, isActive, onPress }: TabItemProps) => {
  // 애니메이션 값 (0: 비활성, 1: 활성)
  const animatedValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    // [애니메이션] 활성/비활성 상태 변경 시 부드러운 스프링 효과 적용
    Animated.spring(animatedValue, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      bounciness: 10, // 탄성 계수 (리퀴드 느낌)
      speed: 5,      // 애니메이션 속도
    }).start();
  }, [isActive]);

  // 배경 스케일 및 투명도 인터폴레이션
  const bgScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const bgOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // 아이콘 튀어오름 효과 인터폴레이션
  const iconScale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.8, 1], // 눌렸다가 다시 커지는 느낌
  });

  const iconColor = isActive ? '#FFFFFF' : '#6B7280';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      {/* [애니메이션] 활성화 시 나타나는 배경 (부드러운 전환) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.activeBackground,
          {
            opacity: bgOpacity,
            transform: [{ scale: bgScale }],
          },
        ]}
      />

      <Animated.View style={{ transform: [{ scale: iconScale }], alignItems: 'center' }}>
        <View>
          <tab.Icon color={iconColor} size={28} />

          {/* Beta 배지 (AI 탭 전용) */}
          {tab.id === 'ai' && (
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  // [추가] 안전 영역 인셋 가져오기
  const insets = useSafeAreaInsets();

  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: '경기 모드', Icon: Flame },
    { id: 'chat', label: '대화', Icon: MessageCircleMore },
    { id: 'ai', label: 'AI 분석', Icon: Bot },
    { id: 'match', label: '매칭', Icon: Search },
    { id: 'profile', label: '정보', Icon: User },
  ];

  return (
    <View
      style={[
        styles.container,
        // [수정] 하단 패딩에 안전 영역(insets.bottom)을 더해 시스템 내비게이션 바와 겹치지 않도록 처리
        { paddingBottom: 2 + insets.bottom }
      ]}
    >
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={currentTab === tab.id}
          onPress={() => onTabChange(tab.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6', // 조금 더 부드러운 경계선 색상으로 변경
    backgroundColor: '#FFFFFF',
    // 그림자 추가 (선택 사항 - 탭바 구분감 향상)
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.03, // 그림자를 더 은은하게 조정
    shadowRadius: 8,
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6, // 내부 패딩 조정
    marginHorizontal: 4,
    borderRadius: 20, // 더 둥근 모서리 (리퀴드 스타일)
    overflow: 'hidden', // 배경 애니메이션이 둥근 모서리를 넘지 않도록
    height: 60, // 버튼 높이 고정으로 레이아웃 안정화
  },
  // [추가] 활성화 배경 스타일 (Animated.View에 적용)
  activeBackground: {
    backgroundColor: '#34D399', // 녹색 배경
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 11, // 폰트 사이즈 미세 조정
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FFFFFF', // 흰색 텍스트
    fontWeight: '700',
  },

  // Beta 배지 스타일
  betaBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
});