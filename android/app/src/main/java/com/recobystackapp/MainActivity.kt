package com.recobystackapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.util.Log
import java.security.MessageDigest

import androidx.core.app.NotificationCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    companion object {
        // [핵심] 실제 경기 중인지 여부를 판별하는 플래그.
        // 현재는 false이며, React Native 단에서 경기 시작/종료 시 이 값을 제어할 수 있도록 세팅된 상태입니다.
        @JvmStatic
        var isMatchRecording: Boolean = true
    }

    private val NOTIFICATION_ID = 1001
    private val CHANNEL_ID = "ongoing_match_channel"
    private var notificationManager: NotificationManager? = null

    override fun getMainComponentName(): String = "com.recobystackapp"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)

        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // 알림 채널은 앱 실행 시 최초 1회만 안전하게 생성
        createNotificationChannel()

        // 카카오 키 해시 추출 (Null 안전성 검사 포함)
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

    override fun onPause() {
        super.onPause()
        // 앱이 화면에서 사라질 때, '경기가 진행 중'인 경우에만 인디케이터를 띄웁니다. (구글 정책 준수)
        if (isMatchRecording) {
            showOngoingActivity()
        } else {
            removeOngoingActivity()
        }
    }

    override fun onResume() {
        super.onResume()
        // 앱이 화면에 켜져 있을 때는 시계 인디케이터가 불필요하므로 즉시 제거
        removeOngoingActivity()
    }

    override fun onDestroy() {
        super.onDestroy()
        // 앱이 메모리에서 완전히 죽을 때 남아있는 알림 찌꺼기 제거
        removeOngoingActivity()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Ongoing Match",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "진행 중인 경기를 시계 화면에 표시합니다."
                setSound(null, null)
                setShowBadge(false)
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun showOngoingActivity() {
        // 앱 복귀 시 리액트 네이티브 뷰가 두 번 로드되는 것을 방지하기 위한 플래그 적용
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        // 안드로이드 12 이상을 위한 PendingIntent 보안 플래그 적용
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            pendingIntentFlags
        )

        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RECO SCORE")
            .setContentText("경기 기록 중")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)

        val status = Status.Builder()
            .addTemplate("경기 기록 중")
            .build()

        val ongoingActivity = OngoingActivity.Builder(this, NOTIFICATION_ID, notificationBuilder)
            .setStaticIcon(R.mipmap.ic_launcher)
            .setTouchIntent(pendingIntent)
            .setStatus(status)
            .build()

        ongoingActivity.apply(this)
        notificationManager?.notify(NOTIFICATION_ID, notificationBuilder.build())
    }

    private fun removeOngoingActivity() {
        notificationManager?.cancel(NOTIFICATION_ID)
    }
}