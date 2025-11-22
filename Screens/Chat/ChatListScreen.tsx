import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

// (임시) 채팅방 데이터 예시
const chatRooms = [
  {
    id: 1,
    matchTitle: '호계체육관 정모',
    lastMessage: '네, 6시에 뵙겠습니다!',
    time: '오후 2:30',
    unreadCount: 1,
    avatar: require('../../assets/images/card-logo.png'), // (임시)
  },
  {
    id: 2,
    matchTitle: '안양 배드민턴 클럽',
    lastMessage: '복식 가능하신가요?',
    time: '오전 11:15',
    unreadCount: 0,
    avatar: require('../../assets/images/card-logo.png'), // (임시)
  },
];

export default function ChatListScreen() {
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>대화</Text>
      </View>

      {/* 채팅 목록 */}
      <ScrollView style={styles.listContainer}>
        {chatRooms.map((room) => (
          <TouchableOpacity key={room.id} style={styles.chatItem}>
            <Image source={room.avatar} style={styles.avatar} />
            <View style={styles.chatContent}>
              <Text style={styles.chatTitle}>{room.matchTitle}</Text>
              <Text style={styles.chatMessage} numberOfLines={1}>{room.lastMessage}</Text>
            </View>
            <View style={styles.chatMeta}>
              <Text style={styles.chatTime}>{room.time}</Text>
              {room.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{room.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
    padding: 16,
    paddingTop: 24,
    backgroundColor: '#1F2937', // 약간 더 밝은 어두운색
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    flex: 1,
  },
  chatItem: {
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
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  chatMessage: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  unreadBadge: {
    backgroundColor: '#34D399',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});