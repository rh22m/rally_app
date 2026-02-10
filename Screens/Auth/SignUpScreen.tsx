import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
  SafeAreaView,
  Dimensions,
  FlatList,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Phone,
  Check,
  X,
  ChevronRight,
  Smartphone,
  MapPin,
  ChevronLeft, // [추가] 아이콘
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// [수정] App.tsx의 handleSignUp과 호환되도록 인터페이스 수정
interface SignUpScreenProps {
  onGoToLogin: () => void;
  onSignUp: (email: string, password: string, nickname: string) => void;
}

// -----------------------------------------------------------------------------------------
// [지역 데이터 상수] (Home.tsx와 동일하게 사용)
// -----------------------------------------------------------------------------------------
const MAIN_REGIONS = [
  { label: '서울', value: '서울' },
  { label: '경기', value: '경기' },
  { label: '인천', value: '인천' },
  { label: '강원', value: '강원' },
  { label: '충청', value: '충청' },
  { label: '전라', value: '전라' },
  { label: '경상', value: '경상' },
  { label: '제주', value: '제주' },
];

const SUB_REGIONS: { [key: string]: string[] } = {
  '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  '경기': ['수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시', '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '구리시', '안성시', '포천시', '의왕시', '하남시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군'],
  '인천': ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  '강원': ['전체'], '충청': ['전체'], '전라': ['전체'], '경상': ['전체'], '제주': ['전체']
};

// -----------------------------------------------------------------------------------------
// [실제 효력이 있는 수준의 약관 데이터 예시]
// -----------------------------------------------------------------------------------------
const LEGAL_TEXTS = {
  terms: `제1조 (목적)
본 약관은 랠리(Rally) (이하 "회사")가 제공하는 배드민턴 매칭 및 커뮤니티 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
1. "회원"이란 본 약관에 동의하고 가입 절차를 완료하여 회사가 제공하는 서비스를 이용하는 자를 말합니다.
2. "서비스"란 회사가 제공하는 경기 매칭, AI 분석, 커뮤니티 등의 제반 서비스를 의미합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.
2. 회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위 안에서 본 약관을 개정할 수 있습니다.`,

  privacy: `1. 개인정보 수집 항목
회사는 회원가입, 서비스 이용 등을 위해 아래와 같은 개인정보를 수집합니다.
- 필수항목: 이메일 주소, 비밀번호, 닉네임, 휴대폰 번호, 생년월일, 활동 지역, 성별
- 선택항목: 프로필 사진, 구력 정보, 선호 시간대

2. 개인정보의 수집 및 이용목적
- 서비스 제공: 콘텐츠 제공, 맞춤형 서비스 제공
- 회원 관리: 본인 확인, 개인 식별, 불량 회원의 부정 이용 방지
- 신규 서비스 개발 및 마케팅 광고에의 활용

3. 개인정보의 보유 및 이용기간
회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 일정 기간 동안 정보를 보관합니다.`,

  location: `1. 위치정보의 이용 목적
회사는 사용자의 현재 위치를 기반으로 주변 배드민턴 경기장 정보 제공, 가까운 사용자 간의 매칭 추천 서비스를 제공하기 위해 위치정보를 이용합니다.

2. 위치정보의 보유 및 이용기간
회사는 서비스를 제공하는 기간 동안에 한하여 이용자의 위치정보를 보유 및 이용하며, 이용자가 탈퇴하거나 위치정보 이용 동의를 철회하는 경우 지체 없이 파기합니다.

3. 위치정보 주체의 권리
이용자는 언제든지 자신의 위치정보 이용 내역을 조회하거나 정정을 요구할 수 있으며, 오류가 있는 경우 정정을 요구할 수 있습니다.`
};

