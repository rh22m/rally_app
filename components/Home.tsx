import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import {
  Search,
  ChevronLeft,  // 화살표 다시 추가
  ChevronRight, // 화살표 다시 추가
  Plus,
  Calendar,
  MapPin,
  User,
  Users,
} from 'lucide-react-native';
import { MatchCard } from './MatchCard';

// --- 1. 달력 한국어 설정 ---
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

// --- 컴포넌트 분리 (에러 방지) ---
const FilterOptionButton = ({ label, icon, isSelected, onPress, type = 'text' }: any) => {
  const IconComponent = icon;
  const color = isSelected ? 'white' : '#6B7280';
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        type === 'icon' && styles.optionButtonIcon,
        isSelected && styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >
      {IconComponent && <IconComponent size={16} color={color} />}
      <Text
        style={[
          styles.optionButtonText,
          isSelected && styles.optionButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface HomeProps {
  onStartGame: () => void;
}

const initialMatches = [
  {
    id: 1,
    status: '모집 중',
    playerCount: '2명',
    title: '정모',
    date: '2025년 11월 13일 19시 00분',
    location: '호계체육관',
  },
  {
    id: 2,
    status: '모집 중',
    playerCount: '2명',
    title: '정모',
    date: '2025년 11월 13일 19시 00분',
    location: '호계체육관',
  },
];

const formatMatchDate = (d: Date) => {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
};

const regionItems = [
  { label: '서울', value: '서울' },
  { label: '경기', value: '경기' },
  { label: '인천', value: '인천' },
  { label: '강원', value: '강원' },
  { label: '충청', value: '충청' },
  { label: '전라', value: '전라' },
  { label: '경상', value: '경상' },
  { label: '제주', value: '제주' },
];

export function Home({ onStartGame }: HomeProps) {
  // --- 날짜 바 상태 관리 (시작일 기준) ---
  const [startDateOffset, setStartDateOffset] = useState(0); // 오늘 기준 며칠 떨어져 있는지
  
  // 현재 보여줄 날짜 5개 생성
  const dates = useMemo(() => {
    const list = [];
    const today = new Date();
    // startDateOffset 만큼 이동한 날짜가 시작점
    today.setDate(today.getDate() + startDateOffset); 
    
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push({
        day: d.getDate(),
        label: dayLabels[d.getDay()],
        fullDate: d, // 전체 날짜 객체 저장 (비교용)
      });
    }
    return list;
  }, [startDateOffset]);

  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [matches, setMatches] = useState(initialMatches);

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [detailedLocation, setDetailedLocation] = useState('');
  const [selectedGender, setSelectedGender] = useState<'무관' | '남성' | '여성'>('무관');
  const [selectedCount, setSelectedCount] = useState<2 | 4>(4);
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  const [isCalendarModalVisible, setCalendarModalVisible] = useState(false);

  // Search/Filter State
  const [isSearching, setIsSearching] = useState(false);
  const [filterGender, setFilterGender] = useState<'무관' | '남성' | '여성'>('무관');
  const [filterCount, setFilterCount] = useState<2 | 4 | '전체'>('전체');

  // --- 더블 클릭 감지 로직 ---
  const [lastTap, setLastTap] = useState<number | null>(null);
  
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // 0.3초 이내 두 번 탭
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      setCalendarModalVisible(true);
      setLastTap(null);
    } else {
      setLastTap(now);
    }
  };

  // --- 날짜 이동 핸들러 ---
  const movePrev = () => setStartDateOffset(prev => prev - 1);
  const moveNext = () => setStartDateOffset(prev => prev + 1);

  const markedDates = useMemo(() => {
    const marks: any = {};
    const holidays = ['2025-01-01', '2025-03-01', '2025-05-05', '2025-08-15', '2025-12-25'];
    holidays.forEach(hDate => {
      marks[hDate] = { marked: true, customStyles: { text: { color: 'red', fontWeight: 'bold' } } };
    });

    matches.forEach((match) => {
      const parts = match.date.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
      if (parts) {
        const year = parts[1];
        const month = parts[2].padStart(2, '0');
        const day = parts[3].padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        marks[isoDate] = { marked: true, customStyles: { text: { color: '#34D399', fontWeight: 'bold' } } };
      }
    });
    return marks;
  }, [matches]);

  const handleCreateRoom = () => {
    setModalVisible(true);
  };

  const handleConfirmCreation = () => {
    const finalLocation = `${selectedRegion || '지역 미선택'} - ${detailedLocation || '상세 장소 미입력'}`;
    const newMatch = {
      id: Math.random(),
      status: '모집 중',
      playerCount: `${selectedCount}명`,
      title: roomName || '새 모임',
      date: formatMatchDate(date),
      location: finalLocation,
    };
    setMatches([newMatch, ...matches]);
    setModalVisible(false);
    setRoomName('');
    setSelectedRegion(null);
    setDetailedLocation('');
    setSelectedGender('무관');
    setSelectedCount(4);
    setDate(new Date());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/rally-logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>Rally</Text>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="지역, 체육관으로 찾기"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              onFocus={() => setIsSearching(true)}
            />
            <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          </View>
          {isSearching && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsSearching(false)}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isSearching ? (
        <>
          <Image source={require('../assets/images/badminton.png')} style={styles.heroImage} resizeMode="cover" />
          
          <View style={styles.dateSelectorContainer}>
            {/* 좌측 화살표 (이전 날짜) */}
            <TouchableOpacity style={styles.dateArrowButton} onPress={movePrev}>
              <ChevronLeft size={20} color="white" />
            </TouchableOpacity>

            {/* 날짜 리스트 영역 (더블 탭 감지) */}
            <Pressable style={styles.dateList} onPress={handleDoubleTap}>
              {dates.map((item) => (
                <TouchableOpacity
                  key={item.fullDate.toISOString()} // 고유 키
                  onPress={() => {
                    setSelectedDate(item.day);
                    // 여기서 싱글 탭 동작(날짜 선택)을 수행
                    // 더블 탭과 겹치지 않게 하려면 handleDoubleTap을 여기에도 연결 가능
                    handleDoubleTap(); 
                  }}
                  activeOpacity={0.7}
                  style={[styles.dateButton, selectedDate === item.day && styles.dateButtonSelected]}
                >
                  <Text style={[styles.dateButtonDay, selectedDate === item.day && styles.dateButtonTextSelected]}>
                    {item.day}
                  </Text>
                  <Text style={[styles.dateButtonLabel, selectedDate === item.day && styles.dateButtonTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Pressable>

            {/* 우측 화살표 (다음 날짜) */}
            <TouchableOpacity style={styles.dateArrowButton} onPress={moveNext}>
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
            
            {/* 기존 캘린더 아이콘 삭제됨 */}
          </View>

          <View style={styles.listWrapper}>
            <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} onStartGame={onStartGame} />
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.fab} onPress={handleCreateRoom} activeOpacity={0.8}>
              <Plus size={28} color="white" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView style={styles.filterContainer}>
          <Text style={styles.modalLabel}>인원</Text>
          <View style={styles.optionGroup}>
            <FilterOptionButton label="전체" icon={null} isSelected={filterCount === '전체'} onPress={() => setFilterCount('전체')} />
            <FilterOptionButton label="2인 (단식)" icon={User} isSelected={filterCount === 2} onPress={() => setFilterCount(2)} type="icon" />
            <FilterOptionButton label="4인 (복식)" icon={Users} isSelected={filterCount === 4} onPress={() => setFilterCount(4)} type="icon" />
          </View>
          <Text style={styles.modalLabel}>성별</Text>
          <View style={styles.optionGroup}>
            <FilterOptionButton label="무관" icon={null} isSelected={filterGender === '무관'} onPress={() => setFilterGender('무관')} />
            <FilterOptionButton label="남성" icon={null} isSelected={filterGender === '남성'} onPress={() => setFilterGender('남성')} />
            <FilterOptionButton label="여성" icon={null} isSelected={filterGender === '여성'} onPress={() => setFilterGender('여성')} />
          </View>
          <Text style={styles.modalLabel}>날짜 범위 (예시)</Text>
          <TouchableOpacity style={styles.modalInputButton}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.modalInputText}>날짜 선택</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Room Creation Modal */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로운 방 생성</Text>
            <TextInput style={styles.modalInput} placeholder="모임 이름" placeholderTextColor="#9CA3AF" value={roomName} onChangeText={setRoomName} />
            <TouchableOpacity style={styles.modalInputButton} onPress={() => setDatePickerVisible(true)}>
              <Calendar size={18} color="#6B7280" />
              <Text style={styles.modalInputText}>{formatMatchDate(date)}</Text>
            </TouchableOpacity>
            <Text style={styles.modalLabel}>지역 선택</Text>
            <TouchableOpacity style={styles.modalInputButton} onPress={() => setIsRegionModalVisible(true)}>
              <MapPin size={18} color={selectedRegion ? '#1F2937' : '#6B7280'} />
              <Text style={[styles.modalInputText, !selectedRegion && styles.placeholderText]}>
                {selectedRegion || '시/도를 선택하세요'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalLabel}>상세 장소 (경기장 이름)</Text>
            <TextInput style={styles.modalInput} placeholder="예: 호계체육관" placeholderTextColor="#9CA3AF" value={detailedLocation} onChangeText={setDetailedLocation} />
            <Text style={styles.modalLabel}>성별</Text>
            <View style={styles.optionGroup}>
              <TouchableOpacity style={[styles.optionButton, selectedGender === '남성' && styles.optionButtonSelected]} onPress={() => setSelectedGender('남성')}>
                <Text style={[styles.optionButtonText, selectedGender === '남성' && styles.optionButtonTextSelected]}>남성</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, selectedGender === '여성' && styles.optionButtonSelected]} onPress={() => setSelectedGender('여성')}>
                <Text style={[styles.optionButtonText, selectedGender === '여성' && styles.optionButtonTextSelected]}>여성</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, selectedGender === '무관' && styles.optionButtonSelected]} onPress={() => setSelectedGender('무관')}>
                <Text style={[styles.optionButtonText, selectedGender === '무관' && styles.optionButtonTextSelected]}>무관</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>인원</Text>
            <View style={styles.optionGroup}>
              <TouchableOpacity style={[styles.optionButton, selectedCount === 2 && styles.optionButtonSelected]} onPress={() => setSelectedCount(2)}>
                <User size={16} color={selectedCount === 2 ? 'white' : '#6B7280'} />
                <Text style={[styles.optionButtonText, selectedCount === 2 && styles.optionButtonTextSelected]}>2인 (단식)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, selectedCount === 4 && styles.optionButtonSelected]} onPress={() => setSelectedCount(4)}>
                <Users size={16} color={selectedCount === 4 ? 'white' : '#6B7280'} />
                <Text style={[styles.optionButtonText, selectedCount === 4 && styles.optionButtonTextSelected]}>4인 (복식)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalAddButton} onPress={handleConfirmCreation}>
              <Text style={styles.modalAddButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DatePicker modal open={isDatePickerVisible} date={date} onConfirm={(selectedDate) => { setDatePickerVisible(false); setDate(selectedDate); }} onCancel={() => setDatePickerVisible(false)} title="날짜와 시간 선택" confirmText="확인" cancelText="취소" minuteInterval={5} />

      <Modal animationType="slide" transparent={true} visible={isRegionModalVisible} onRequestClose={() => setIsRegionModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsRegionModalVisible(false)}>
          <Pressable style={styles.regionModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>지역 선택</Text>
            <FlatList data={regionItems} keyExtractor={(item) => item.value} renderItem={({ item }) => (
              <TouchableOpacity style={styles.regionItem} onPress={() => { setSelectedRegion(item.value); setIsRegionModalVisible(false); }}>
                <Text style={styles.regionItemText}>{item.label}</Text>
              </TouchableOpacity>
            )} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 전체 달력 Modal */}
      <Modal visible={isCalendarModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarModalVisible(false)}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.modalTitle}>경기 일정 확인</Text>
            <RNCalendar
              markingType={'custom'}
              markedDates={markedDates}
              monthFormat={'yyyy년 MM월'}
              onDayPress={(day) => { console.log('선택한 날짜', day.dateString); setCalendarModalVisible(false); }}
              theme={{ todayTextColor: '#34D399', arrowColor: '#1F2937', monthTextColor: '#1F2937', textMonthFontWeight: 'bold', textMonthFontSize: 18 }}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setCalendarModalVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo: { width: 32, height: 32, marginRight: 8 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchContainer: { position: 'relative', flex: 1 },
  searchInput: { backgroundColor: '#374151', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, paddingRight: 40, fontSize: 16, color: '#FFFFFF' },
  searchIcon: { position: 'absolute', right: 12, top: 13 },
  cancelButton: { paddingLeft: 16 },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16 },
  heroImage: { width: '100%', height: 200 },
  dateSelectorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 12 },
  dateArrowButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  dateList: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dateButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 22, width: 44, height: 48 },
  dateButtonSelected: { backgroundColor: '#34D399' },
  dateButtonDay: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  dateButtonLabel: { fontSize: 12, color: '#374151' },
  dateButtonTextSelected: { color: 'white' },
  listWrapper: { flex: 1, backgroundColor: '#F9FAFB' },
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 88 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#34D399', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalBackdropPressable: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 20, marginTop: 'auto' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 24, textAlign: 'center' },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#1F2937', marginBottom: 16 },
  modalInputButton: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  modalInputText: { fontSize: 16, color: '#1F2937', marginLeft: 8 },
  placeholderText: { color: '#9CA3AF' },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  optionGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  optionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 6 },
  optionButtonIcon: { paddingVertical: 10 },
  optionButtonSelected: { backgroundColor: '#34D399', borderColor: '#34D399' },
  optionButtonText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  optionButtonTextSelected: { color: '#FFFFFF' },
  modalAddButton: { backgroundColor: '#34D399', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  modalAddButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  filterContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 24 },
  regionModalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32, maxHeight: '60%', marginTop: 'auto' },
  regionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  regionItemText: { fontSize: 18, color: '#1F2937', textAlign: 'center' },
  calendarModalContent: { backgroundColor: 'white', margin: 20, borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  closeButton: { marginTop: 15, backgroundColor: '#34D399', padding: 12, borderRadius: 10, alignItems: 'center' },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});