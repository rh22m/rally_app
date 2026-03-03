import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import {
  Star,
  UserPlus,
  Check,
  User,
  ThumbsUp,
  Award,
  X
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OpponentEvaluationProps {
  onComplete: () => void;
  opponentName: string;
  opponentId?: string;
}

export function OpponentEvaluation({ onComplete, opponentName, opponentId }: OpponentEvaluationProps) {
  const [rating, setRating] = useState(0); // 0 ~ 5
  const [isFriendRequested, setIsFriendRequested] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 평가 태그 목록
  const mannerTags = [
    "매너가 좋아요 👍", "실력이 뛰어나요 🏸", "친절해요 😊",
    "페어플레이 🤝", "시간 약속 준수 ⏰", "멋진 경기였어요 🔥"
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleComplete = async () => {
    if (opponentId) {
      try {
        const db = getFirestore();
        const userRef = doc(db, 'artifacts', 'rally-app-main', 'users', opponentId, 'profile', 'info');
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const currentScore = snap.data().mannerScore ?? 5.0;

          // 3점을 기준으로 증감폭 설정 (예: 5점 -> +0.1, 4점 -> +0.05, 3점 -> 0, 2점 -> -0.05, 1점 -> -0.1)
          const scoreChange = (rating - 3) * 0.05;
          let newScore = currentScore + scoreChange;

          // 0.0 ~ 5.0 사이로 제한하고 소수점 첫째 자리까지만 저장
          newScore = Math.max(0.0, Math.min(5.0, newScore));

          await updateDoc(userRef, { mannerScore: Number(newScore.toFixed(1)) });
        }
      } catch (error) {
        console.error("매너 점수 업데이트 실패:", error);
      }
    }

    Alert.alert(
        "평가 완료",
        "소중한 평가가 반영되었습니다.",
        [{ text: "확인", onPress: onComplete }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <LinearGradient colors={['#1F2937', '#111827']} style={styles.gradientContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>경기 상대 평가</Text>
            <Text style={styles.headerSubtitle}>오늘 함께한 파트너는 어떠셨나요?</Text>
          </View>

          {/* 상대방 프로필 카드 */}
          <View style={styles.card}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {/* 실제 이미지가 없을 경우 아이콘으로 대체 */}
                <User size={40} color="#9CA3AF" />
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{opponentName}</Text>
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierText}>Gold</Text>
                  </View>
                </View>
                <Text style={styles.levelText}>Lv. 15 · 승률 62%</Text>
              </View>

              <TouchableOpacity
                style={[
                    styles.friendButton,
                    isFriendRequested && styles.friendButtonActive
                ]}
                onPress={() => setIsFriendRequested(!isFriendRequested)}
              >
                {isFriendRequested ? (
                    <>
                        <Check size={16} color="white" />
                        <Text style={styles.friendButtonText}>요청됨</Text>
                    </>
                ) : (
                    <>
                        <UserPlus size={16} color="white" />
                        <Text style={styles.friendButtonText}>친구 추가</Text>
                    </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* 별점 평가 */}
            <View style={styles.ratingSection}>
                <Text style={styles.sectionTitle}>매너 점수</Text>
                <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Star
                                size={32}
                                color={star <= rating ? "#FBBF24" : "#4B5563"}
                                fill={star <= rating ? "#FBBF24" : "transparent"}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.ratingHelpText}>
                    {rating === 0 ? "별을 눌러 평가해주세요" : `${rating}점을 선택하셨습니다`}
                </Text>
            </View>

            {/* 칭찬 태그 */}
            <View style={styles.tagSection}>
                <Text style={styles.sectionTitle}>어떤 점이 좋았나요?</Text>
                <View style={styles.tagContainer}>
                    {mannerTags.map((tag) => (
                        <TouchableOpacity
                            key={tag}
                            style={[
                                styles.tag,
                                selectedTags.includes(tag) && styles.tagSelected
                            ]}
                            onPress={() => toggleTag(tag)}
                        >
                            <Text style={[
                                styles.tagText,
                                selectedTags.includes(tag) && styles.tagTextSelected
                            ]}>
                                {tag}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
            <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
                <Text style={styles.skipButtonText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                    styles.completeButton,
                    rating === 0 && styles.completeButtonDisabled
                ]}
                onPress={handleComplete}
                disabled={rating === 0}
            >
                <Text style={[
                    styles.completeButtonText,
                    rating === 0 && styles.completeButtonTextDisabled
                ]}>평가 완료</Text>
            </TouchableOpacity>
        </View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'left',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    marginTop: 3,
    marginLeft: -2,
  },
  tierText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  friendButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendButtonActive: {
    backgroundColor: '#10B981',
  },
  friendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E5E7EB',
    marginTop: 16,
    marginBottom: 14,
  },
  starRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ratingHelpText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  tagSection: {
    alignItems: 'center',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagSelected: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderColor: '#34D399',
  },
  tagText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  tagTextSelected: {
    color: '#34D399',
    fontWeight: 'bold',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  skipButtonText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#34D399',
  },
  completeButtonDisabled: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButtonTextDisabled: {
    color: '#6B7280',
  },
});