import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// 색상 타입 정의
type ThemeColors = {
  background: string;
  text: string;
  textSub: string;
  card: string;
  cardBorder: string;
  primary: string;
  inputBackground: string;
  inputText: string;
  inputPlaceholder: string;
  divider: string;
  iconDefault: string;
  headerBackground: string;
  tabBarBackground: string;
  statusBarStyle: 'light-content' | 'dark-content';
};

// 색상 팔레트 정의
const lightColors: ThemeColors = {
  background: '#FFFFFF',        // 밝은 배경
  text: '#111827',              // 어두운 텍스트
  textSub: '#4B5563',           // 회색 텍스트
  card: '#F3F4F6',              // 카드 배경 (밝은 회색)
  cardBorder: '#E5E7EB',        // 카드 테두리
  primary: '#34D399',           // 랠리 포인트 컬러
  inputBackground: '#F9FAFB',   // 입력창 배경
  inputText: '#111827',         // 입력창 텍스트
  inputPlaceholder: '#9CA3AF',  // 플레이스홀더
  divider: '#E5E7EB',           // 구분선
  iconDefault: '#6B7280',       // 기본 아이콘 색상
  headerBackground: '#FFFFFF',  // 헤더 배경
  tabBarBackground: '#FFFFFF',  // 탭바 배경
  statusBarStyle: 'dark-content',
};

const darkColors: ThemeColors = {
  background: '#111827',        // 어두운 배경 (기존 앱 배경)
  text: '#FFFFFF',              // 밝은 텍스트
  textSub: '#9CA3AF',           // 회색 텍스트
  card: '#1F2937',              // 카드 배경 (어두운 회색)
  cardBorder: '#374151',        // 카드 테두리
  primary: '#34D399',           // 랠리 포인트 컬러
  inputBackground: '#374151',   // 입력창 배경
  inputText: '#FFFFFF',         // 입력창 텍스트
  inputPlaceholder: '#9CA3AF',  // 플레이스홀더
  divider: '#374151',           // 구분선
  iconDefault: '#9CA3AF',       // 기본 아이콘 색상
  headerBackground: '#111827',  // 헤더 배경
  tabBarBackground: '#111827',  // 탭바 배경
  statusBarStyle: 'light-content',
};

// Context 타입 정의
interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // 기본 시스템 설정 감지 (선택 사항)
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark'); // 기본값 다크 모드

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};