import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ImageSourcePropType,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageCircleMore, UserPlus, UserMinus, Siren, Ban } from 'lucide-react-native';

import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getRmrTier } from '../../utils/rmrCalculator';

interface UserProfile {
  id: string;
  name: string;
  location: string;
  tier?: string;
  rmr?: number;
  win: number;
  loss: number;
  mannerScore: number | string;
  avatar: ImageSourcePropType | { uri: string };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  currentUser?: any;
}

const TIER_LEVELS = [
  { name: 'Gold 1', type: 'gold', minRmr: 1500 },
  { name: 'Gold 2', type: 'gold', minRmr: 1400 },
  { name: 'Gold 3', type: 'gold', minRmr: 1300 },
  { name: 'Silver 1', type: 'silver', minRmr: 1200 },
  { name: 'Silver 2', type: 'silver', minRmr: 1100 },
  { name: 'Silver 3', type: 'silver', minRmr: 1000 },
  { name: 'Bronze 1', type: 'bronze', minRmr: 900 },
  { name: 'Bronze 2', type: 'bronze', minRmr: 800 },
  { name: 'Bronze 3', type: 'bronze', minRmr: 0 },
];

const COLORS = {
  gold: '#FDB931',
  silver: '#E0E0E0',
  bronze: '#FFA07A',
  default: '#34D399' // 봇(God)이나 예외 상황을 위한 기본색상
};

const getTierColor = (tierName: string) => {
  if (tierName.includes('Gold')) return COLORS.gold;
  if (tierName.includes('Silver')) return COLORS.silver;
  if (tierName.includes('Bronze')) return COLORS.bronze;
  return COLORS.default;
};

