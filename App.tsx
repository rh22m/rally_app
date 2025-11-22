import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';

import { Home } from './components/Home';
import { BottomNav } from './components/BottomNav';
import { ScoreTracker } from './components/ScoreTracker';
import { GameSummary } from './components/GameSummary';
import AIAnalysis from './Screens/AI/AIAnalysis';

// 1. (수정) SignUpFlow -> SignUpScreen
import LoginScreen from './Screens/Auth/LoginScreen';
import SignUpScreen from './Screens/Auth/SignUpScreen'; // 2. (수정) SignUpFlow -> SignUpScreen
import ChatListScreen from './Screens/Chat/ChatListScreen';
import ProfileScreen from './Screens/Profile/ProfileScreen';


export type Screen =
  | 'home'
  | 'chat'
  | 'ai'
  | 'match'
  | 'profile'
  | 'score'
  | 'summary';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  const [currentScreen, setCurrentScreen] = useState<Screen>('match');
  const [gameResult, setGameResult] = useState({
    duration: 0,
    team1Wins: 0,
    team2Wins: 0,
    isForced: false,
  });

  const handleTabChange = (tab: Screen) => {
    setCurrentScreen(tab);
  };
  const goToSummary = useCallback(
    (result: {
      duration: number;
      team1Wins: number;
      team2Wins: number;
      isForced: boolean;
    }) => {
      setGameResult(result);
      setCurrentScreen('summary');
    },
    [],
  );
  const goToScore = useCallback(() => {
    setCurrentScreen('score');
  }, []);
  const goToMatch = useCallback(() => {
    setCurrentScreen('match');
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setAuthScreen('login');
  }, []);


  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'match':
        return <Home onStartGame={goToScore} />;
      case 'score':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'summary':
        return <GameSummary onNext={goToMatch} result={gameResult} />;
      case 'ai':
        return <AIAnalysis />;
      case 'chat':
        return <ChatListScreen />;
      case 'profile':
        return <ProfileScreen onLogout={handleLogout} />;
      default:
        return (
          <View style={stubStyles.stubContainer}>
            <Text style={stubStyles.stubText}>{currentScreen} 화면</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {!isLoggedIn ? (
        authScreen === 'login' ? (
          <LoginScreen
            onGoToSignUp={() => setAuthScreen('signup')}
            onLogin={() => setIsLoggedIn(true)}
          />
        ) : (
          // 3. (수정) SignUpFlow -> SignUpScreen
          <SignUpScreen
            onGoToLogin={() => setAuthScreen('login')}
            onSignUp={() => setIsLoggedIn(true)}
          />
        )
      ) : (
        <>
          {renderScreen()}

          {currentScreen !== 'home' &&
            currentScreen !== 'score' &&
            currentScreen !== 'summary' && (
              <BottomNav
                currentTab={currentScreen}
                onTabChange={handleTabChange}
              />
            )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});

const stubStyles = StyleSheet.create({
  stubContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  stubText: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  stubButton: {
    backgroundColor: '#34D399',
    padding: 10,
    borderRadius: 5,
  },
});