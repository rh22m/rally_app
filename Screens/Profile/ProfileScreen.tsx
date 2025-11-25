import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
// 1. History 아이콘 추가
import { Settings, Shield, LogOut, ChevronRight, History } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface ProfileScreenProps {
  onLogout: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation<any>();

  // (임시) 유저 데이터
  const user = {
    name: '배드민턴 마스터',
    location: '안양시 동안구',
    tier: 'Gold 3',
    rmr: 1350,
    wins: 15,
    losses: 8,
    avatar: require('../../assets/images/card-logo.png'),
  };

  // 2. 기록 아이콘 클릭 핸들러
  const handleHistoryPress = () => {
    // 실제로는 여기서 경기 기록 화면으로 이동합니다.
    // App.tsx 스택에 'MatchHistory'가 등록되어 있어야 합니다.
    navigation.navigate('MatchHistory');

    // (아직 화면이 없다면 테스트용 Alert 사용)
    // Alert.alert("경기 기록", "경기 기록 및 RMR 변동 내역 화면으로 이동합니다.");
  };

  return (
    <View style={styles.container}>
      {/* 3. 헤더 수정 (Flex Row 적용) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 정보</Text>

        {/* 우측 상단 기록 아이콘 */}
        <TouchableOpacity onPress={handleHistoryPress} style={styles.historyButton}>
          <History size={26} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* 1. 프로필 요약 */}
        <View style={styles.profileSection}>
          <Image source={user.avatar} style={styles.avatar} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.location}>{user.location}</Text>
        </View>

        {/* 2. RMR 카드 */}
        <View style={styles.rmrCard}>
          <View style={styles.rmrItem}>
            <Text style={styles.rmrLabel}>티어</Text>
            <Text style={styles.rmrValueTier}>{user.tier}</Text>
          </View>
          <View style={styles.rmrSeparator} />
          <View style={styles.rmrItem}>
            <Text style={styles.rmrLabel}>승/패</Text>
            <Text style={styles.rmrValue}>{user.wins}승 {user.losses}패</Text>
          </View>
          <View style={styles.rmrSeparator} />
          <View style={styles.rmrItem}>
            <Text style={styles.rmrLabel}>매너 점수</Text>
            <Text style={styles.rmrValue}>4.8 / 5.0</Text>
          </View>
        </View>

        {/* 3. 메뉴 리스트 */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Settings size={22} color="#9CA3AF" />
            <Text style={styles.menuText}>계정 설정</Text>
            <ChevronRight size={20} color="#9CA3AF" style={styles.menuArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Shield size={22} color="#9CA3AF" />
            <Text style={styles.menuText}>개인정보 및 보안</Text>
            <ChevronRight size={20} color="#9CA3AF" style={styles.menuArrow} />
          </TouchableOpacity>
        </View>

        {/* 4. 로그아웃 버튼 */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <LogOut size={22} color="#EF4444" />
            <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    // 4. 헤더 스타일 변경 (가로 정렬)
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
    backgroundColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  historyButton: {
    padding: 4, // 터치 영역 확보
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#374151', // 이미지 없을 때 배경색
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  rmrCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-around',
  },
  rmrItem: {
    alignItems: 'center',
  },
  rmrLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  rmrValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  rmrValueTier: {
    fontSize: 16,
    color: '#34D399',
    fontWeight: 'bold',
  },
  rmrSeparator: {
    width: 1,
    backgroundColor: '#374151',
  },
  menuSection: {
    marginTop: 24,
    backgroundColor: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    marginLeft: 16,
  },
  menuArrow: {
    marginLeft: 'auto',
  },
  logoutText: {
    color: '#EF4444',
  },
});