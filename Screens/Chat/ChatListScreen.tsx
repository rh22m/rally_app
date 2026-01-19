import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, MessageCircle, Plus, X, Search, Phone } from 'lucide-react-native';
import OpponentProfileModal from './OpponentProfileModal';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ------------------- [데이터] -------------------
const CHAT_ROOMS = [
  {
    id: '1',
    matchTitle: '호계체육관 정모',
    opponentName: '김민수',
    lastMessage: '네, 6시에 뵙겠습니다!',
    time: '오후 2:30',
    unreadCount: 1,
    avatar: require('../../assets/images/profile.png'),
    type: 'match',
  },
  {
    id: '2',
    matchTitle: '안양 배드민턴 클럽',
    opponentName: '박준형',
    lastMessage: '복식 가능하신가요?',
    time: '오전 11:15',
    unreadCount: 1,
    avatar: require('../../assets/images/card-logo.png'),
    type: 'club',
  },
];

const FRIENDS_LIST = [
  {
    id: 'f1',
    name: '이영희',
    isOnline: true,
    tier: 'Gold 1',
    win: 12,
    loss: 5,
    mannerScore: 4.8,
    avatar: require('../../assets/images/profile.png'),
  },
  {
    id: 'f2',
    name: '최수민',
    isOnline: false,
    tier: 'Silver 2',
    win: 8,
    loss: 10,
    mannerScore: 4.2,
    avatar: require('../../assets/images/profile.png'),
  },
  {
    id: 'f3',
    name: '정우성',
    isOnline: true,
    tier: 'Platinum 3',
    win: 45,
    loss: 2,
    mannerScore: 4.9,
    avatar: require('../../assets/images/profile.png'),
  },
];

export default function ChatListScreen() {
  const navigation = useNavigation<any>();

  const [viewMode, setViewMode] = useState<'chat' | 'friends'>('chat');

  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'friend' | 'opponent'>('opponent');

  // 친구 추가 모달 상태
  const [isAddFriendVisible, setAddFriendVisible] = useState(false);
  const [addFriendMode, setAddFriendMode] = useState<'nickname' | 'phone'>('nickname');
  const [addFriendInput, setAddFriendInput] = useState('');

  const toggleViewMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode((prev) => (prev === 'chat' ? 'friends' : 'chat'));
  };

  const handleFriendPress = (friend: any) => {
    setSelectedProfile({ ...friend, location: '활동 지역 미설정' });
    setModalType('friend');
    setModalVisible(true);
  };

  const handleRoomPress = (room: any) => {
    navigation.navigate('ChatRoom', {
      roomId: room.id,
      title: room.matchTitle,
      opponentName: room.opponentName,
    });
  };

  // 친구 추가 로직
  const handleAddFriend = () => {
    if (!addFriendInput.trim()) {
      Alert.alert('알림', '정보를 입력해주세요.');
      return;
    }
    Alert.alert(
      '친구 추가',
      `${addFriendMode === 'nickname' ? '닉네임' : '전화번호'} '${addFriendInput}'님에게 친구 요청을 보냈습니다.`,
      [{ text: '확인', onPress: () => {
          setAddFriendVisible(false);
          setAddFriendInput('');
      }}]
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {viewMode === 'chat' ? '대화' : '친구 목록'}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleViewMode}>
            {viewMode === 'chat' ? (
              <Users size={24} color="white" />
            ) : (
              <MessageCircle size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 컨텐츠 영역 */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {viewMode === 'chat' ? (
          CHAT_ROOMS.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.itemContainer}
              activeOpacity={0.7}
              onPress={() => handleRoomPress(room)}
            >
              <Image source={room.avatar} style={styles.avatar} />
              <View style={styles.contentContainer}>
                <View style={styles.topRow}>
                  <Text style={styles.title} numberOfLines={1}>{room.matchTitle}</Text>
                  <Text style={styles.timeText}>{room.time}</Text>
                </View>
                <View style={styles.bottomRow}>
                  <Text style={styles.messageText} numberOfLines={1}>
                    <Text style={styles.senderName}>{room.opponentName}: </Text>
                    {room.lastMessage}
                  </Text>
                  {room.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{room.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          FRIENDS_LIST.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              style={styles.itemContainer}
              activeOpacity={0.7}
              onPress={() => handleFriendPress(friend)}
            >
              <View>
                <Image source={friend.avatar} style={styles.avatar} />
                {friend.isOnline && <View style={styles.onlineBadge} />}
              </View>

              <View style={styles.contentContainer}>
                <Text style={styles.friendName}>{friend.name}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 친구 추가 FAB (친구 목록 화면에서만 표시) */}
      {viewMode === 'friends' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddFriendVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* 공용 프로필 모달 */}
      <OpponentProfileModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        userProfile={selectedProfile}
        relationType={modalType}
      />

      {/* 친구 추가 모달 */}
      <Modal
         animationType="fade"
         transparent={true}
         visible={isAddFriendVisible}
         onRequestClose={() => setAddFriendVisible(false)}
       >
         <Pressable style={styles.modalBackdrop} onPress={() => setAddFriendVisible(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{width: '100%', alignItems: 'center'}}
            >
             <Pressable style={styles.addFriendModalContent} onPress={() => {}}>
               <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>친구 추가</Text>
                 <TouchableOpacity onPress={() => setAddFriendVisible(false)}>
                   <X size={24} color="#9CA3AF" />
                 </TouchableOpacity>
               </View>

               <View style={styles.tabContainer}>
                 <TouchableOpacity
                   style={[styles.tabButton, addFriendMode === 'nickname' && styles.tabButtonActive]}
                   onPress={() => setAddFriendMode('nickname')}
                 >
                   <Text style={[styles.tabText, addFriendMode === 'nickname' && styles.tabTextActive]}>닉네임</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.tabButton, addFriendMode === 'phone' && styles.tabButtonActive]}
                   onPress={() => setAddFriendMode('phone')}
                 >
                   <Text style={[styles.tabText, addFriendMode === 'phone' && styles.tabTextActive]}>전화번호</Text>
                 </TouchableOpacity>
               </View>

               <View style={styles.inputContainer}>
                 {addFriendMode === 'nickname' ? <Search size={20} color="#9CA3AF" /> : <Phone size={20} color="#9CA3AF" />}
                 <TextInput
                   style={styles.input}
                   placeholder={addFriendMode === 'nickname' ? "닉네임을 입력하세요" : "전화번호를 입력하세요"}
                   placeholderTextColor="#6B7280"
                   value={addFriendInput}
                   onChangeText={setAddFriendInput}
                   keyboardType={addFriendMode === 'phone' ? 'phone-pad' : 'default'}
                 />
               </View>

               <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
                 <Text style={styles.addButtonText}>추가</Text>
               </TouchableOpacity>
             </Pressable>
            </KeyboardAvoidingView>
         </Pressable>
       </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#374151',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: '#111827',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    maxWidth: '80%',
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 8,
  },
  senderName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#34D399',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // --- FAB 스타일 (친구 추가 버튼) ---
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  // --- 친구 추가 모달 스타일 ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendModalContent: {
    width: '85%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 12,
    color: 'white',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#34D399',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});