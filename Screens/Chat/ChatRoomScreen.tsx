import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Send } from 'lucide-react-native';
import OpponentProfileModal from './OpponentProfileModal';

const MOCK_DB: Record<string, any[]> = {
  '1': [
    { id: 'm1', text: '안녕하세요! 호계체육관 정모 참여하시나요?', sender: 'me', time: '오후 2:10' },
    { id: 'm2', text: '네 안녕하세요! 참여 예정입니다.', sender: 'other', time: '오후 2:15' },
    { id: 'm3', text: '라켓은 어떤거 쓰세요?', sender: 'me', time: '오후 2:16' },
    { id: 'm4', text: '저는 아스트록스 77 사용중입니다 ㅎㅎ', sender: 'other', time: '오후 2:20' },
    { id: 'm5', text: '오 저도 그거 써보고 싶었는데, 가서 구경 좀 할게요!', sender: 'me', time: '오후 2:25' },
    { id: 'm6', text: '네, 6시에 뵙겠습니다!', sender: 'other', time: '오후 2:30' },
  ],
  '2': [
    { id: 'msg1', text: '안녕하세요, 클럽 가입 문의 드립니다.', sender: 'me', time: '오전 10:00' },
    { id: 'msg2', text: '반갑습니다! 구력은 어느정도 되시나요?', sender: 'other', time: '오전 10:30' },
    { id: 'msg3', text: '2년 정도 쳤습니다. C조 정도 돼요.', sender: 'me', time: '오전 11:00' },
    { id: 'msg4', text: '복식 가능하신가요?', sender: 'other', time: '오전 11:15' },
  ],
  'new_chat': [],
};

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { roomId, title, opponentName } = route.params || { roomId: '1', title: '채팅방', opponentName: '상대방' };

  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>(MOCK_DB[roomId] || []);

  const flatListRef = useRef<FlatList>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const opponentProfile = {
    id: `user_${roomId}`,
    name: opponentName,
    location: '안양시',
    tier: 'Gold 3',
    win: 15,
    loss: 8,
    mannerScore: 4.5,
    avatar: require('../../assets/images/profile.png'),
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const hour12 = hours % 12 || 12;
    const minStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${hour12}:${minStr}`;
  };

  const sendMessage = () => {
    if (text.trim().length === 0) return;

    const newMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'me',
      time: getCurrentTime(),
    };

    setMessages(prev => [...prev, newMessage]);
    setText('');
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleProfilePress = () => {
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && (
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8}>
            <Image
              source={opponentProfile.avatar}
              style={styles.avatarCircle}
            />
          </TouchableOpacity>
        )}
        <View style={{ maxWidth: '70%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
            <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>
              {item.text}
            </Text>
          </View>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubTitle} numberOfLines={1}>{opponentName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요"
            placeholderTextColor="#6B7280"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            disabled={!text.trim()}
          >
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <OpponentProfileModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        userProfile={opponentProfile}
        relationType="opponent"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backBtn: {
    padding: 12,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 4,
  },
  bubbleLeft: {
    backgroundColor: '#374151',
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#34D399',
    borderTopRightRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  msgTextLeft: {
    color: 'white',
  },
  msgTextRight: {
    color: '#064E3B',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: 'white',
    marginRight: 10,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.5,
  },
});