const OpponentProfileModal: React.FC<Props> = ({ visible, onClose, userProfile, currentUser }) => {
  const navigation = useNavigation<any>();
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [calculatedTier, setCalculatedTier] = useState<string>('Bronze 3'); // 기본값

  useEffect(() => {
    if (visible && currentUser && userProfile && userProfile.id !== 'bot') {
      const checkFriendStatus = async () => {
        const db = getFirestore();
        const friendDoc = await getDoc(doc(db, 'users', currentUser.uid, 'friends', userProfile.id));
        setIsAlreadyFriend(friendDoc.exists());

        if (!friendDoc.exists()) {
            const q = query(
                collection(db, 'notifications'),
                where('type', '==', 'friend_request'),
                where('senderId', '==', currentUser.uid),
                where('receiverId', '==', userProfile.id)
            );
            const snapshot = await getDocs(q);
            setIsRequestSent(!snapshot.empty);
        }

        // DB에서 직접 상대방의 최신 프로필 정보를 가져와 RMR 기반으로 티어 계산
        try {
            const profileDoc = await getDoc(doc(db, 'artifacts', 'rally-app-main', 'users', userProfile.id, 'profile', 'info'));
            if (profileDoc.exists()) {
                const rmr = profileDoc.data().rmr || 1000;
                const tier = getRmrTier(rmr);
                setCalculatedTier(tier);
            }
        } catch (error) {
            console.error("상대방 프로필 RMR 조회 실패:", error);
            // 에러 발생 시 userProfile에 전달받은 rmr 값이 있다면 사용, 없으면 Bronze 3
            if(userProfile.rmr){
                setCalculatedTier(getRmrTier(userProfile.rmr));
            } else {
                 setCalculatedTier('Bronze 3');
            }
        }
      };
      checkFriendStatus();
    } else if (visible && userProfile?.id === 'bot') {
        setCalculatedTier('God'); // 봇의 경우 예외 처리
    }
  }, [visible, currentUser, userProfile]);

  if (!userProfile) return null;

  const formattedMannerScore = Number(userProfile.mannerScore || 5.0).toFixed(1);
  const tierColor = getTierColor(calculatedTier);

  const handleChat = () => {
    onClose();
    navigation.navigate('ChatRoom', {
      title: userProfile.name,
      opponentName: userProfile.name,
      opponentId: userProfile.id,
      roomId: userProfile.id === 'bot' ? 'new_bot_chat' : 'new_chat',
    });
  };

  const handleAddFriend = async () => {
    if (!currentUser) return;
    try {
      const db = getFirestore();

      let myName = currentUser.displayName || '유저';
      try {
          const myProfile = await getDoc(doc(db, 'artifacts', 'rally-app-main', 'users', currentUser.uid, 'profile', 'info'));
          if (myProfile.exists()) myName = myProfile.data().nickname;
      } catch(e) {}

      await addDoc(collection(db, 'notifications'), {
          type: 'friend_request',
          receiverId: userProfile.id,
          senderId: currentUser.uid,
          senderName: myName,
          title: '친구 요청',
          message: `${myName}님이 친구를 맺고 싶어 합니다.`,
          createdAt: serverTimestamp(),
      });

      setIsRequestSent(true);
      Alert.alert("요청 완료", `${userProfile.name}님에게 친구 요청을 보냈습니다.`);
    } catch (error) {
      console.error("친구 요청 실패:", error);
      Alert.alert("오류", "친구 요청 중 문제가 발생했습니다.");
    }
  };

  const handleDeleteFriend = () => {
    Alert.alert("친구 삭제", `${userProfile.name}님을 친구 목록에서 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          if (!currentUser) return;
          try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'users', currentUser.uid, 'friends', userProfile.id));
            await deleteDoc(doc(db, 'users', userProfile.id, 'friends', currentUser.uid));
            setIsAlreadyFriend(false);
            Alert.alert("삭제 완료", "친구 목록에서 삭제되었습니다.");
            onClose();
          } catch (error) {
            console.error("친구 삭제 실패:", error);
            Alert.alert("오류", "삭제 중 문제가 발생했습니다.");
          }
        }
      }
    ]);
  };

  const handleReport = () => {
    Alert.alert("신고하기", `${userProfile.name}님을 신고하시겠습니까?\n허위 신고 시 불이익을 받을 수 있습니다.`, [
      { text: "취소", style: "cancel" },
      {
        text: "신고",
        style: "destructive",
        onPress: async () => {
          if (!userProfile || userProfile.id === 'bot') {
            onClose();
            return;
          }

          try {
            const db = getFirestore();
            const userRef = doc(db, 'artifacts', 'rally-app-main', 'users', userProfile.id, 'profile', 'info');
            const snap = await getDoc(userRef);

            if (snap.exists()) {
              const currentScore = snap.data().mannerScore ?? 5.0;
              // 신고 패널티로 0.3점 차감
              let newScore = currentScore - 0.3;
              newScore = Math.max(0.0, Math.min(5.0, newScore));

              await updateDoc(userRef, { mannerScore: Number(newScore.toFixed(1)) });
            }

            Alert.alert("신고 완료", "신고가 정상적으로 접수되었습니다.");
            onClose();
          } catch (error) {
            console.error("신고 처리 중 오류:", error);
            Alert.alert("오류", "신고 처리 중 문제가 발생했습니다.");
          }
        }
      }
    ]);
  };

  const handleBlock = () => {
    Alert.alert("차단하기", `${userProfile.name}님을 차단하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "차단", style: "destructive", onPress: () => onClose() }
    ]);
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.profileSection}>
                <Image source={userProfile.avatar as any} style={styles.avatar} />
                <Text style={styles.nameText}>{userProfile.name}</Text>
                <Text style={styles.locationText}>{userProfile.location}</Text>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>티어</Text>
                  {/* 동적으로 계산된 티어 색상 반영 */}
                  <Text style={[styles.statValue, { color: tierColor }]}>{calculatedTier}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>승/패</Text>
                  <Text style={styles.statValue}>{userProfile.win}승 {userProfile.loss}패</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>매너 점수</Text>
                  <Text style={styles.statValue}>{formattedMannerScore} / 5.0</Text>
                </View>
              </View>

              <View style={styles.actionContainer}>
                {userProfile.id === 'bot' ? (
                  <TouchableOpacity style={styles.mainActionButton} onPress={handleChat}>
                    <View style={styles.iconRow}>
                      <MessageCircleMore size={20} color="#064E3B" />
                      <Text style={styles.mainActionText}>1:1 대화하기</Text>
                    </View>
                  </TouchableOpacity>
                ) : isAlreadyFriend ? (
                  <>
                    <TouchableOpacity style={styles.mainActionButton} onPress={handleChat}>
                      <View style={styles.iconRow}>
                        <MessageCircleMore size={20} color="#064E3B" />
                        <Text style={styles.mainActionText}>1:1 대화하기</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.subActionButton} onPress={handleDeleteFriend}>
                      <View style={styles.iconRow}>
                        <UserMinus size={18} color="#9CA3AF" />
                        <Text style={styles.subActionText}>친구 삭제</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                        style={[styles.mainActionButton, isRequestSent && { backgroundColor: '#4B5563' }]}
                        onPress={isRequestSent ? undefined : handleAddFriend}
                        disabled={isRequestSent}
                    >
                      <View style={styles.iconRow}>
                        <UserPlus size={20} color={isRequestSent ? "#9CA3AF" : "#064E3B"} />
                        <Text style={[styles.mainActionText, isRequestSent && { color: '#9CA3AF' }]}>
                            {isRequestSent ? "친구 요청 보냄" : "친구 추가 (요청)"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.secondaryRow}>
                      <TouchableOpacity style={[styles.halfBtn, { marginRight: 8 }]} onPress={handleReport}>
                        <View style={styles.iconRow}>
                          <Siren size={18} color="#FFB74D" />
                          <Text style={[styles.halfBtnText, { color: '#FFB74D' }]}>신고</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.halfBtn} onPress={handleBlock}>
                        <View style={styles.iconRow}>
                          <Ban size={18} color="#EF4444" />
                          <Text style={[styles.halfBtnText, { color: '#EF4444' }]}>차단</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#1F2937', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 16, backgroundColor: '#374151', borderWidth: 4, borderColor: '#374151' },
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  locationText: { fontSize: 14, color: '#9CA3AF' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, width: '100%', justifyContent: 'space-around', alignItems: 'center', marginBottom: 24 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#F3F4F6' }, // ✅ 누락된 원래 텍스트 색상 복구
  divider: { width: 1, height: '60%', backgroundColor: '#374151' },
  actionContainer: { width: '100%' },
  mainActionButton: { width: '100%', backgroundColor: '#34D399', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 2 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  mainActionText: { color: '#064E3B', fontWeight: 'bold', fontSize: 16, marginLeft: 6 },
  subActionButton: { width: '100%', paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#111827' },
  subActionText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  secondaryRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  halfBtn: { flex: 1, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  halfBtnText: { fontWeight: '600', fontSize: 14, marginLeft: 6 },
});

export default OpponentProfileModal;