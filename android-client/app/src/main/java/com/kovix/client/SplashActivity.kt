package com.kovix.client

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.DecelerateInterpolator
import android.widget.LinearLayout
import android.view.View
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {
    private val splashDelayMs = 1150L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val card = findViewById<LinearLayout>(R.id.splashCard)
        val title = findViewById<View>(R.id.splashTitle)

        card.alpha = 0f
        card.translationY = 22f
        title.alpha = 0f

        title.animate()
            .alpha(1f)
            .setDuration(520L)
            .setInterpolator(DecelerateInterpolator())
            .start()

        card.animate()
            .alpha(1f)
            .translationY(0f)
            .setStartDelay(110L)
            .setDuration(460L)
            .setInterpolator(DecelerateInterpolator())
            .start()

        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }, splashDelayMs)
    }
}
