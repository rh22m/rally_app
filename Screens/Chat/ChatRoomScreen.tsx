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

// Firebase 웹 SDK
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import OpponentProfileModal from './OpponentProfileModal';

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { roomId, title, opponentName, opponentId } = route.params || { roomId: 'new_chat', title: '채팅방', opponentName: '상대방' };

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRoomId, setCurrentRoomId] = useState(roomId);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  const [opponentProfile, setOpponentProfile] = useState<any>({
    id: opponentId,
    name: opponentName,
    location: '조회 중...',
    tier: 'Unranked',
    win: 0,
    loss: 0,
    mannerScore: 5.0,
    avatar: require('../../assets/images/profile.png'),
  });

  const flatListRef = useRef<FlatList>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  // 인증 정보 가져오기
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  // 상대방 상세 프로필 정보 가져오기
  useEffect(() => {
    if (!opponentId) return;
    const fetchOpponentProfile = async () => {
      try {
        const db = getFirestore();
        const profileDoc = await getDoc(doc(db, 'profiles', opponentId));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setOpponentProfile({
            id: opponentId,
            name: data.nickname || opponentName,
            location: data.region || '미정',
            tier: data.tier || 'Unranked',
            win: data.wins || 0,
            loss: data.losses || 0,
            mannerScore: data.mannerScore || 5.0,
            avatar: data.avatarUrl ? { uri: data.avatarUrl } : require('../../assets/images/profile.png'),
          });
        }
      } catch (error) {
        console.log("프로필을 불러올 수 없습니다.", error);
      }
    };
    fetchOpponentProfile();
  }, [opponentId, opponentName]);

  // 메시지 실시간 리스너
  useEffect(() => {
    if (!currentRoomId || currentRoomId === 'new_chat' || !currentUser) return;

    const db = getFirestore();
    const q = query(
      collection(db, 'chats', currentRoomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const timeDate = data.createdAt?.toDate() || new Date();
        const hours = timeDate.getHours();
        const minutes = timeDate.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';

        return {
          id: docSnap.id,
          text: data.text,
          sender: data.senderId === currentUser.uid ? 'me' : 'other',
          time: `${ampm} ${hours % 12 || 12}:${minutes}`,
        };
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [currentRoomId, currentUser]);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages]);

  // 메시지 전송 로직 (DB 저장)
  const sendMessage = async () => {
    if (text.trim().length === 0 || !currentUser) return;
    const db = getFirestore();
    let targetRoomId = currentRoomId;

    try {
      // 새 채팅방인 경우 방 먼저 생성
      if (targetRoomId === 'new_chat') {
        const roomRef = await addDoc(collection(db, 'chats'), {
          matchTitle: title,
          participants: [currentUser.uid, opponentId],
          participantDetails: {
            [currentUser.uid]: { name: currentUser.displayName || '나' },
            [opponentId]: { name: opponentName, avatarUrl: opponentProfile.avatar?.uri || null }
          },
          updatedAt: serverTimestamp(),
          lastMessage: text.trim(),
          type: 'direct'
        });
        targetRoomId = roomRef.id;
        setCurrentRoomId(targetRoomId);
      }

      // 메시지 컬렉션에 추가
      await addDoc(collection(db, 'chats', targetRoomId, 'messages'), {
        text: text.trim(),
        senderId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // 기존 방일 경우 방의 마지막 메시지 업데이트
      if (targetRoomId !== 'new_chat') {
        await updateDoc(doc(db, 'chats', targetRoomId), {
          lastMessage: text.trim(),
          updatedAt: serverTimestamp()
        });
      }

      setText('');
    } catch (error) {
      console.error("메시지 전송 실패:", error);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && (
          <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Image source={opponentProfile.avatar} style={styles.avatarCircle} />
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} disabled={!text.trim()}>
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
  container: { flex: 1, backgroundColor: '#111827' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  backBtn: { padding: 12 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: 'white' },
  headerSubTitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#374151', marginRight: 8, marginTop: 2 },
  bubble: { padding: 12, borderRadius: 18, marginBottom: 4 },
  bubbleLeft: { backgroundColor: '#374151', borderTopLeftRadius: 4 },
  bubbleRight: { backgroundColor: '#34D399', borderTopRightRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextLeft: { color: 'white' },
  msgTextRight: { color: '#064E3B', fontWeight: '500' },
  timeText: { fontSize: 11, color: '#6B7280', marginHorizontal: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingHorizontal: 16, backgroundColor: '#1F2937', borderTopWidth: 1, borderTopColor: '#374151' },
  input: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: '#374151', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, color: 'white', marginRight: 10, textAlignVertical: 'center' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#34D399', justifyContent: 'center', alignItems: 'center', marginBottom: 0 },
  sendBtnDisabled: { backgroundColor: '#4B5563', opacity: 0.5 },
});