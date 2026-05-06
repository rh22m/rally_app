/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// app.json에서 가져온 appName('com.recobystackapp')으로 App 컴포넌트를 등록합니다.
AppRegistry.registerComponent(appName, () => App);