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
} from 'react-native';
// 중요: 안드로이드 노치 및 하단 바 대응을 위한 라이브러리 교체
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Send } from 'lucide-react-native';

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { title } = route.params || { title: '채팅방' };

  const [text, setText] = useState('');
  // 스크롤 제어를 위한 Ref
  const flatListRef = useRef<FlatList>(null);

  // (임시) 메시지 데이터
  const [messages, setMessages] = useState([
    { id: '1', text: '안녕하세요! 배드민턴 치러 오시나요?', sender: 'other' },
    { id: '2', text: '네! 6시까지 갈게요.', sender: 'me' },
  ]);

  const sendMessage = () => {
    if (text.trim().length === 0) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'me' }]);
    setText('');
  };

  // 메시지 추가 시 자동으로 아래로 스크롤
  useEffect(() => {
    setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && <View style={styles.avatarCircle} />}
        <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    // edges 설정: 상단(상태바)과 하단(제스처바) 영역을 안전하게 확보
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 안드로이드 키보드 처리 핵심:
        안드로이드는 behavior를 설정하지 않거나 undefined로 두어야
        OS 자체의 adjustResize 모드와 충돌하지 않고 자연스럽게 올라갑니다.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />

        {/* 입력창 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="메시지 보내기"
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline // 안드로이드에서 텍스트 길어질 때 줄바꿈 지원
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backBtn: {
    padding: 8, // 터치 영역 확보
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    includeFontPadding: false,
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
    alignItems: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: '#374151',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#34D399',
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 20,
  },
  msgTextLeft: {
    color: 'white',
  },
  msgTextRight: {
    color: '#064E3B',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100, // 입력창 최대 높이 제한
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8, // 안드로이드 텍스트 수직 정렬
    color: 'white',
    marginRight: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
});