// -----------------------------------------------------------------------------------------
// [가상 본인인증 모듈 HTML]
// -----------------------------------------------------------------------------------------
const MOCK_VERIFICATION_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, Helvetica, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
    .card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 90%; max-width: 400px; text-align: center; }
    .logo { color: #34D399; font-size: 24px; font-weight: bold; margin-bottom: 20px; display: block; }
    h2 { font-size: 18px; color: #111827; margin-bottom: 10px; }
    p { color: #6B7280; font-size: 14px; margin-bottom: 24px; }
    .btn { background-color: #34D399; color: white; border: none; padding: 14px; width: 100%; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-bottom: 12px; }
    .btn.cancel { background-color: #E5E7EB; color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <span class="logo">PASS / SMS 인증</span>
    <h2>휴대폰 본인 확인</h2>
    <p>안전한 서비스 이용을 위해<br>본인 인증을 진행해주세요.</p>

    <button class="btn" onclick="verify()">인증하기 (통신사 선택)</button>
    <button class="btn cancel" onclick="cancel()">취소</button>
  </div>

  <script>
    function verify() {
      setTimeout(() => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            success: true,
            phone: '010-1234-5678',
            carrier: 'SKT'
          }));
        }
      }, 1000);
    }
    function cancel() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: false }));
      }
    }
  </script>
