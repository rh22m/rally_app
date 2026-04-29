package com.recoapp

import android.os.Bundle
import android.content.pm.PackageManager
import android.util.Base64
import android.util.Log
import java.security.MessageDigest

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "RECO"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)

        // 카카오 키 해시 추출 (Null 안전성 검사 포함 - 에러 수정됨)
        try {
            val info = packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
            info.signatures?.forEach { signature ->
                val md = MessageDigest.getInstance("SHA")
                md.update(signature.toByteArray())
                Log.d("KAKAO_KEY_HASH", Base64.encodeToString(md.digest(), Base64.NO_WRAP))
            }
        } catch (e: Exception) {
            Log.e("KAKAO_KEY_HASH", "Error", e)
        }
    }
}