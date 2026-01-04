import React from 'react';
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
// 이모티콘 대체용 아이콘 추가
import { MessageCircleMore, UserPlus, UserMinus, Siren, Ban } from 'lucide-react-native';

interface UserProfile {
  id: string;
  name: string;
  location: string;
  tier: string;
  win: number;
  loss: number;
  mannerScore: number;
  avatar: ImageSourcePropType | { uri: string };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  relationType: 'friend' | 'opponent';
}

const OpponentProfileModal: React.FC<Props> = ({ visible, onClose, userProfile, relationType = 'opponent' }) => {
  const navigation = useNavigation<any>();

  if (!userProfile) return null;

  // 1:1 대화하기
  const handleChat = () => {
    onClose();
    navigation.navigate('ChatRoom', {
      title: userProfile.name,
      opponentName: userProfile.name,
      roomId: 'new_chat',
    });
  };

  // 친구 추가
  const handleAddFriend = () => {
    Alert.alert("친구 추가", `${userProfile.name}님을 친구로 추가했습니다.`);
    onClose();
  };

  // 친구 삭제
  const handleDeleteFriend = () => {
    Alert.alert("친구 삭제", `${userProfile.name}님을 친구 목록에서 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => onClose() }
    ]);
  };

  // 신고
  const handleReport = () => {
    Alert.alert("신고하기", `${userProfile.name}님을 신고하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "신고", onPress: () => onClose() }
    ]);
  };

  // 차단
  const handleBlock = () => {
    Alert.alert("차단하기", `${userProfile.name}님을 차단하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "차단", style: "destructive", onPress: () => onClose() }
    ]);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* 프로필 섹션 */}
              <View style={styles.profileSection}>
                <Image
                  source={userProfile.avatar}
                  style={styles.avatar}
                />
                <Text style={styles.nameText}>{userProfile.name}</Text>
                <Text style={styles.locationText}>{userProfile.location}</Text>
              </View>

              {/* 통계 박스 */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>티어</Text>
                  <Text style={[styles.statValue, { color: '#34D399' }]}>{userProfile.tier}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>승/패</Text>
                  <Text style={styles.statValue}>{userProfile.win}승 {userProfile.loss}패</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>매너 점수</Text>
                  <Text style={styles.statValue}>{userProfile.mannerScore} / 5.0</Text>
                </View>
              </View>

              {/* 기능 버튼 영역 */}
              <View style={styles.actionContainer}>
                {relationType === 'friend' ? (
                  // [친구 모드]
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
                  // [상대방 모드]
                  <>
                    <TouchableOpacity style={styles.mainActionButton} onPress={handleAddFriend}>
                      <View style={styles.iconRow}>
                        <UserPlus size={20} color="#064E3B" />
                        <Text style={styles.mainActionText}>친구 추가</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
    backgroundColor: '#374151',
    borderWidth: 4,
    borderColor: '#374151',
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#374151',
  },

  // 버튼 스타일
  actionContainer: {
    width: '100%',
  },
  mainActionButton: {
    width: '100%',
    backgroundColor: '#34D399',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0, // 아이콘과 텍스트 사이 간격
  },
  mainActionText: {
    color: '#064E3B',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  subActionButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  subActionText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  halfBtn: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  halfBtnText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default OpponentProfileModal;