</body>
</html>
`;

// 4단계 인디케이터
const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <View style={styles.stepIndicatorContainer}>
    {[1, 2, 3, 4].map((step) => (
      <React.Fragment key={step}>
        <View
          style={[
            styles.stepDot,
            step === currentStep && styles.stepDotActive,
            step < currentStep && styles.stepDotCompleted,
          ]}
        >
          {step < currentStep ? (
            <Check size={14} color="white" />
          ) : (
            <Text style={[styles.stepText, step === currentStep && styles.stepTextActive]}>
              {step}
            </Text>
          )}
        </View>
        {step < 4 && <View style={styles.stepLine} />}
      </React.Fragment>
    ))}
  </View>
);

// -------------------------------------------------------------------------
// 1단계: 약관 동의
// -------------------------------------------------------------------------
const Step1_TOS = ({ onNext }: { onNext: () => void }) => {
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeLocation, setAgreeLocation] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const handleAgreeAll = (value: boolean) => {
    setAgreeAll(value);
    setAgreeTerms(value);
    setAgreePrivacy(value);
    setAgreeLocation(value);
  };

  const openModal = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
    setModalVisible(true);
  };

  const isNextDisabled = !agreeTerms || !agreePrivacy || !agreeLocation;

  return (
    <>
      <Text style={styles.title}>약관 동의</Text>
      <Text style={styles.subtitle}>랠리(Rally) 여정을 위해 동의가 필요해요.</Text>

      <TouchableOpacity
        style={[styles.checkContainer, styles.checkAll]}
        onPress={() => handleAgreeAll(!agreeAll)}
      >
        <View style={[styles.checkbox, agreeAll && styles.checkboxActive]}>
          {agreeAll && <Check size={16} color="white" />}
        </View>
        <Text style={styles.checkLabelAll}>전체 동의하기</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.termRow}>
        <TouchableOpacity
          style={styles.termCheckArea}
          onPress={() => setAgreeTerms(!agreeTerms)}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
            {agreeTerms && <Check size={16} color="white" />}
          </View>
          <Text style={styles.checkLabel}>[필수] 이용약관</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openModal('이용약관', LEGAL_TEXTS.terms)}>
          <Text style={styles.checkLink}>보기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.termRow}>
        <TouchableOpacity
          style={styles.termCheckArea}
          onPress={() => setAgreePrivacy(!agreePrivacy)}
        >
          <View style={[styles.checkbox, agreePrivacy && styles.checkboxActive]}>
            {agreePrivacy && <Check size={16} color="white" />}
          </View>
          <Text style={styles.checkLabel}>[필수] 개인정보 처리방침</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openModal('개인정보 처리방침', LEGAL_TEXTS.privacy)}>
          <Text style={styles.checkLink}>보기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.termRow}>
        <TouchableOpacity
          style={styles.termCheckArea}
          onPress={() => setAgreeLocation(!agreeLocation)}
        >
          <View style={[styles.checkbox, agreeLocation && styles.checkboxActive]}>
            {agreeLocation && <Check size={16} color="white" />}
          </View>
          <Text style={styles.checkLabel}>[필수] 위치정보 이용약관</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openModal('위치정보 이용약관', LEGAL_TEXTS.location)}>
          <Text style={styles.checkLink}>보기</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, isNextDisabled && styles.buttonDisabled]}
        onPress={onNext}
        disabled={isNextDisabled}
      >
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>{modalContent}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// -------------------------------------------------------------------------
// 2단계: 휴대폰 본인인증
// -------------------------------------------------------------------------
const Step2_PhoneVerify = ({ onNext }: { onNext: () => void }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showWebView, setShowWebView] = useState(false);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.success) {
        setIsVerified(true);
        setPhoneNumber(data.phone || '010-XXXX-XXXX');
        setShowWebView(false);
        Alert.alert('인증 성공', '본인인증이 완료되었습니다.');
      } else {
        setShowWebView(false);
      }
    } catch (e) {
      console.log('Verification parse error', e);
    }
  };

  return (
    <>
      <Text style={styles.title}>본인 인증</Text>
      <Text style={styles.subtitle}>안전한 매칭을 위해 본인인증을 진행합니다.</Text>

      <View style={[styles.inputContainer, isVerified && styles.inputVerified]}>
        <Phone size={20} color={isVerified ? "#34D399" : "#9CA3AF"} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isVerified && { color: '#34D399', fontWeight: 'bold' }]}
          placeholder="인증 후 번호가 표시됩니다"
          placeholderTextColor="#9CA3AF"
          value={phoneNumber}
          editable={false}
        />
        {isVerified && <Check size={20} color="#34D399" />}
      </View>

      {!isVerified ? (
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => setShowWebView(true)}
        >
          <ShieldCheck size={20} color="#111827" style={{ marginRight: 8 }} />
          <Text style={styles.verifyButtonText}>휴대폰 본인인증 하기</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.verifiedText}>인증이 완료되었습니다. 다음으로 넘어가세요.</Text>
      )}

      <TouchableOpacity
        style={[styles.button, !isVerified && styles.buttonDisabled]}
        onPress={onNext}
        disabled={!isVerified}
      >
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          setIsVerified(true);
          setPhoneNumber('010-0000-0000 (Dev)');
          setTimeout(onNext, 500);
        }}
      >
        <Text style={styles.linkText}>[개발용] 본인인증 건너뛰기</Text>
      </TouchableOpacity>

      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>본인인증 서비스</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: MOCK_VERIFICATION_HTML }}
            style={{ flex: 1 }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

// -------------------------------------------------------------------------
// 3단계: 계정 정보 (지역 선택 수정됨: 모달 기반 선택)
// -------------------------------------------------------------------------
const Step3_AccountInfo = ({ onNext }: { onNext: (data: any) => void }) => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 지역 선택 상태
  const [region, setRegion] = useState(''); // 최종 선택값 (예: 서울 강남구)
  const [gender, setGender] = useState<'남성' | '여성' | null>(null);

  // 지역 모달 관련 상태
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  const [tempMainRegion, setTempMainRegion] = useState<string | null>(null);

  const handleNext = () => {
    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!email || !nickname || !password || !region || !gender) {
      Alert.alert('오류', '모든 정보를 입력해주세요.');
      return;
    }
    // [수정] 비밀번호(password)를 포함하여 전달
    onNext({ email, nickname, password, region, gender });
  };

  const handleRegionItemPress = (itemValue: string) => {
    if (!tempMainRegion) {
      // 1단계: 시/도 선택
      setTempMainRegion(itemValue);
    } else {
      // 2단계: 시/군/구 선택
      const finalRegion = itemValue === '전체' ? tempMainRegion : `${tempMainRegion} ${itemValue}`;
      setRegion(finalRegion);
      setIsRegionModalVisible(false);
      setTempMainRegion(null);
    }
  };

  const renderRegionList = () => {
    if (!tempMainRegion) {
      // 메인 지역 리스트 렌더링
      return (
        <FlatList
          data={MAIN_REGIONS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.regionItem} onPress={() => handleRegionItemPress(item.value)}>
              <Text style={styles.regionItemText}>{item.label}</Text>
              <ChevronRight size={16} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        />
      );
    }

    // 상세 지역 리스트 렌더링
    const subRegions = SUB_REGIONS[tempMainRegion] || ['전체'];
    return (
      <View style={{flex: 1, width: '100%'}}>
        <TouchableOpacity style={styles.regionHeaderBack} onPress={() => setTempMainRegion(null)}>
          <ChevronLeft size={20} color="#374151" />
          <Text style={styles.regionHeaderBackText}>{tempMainRegion} (다시 선택)</Text>
        </TouchableOpacity>
        <FlatList
          data={subRegions}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.regionItem} onPress={() => handleRegionItemPress(item)}>
              <Text style={styles.regionItemText}>
                {item === '전체' ? `${tempMainRegion} 전체` : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  return (
    <>
      <Text style={styles.title}>계정 정보</Text>
      <Text style={styles.subtitle}>로그인 정보와 프로필을 완성해주세요.</Text>

      <View style={styles.inputContainer}>
        <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <User size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="닉네임"
          placeholderTextColor="#9CA3AF"
          value={nickname}
          onChangeText={setNickname}
        />
      </View>

      {/* [수정] 활동 지역 선택 (TouchableOpacity로 변경) */}
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => { setTempMainRegion(null); setIsRegionModalVisible(true); }}
      >
        <MapPin size={20} color={region ? "#34D399" : "#9CA3AF"} style={styles.inputIcon} />
        <Text style={[styles.inputText, !region && styles.placeholderText]}>
          {region || "주 활동 지역 선택"}
        </Text>
        <ChevronRight size={20} color="#6B7280" />
      </TouchableOpacity>

      {/* 성별 선택 */}
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, gender === '남성' && styles.genderButtonSelected]}
          onPress={() => setGender('남성')}
        >
          <Text style={[styles.genderText, gender === '남성' && styles.genderTextSelected]}>남성</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === '여성' && styles.genderButtonSelected]}
          onPress={() => setGender('여성')}
        >
          <Text style={[styles.genderText, gender === '여성' && styles.genderTextSelected]}>여성</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <View style={styles.inputContainer}>
        <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor="#9CA3AF"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => onNext({ email: 'dev@test.com', nickname: '개발용', password: 'password123', region: '서울 강남구', gender: '남성' })}
      >
        <Text style={styles.linkText}>[개발용] 계정정보 건너뛰기</Text>
      </TouchableOpacity>

      {/* 지역 선택 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRegionModalVisible}
        onRequestClose={() => setIsRegionModalVisible(false)}
      >
        <Pressable style={styles.regionModalOverlay} onPress={() => setIsRegionModalVisible(false)}>
          <Pressable style={styles.regionModalContent} onPress={() => {}}>
            <Text style={styles.regionModalTitle}>지역 선택</Text>
            {renderRegionList()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// -------------------------------------------------------------------------
// 4단계: RMR 초기 평가
// -------------------------------------------------------------------------
const Step4_RMRQuiz = ({ onComplete }: { onComplete: () => void }) => {
  const [answer1, setAnswer1] = useState<string | null>(null);

  return (
    <>
      <Text style={styles.title}>실력 가이드</Text>
      <Text style={styles.subtitle}>기본적인 룰 퀴즈로 RMR 참고 점수를 측정합니다.</Text>

      <Text style={styles.quizQuestion}>Q1. 배드민턴 복식 경기에서, 서브 순서는 어떻게 되나요?</Text>
      <TouchableOpacity
        style={[styles.quizOption, answer1 === 'A' && styles.quizOptionSelected]}
        onPress={() => setAnswer1('A')}
      >
        <Text style={[styles.quizText, answer1 === 'A' && styles.quizTextSelected]}>A. 점수를 낼 때마다 서버가 바뀐다.</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.quizOption, answer1 === 'B' && styles.quizOptionSelected]}
        onPress={() => setAnswer1('B')}
      >
        <Text style={[styles.quizText, answer1 === 'B' && styles.quizTextSelected]}>B. 점수를 낸 팀이 계속 서브를 넣는다.</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !answer1 && styles.buttonDisabled]}
        onPress={onComplete}
        disabled={!answer1}
      >
        <Text style={styles.buttonText}>가입 완료</Text>
      </TouchableOpacity>
    </>
  );
};

// -------------------------------------------------------------------------
// 메인 컴포넌트
// -------------------------------------------------------------------------
export default function SignUpScreen({ onGoToLogin, onSignUp }: SignUpScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [signUpData, setSignUpData] = useState({});

  const handleNextStep = (data: any = {}) => {
    setSignUpData({ ...signUpData, ...data });
    setCurrentStep(currentStep + 1);
  };

  const handleComplete = () => {
    console.log("최종 회원가입 데이터:", signUpData);
    // [수정] App.tsx가 기대하는 인자(email, password, nickname)를 전달
    const { email, password, nickname } = signUpData as any;

    if (email && password && nickname) {
        onSignUp(email, password, nickname);
    } else {
        Alert.alert("오류", "회원가입에 필요한 정보가 누락되었습니다.");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1_TOS onNext={handleNextStep} />;
      case 2: return <Step2_PhoneVerify onNext={handleNextStep} />;
      case 3: return <Step3_AccountInfo onNext={handleNextStep} />;
      case 4: return <Step4_RMRQuiz onComplete={handleComplete} />;
      default: return <Step1_TOS onNext={handleNextStep} />;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require('../../assets/images/rally-logo.png')} style={styles.logo} />

        <StepIndicator currentStep={currentStep} />

        {renderStep()}

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={styles.linkText}>이미 계정이 있으신가요? <Text style={styles.linkTextHighlight}>로그인</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { width: 60, height: 60, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9CA3AF', marginBottom: 32, textAlign: 'center' },

  // Step Indicator
  stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, width: '80%' },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#34D399' },
  stepDotCompleted: { backgroundColor: '#34D399' },
  stepText: { color: '#9CA3AF', fontWeight: 'bold' },
  stepTextActive: { color: 'white' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#374151' },

  // Inputs
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', borderRadius: 8, width: '100%', marginBottom: 16, paddingHorizontal: 16 },
  inputVerified: { borderColor: '#34D399', borderWidth: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: 'white' },
  // [추가] Text-based Input 스타일 (TouchableOpacity 용)
  inputText: { flex: 1, paddingVertical: 14, fontSize: 16, color: 'white' },
  placeholderText: { color: '#9CA3AF' },

  // Gender Selection
  genderContainer: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 16 },
  genderButton: { flex: 1, backgroundColor: '#374151', borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  genderButtonSelected: { backgroundColor: '#1F2937', borderColor: '#34D399' },
  genderText: { fontSize: 16, color: '#9CA3AF', fontWeight: '500' },
  genderTextSelected: { color: '#34D399', fontWeight: 'bold' },

  button: { backgroundColor: '#34D399', borderRadius: 8, width: '100%', paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#111827', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: '#374151' },

  linksContainer: { width: '100%', alignItems: 'center', marginTop: 24, borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 24 },
  linkText: { fontSize: 14, color: '#9CA3AF' },
  linkTextHighlight: { color: '#34D399', fontWeight: 'bold' },
  skipButton: { marginTop: 16 },

  // Step 1
  checkContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 },
  checkAll: { marginBottom: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#9CA3AF', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#34D399', borderColor: '#34D399' },
  checkLabelAll: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  divider: { height: 1, backgroundColor: '#374151', width: '100%', marginBottom: 20 },
  termRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  termCheckArea: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkLabel: { fontSize: 16, color: 'white' },
  checkLink: { fontSize: 14, color: '#9CA3AF', textDecorationLine: 'underline', padding: 4 },

  // Modal (Terms & Region Common)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', height: '70%', backgroundColor: '#1F2937', borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  modalBody: { flex: 1, marginVertical: 16 },
  modalText: { color: '#D1D5DB', lineHeight: 22 },
  modalButton: { backgroundColor: '#34D399', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalButtonText: { color: '#111827', fontWeight: 'bold', fontSize: 16 },

  // [추가] Region Modal Specific
  regionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  regionModalContent: { width: '100%', height: '60%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32 },
  regionModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  regionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  regionItemText: { fontSize: 18, color: '#1F2937' },
  regionHeaderBack: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 8 },
  regionHeaderBackText: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginLeft: 8 },

  // Step 2 (Verification)
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 8, paddingVertical: 14, width: '100%', marginBottom: 10 },
  verifyButtonText: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
  verifiedText: { color: '#34D399', textAlign: 'center', marginBottom: 20 },
  webViewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  webViewTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Step 4 (Quiz)
  quizQuestion: { fontSize: 16, color: 'white', width: '100%', marginBottom: 16, fontWeight: '500' },
  quizOption: { backgroundColor: '#374151', borderRadius: 8, padding: 16, width: '100%', marginBottom: 12 },
  quizOptionSelected: { backgroundColor: '#34D399', borderColor: '#34D399' },
  quizText: { fontSize: 16, color: 'white' },
  quizTextSelected: { color: '#111827', fontWeight: 'bold' },
});