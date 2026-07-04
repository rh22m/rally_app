package com.recobystackapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OngoingActivityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // JS에서 부를 모듈의 이름을 지정합니다.
    override fun getName(): String {
        return "OngoingActivityModule"
    }

    // @ReactMethod 어노테이션이 있어야 JS에서 호출할 수 있습니다.
    @ReactMethod
    fun setMatchRecording(isRecording: Boolean) {
        // 방금 MainActivity에 만든 상태 변수를 변경합니다.
        MainActivity.isMatchRecording = isRecording
    }
}