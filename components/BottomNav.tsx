import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
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

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: '경기 모드', Icon: Flame },
    { id: 'chat', label: '대화', Icon: MessageCircleMore },
    { id: 'ai', label: 'AI 분석', Icon: Bot },
    { id: 'match', label: '매칭', Icon: Search },
    { id: 'profile', label: '정보', Icon: User },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        // [수정] 모든 탭 활성화 시 흰색 아이콘 (AI 탭 예외 제거)
        const iconColor = isActive ? '#FFFFFF' : '#6B7280';

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            // [수정] 모든 탭 동일한 활성 스타일 적용
            style={[
              styles.tabButton,
              isActive && styles.tabButtonActive,
            ]}
          >
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  // [수정] 모든 탭 활성 상태 스타일 통일
  tabButtonActive: {
    backgroundColor: '#34D399', // 녹색 배경
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  // [수정] 모든 탭 활성 텍스트 스타일 통일
  tabLabelActive: {
    color: '#FFFFFF', // 흰색 텍스트
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
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
});