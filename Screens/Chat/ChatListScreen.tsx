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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, MessageCircle } from 'lucide-react-native';
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
        contentContainerStyle={{ paddingBottom: 20 }}
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

      {/* 공용 프로필 모달 */}
      <OpponentProfileModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        userProfile={selectedProfile}
        relationType={modalType}
      />
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
});