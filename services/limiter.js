class LimiterService {
    constructor(maxAttempts, resetInterval) {
        this.maxAttempts = maxAttempts; // 最大操作次数
        this.resetInterval = resetInterval; // 24小时
        this.attempts = 0; // 当前操作次数
        this.firstAttemptTime = null; // 第一次操作时间
    }

    canPerformAction() {
        const now = Date.now();

        // 检查是否需要重置计数
        if (
            this.firstAttemptTime &&
            now - this.firstAttemptTime >= this.resetInterval
        ) {
            this.reset();
        }

        // 检查是否可以执行操作
        return this.attempts < this.maxAttempts;
    }

    performAction() {
        if (this.canPerformAction()) {
            if (this.attempts === 0) {
                this.firstAttemptTime = Date.now(); // 记录第一次操作时间
            }
            this.attempts++;
            console.log(`Action performed! Total attempts: ${this.attempts}`);
        } else {
            console.log("Limit reached! Try again later.");
        }
    }

    reset() {
        this.attempts = 0; // 重置操作次数
        this.firstAttemptTime = null; // 清除第一次操作时间
        console.log("Rate limiter reset.");
    }
}
module.exports = LimiterService;
