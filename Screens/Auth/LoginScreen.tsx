import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Mail, Lock } from 'lucide-react-native';

// [수정] App.tsx의 handleLogin 함수와 호환되도록 인터페이스 수정
interface LoginScreenProps {
  onGoToSignUp: () => void;
  onLogin: (email: string, password: string) => void;
}

export default function LoginScreen({ onGoToSignUp, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginPress = () => {
    // 1. 유효성 검사
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    // 2. 부모 컴포넌트(App.tsx)로 이메일과 비밀번호 전달
    setIsLoading(true);
    // onLogin 함수가 비동기(Promise)일 수 있으므로 처리
    try {
        onLogin(email, password);
    } catch (e) {
        console.error(e);
        setIsLoading(false);
    }

    // 로딩 상태 해제는 App.tsx에서 에러가 났을 때 처리하거나,
    // 화면이 넘어가면 자연스럽게 해결됩니다. 여기서는 안전을 위해 타임아웃 설정
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* 1. 로고 */}
        <Image
          source={require('../../assets/images/rally-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Rally</Text>
        <Text style={styles.subtitle}>로그인하여 랠리를 시작하세요!</Text>

        {/* 2. 입력 폼 */}
        <View style={styles.inputContainer}>
          <Mail color="#9CA3AF" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock color="#9CA3AF" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* 3. 로그인 버튼 */}
        <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLoginPress}
            disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Text>
        </TouchableOpacity>

        {/* 4. 회원가입 링크 */}
        <View style={styles.footerLink}>
          <Text style={styles.linkText}>계정이 없으신가요? </Text>
          <TouchableOpacity onPress={onGoToSignUp}>
            <Text style={styles.linkTextHighlight}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // 어두운 배경
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF', // 회색
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151', // Home 검색창과 동일
    borderRadius: 12, // 조금 더 둥글게 수정
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56, // 높이 고정
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    height: '100%',
  },
  button: {
    backgroundColor: '#34D399', // 랠리 녹색
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#059669',
    opacity: 0.7,
  },
  buttonText: {
    color: '#111827', // 어두운 글자
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  linkTextHighlight: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});