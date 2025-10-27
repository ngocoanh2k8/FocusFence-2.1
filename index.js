
import { GoogleGenAI } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let studentData = null;
    let sessionConfig = null;
    let isSessionActive = false;
    let isBreakActive = false;
    let timerInterval = null;
    let scheduleCheckInterval = null;

    const MILESTONES = [1, 5, 10, 25, 50, 100];
    const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const MOTIVATIONAL_MESSAGES = [
        "Một ngày mới, một cơ hội mới để tập trung và thành công. Bắt đầu phiên học của bạn nào!",
        "Hành trình vạn dặm bắt đầu bằng một bước chân. Bước chân hôm nay của bạn là gì? Cùng tập trung nhé!",
        "Đừng chờ đợi cảm hứng, hãy tạo ra nó. Bắt đầu tập trung và xem điều kỳ diệu xảy ra.",
        "Sự khác biệt giữa bình thường và phi thường chính là sự 'thêm một chút'. Hãy 'thêm một chút' tập trung ngay hôm nay!",
        "Hôm nay là một trang giấy trắng. Hãy viết nên một câu chuyện thành công bằng sự tập trung của bạn.",
        "Tương lai của bạn được tạo ra bởi những gì bạn làm hôm nay, không phải ngày mai. Bắt đầu phiên học của bạn!"
    ];

    // --- DOM ELEMENT SELECTORS ---
    const body = document.body;
    const screens = {
        emailCapture: document.getElementById('email-capture-screen'),
        mainApp: document.getElementById('main-app-screen'),
        earlyExit: document.getElementById('early-exit-screen'),
        weeklyReview: document.getElementById('weekly-review-screen'),
    };
    const views = {
        configurator: document.getElementById('configurator-view'),
        session: document.getElementById('session-view'),
    };
    const themeToggles = [
        document.getElementById('theme-toggle-email'),
        document.getElementById('theme-toggle-main')
    ];
    const emailCaptureForm = {
        form: document.getElementById('email-capture-form'),
        nameInput: document.getElementById('name-input'),
        emailInput: document.getElementById('email-input'),
        remindersCheckbox: document.getElementById('reminders-checkbox'),
        error: document.getElementById('email-error'),
    };
    const mainAppElements = {
        studentName: document.getElementById('student-name'),
        totalCrystalsGrown: document.getElementById('total-crystals-grown'),
        progressBarFill: document.getElementById('progress-bar-fill'),
        nextMilestone: document.getElementById('next-milestone'),
        dailyRewardIcon: document.getElementById('daily-reward-icon'),
        dailyRewardText: document.getElementById('daily-reward-text'),
        claimRewardButton: document.getElementById('claim-reward-button'),
        showReviewBtn: document.getElementById('show-review-btn'),
    };
    const configurator = {
        form: document.getElementById('config-form'),
        manualModeBtn: document.getElementById('manual-mode-btn'),
        scheduledModeBtn: document.getElementById('scheduled-mode-btn'),
        manualPanel: document.getElementById('manual-config-panel'),
        scheduledPanel: document.getElementById('scheduled-config-panel'),
        durationInput: document.getElementById('duration-input'),
        letterInput: document.getElementById('letter-input'),
        letterColorPicker: document.getElementById('letter-color-picker'),
        startTimeInput: document.getElementById('start-time'),
        endTimeInput: document.getElementById('end-time'),
        daysContainer: document.getElementById('days-of-week-container'),
        submitBtnText: document.getElementById('submit-config-text'),
    };
    const sessionElements = {
        header: document.getElementById('session-header'),
        subheader: document.getElementById('session-subheader'),
        timerContainer: document.getElementById('timer-container'),
        successMessageContainer: document.getElementById('success-message-container'),
        timerDisplay: document.getElementById('timer-display'),
        timerProgressBar: document.getElementById('timer-progress-bar'),
        endEarlyButton: document.getElementById('end-early-button'),
        newCrystalButton: document.getElementById('new-crystal-button'),
        startBreakButton: document.getElementById('start-break-button'),
        postSessionControls: document.getElementById('post-session-controls'),
        crystalContainer: document.getElementById('crystal-container-session'),
        aiCoachContainer: document.getElementById('ai-coach-container'),
        aiCoachMessage: document.getElementById('ai-coach-message'),
    };
    const weeklyReviewElements = {
        closeBtn: document.getElementById('close-review-btn'),
        totalCrystals: document.getElementById('review-total-crystals'),
        totalTime: document.getElementById('review-total-time'),
        lettersContainer: document.getElementById('letters-container'),
    };
    const growthVisualElements = {
        config: {
            base: document.getElementById('crystal-base-config'),
            mainShard: document.getElementById('crystal-main-shard-config'),
            leftShard: document.getElementById('crystal-left-shard-config'),
            rightShard: document.getElementById('crystal-right-shard-config'),
            glow: document.getElementById('crystal-glow-config'),
        },
        session: {
            base: document.getElementById('crystal-base-session'),
            mainShard: document.getElementById('crystal-main-shard-session'),
            leftShard: document.getElementById('crystal-left-shard-session'),
            rightShard: document.getElementById('crystal-right-shard-session'),
            glow: document.getElementById('crystal-glow-session'),
        },
        withered: {
            base: document.getElementById('crystal-base-withered'),
            mainShard: document.getElementById('crystal-main-shard-withered'),
            leftShard: document.getElementById('crystal-left-shard-withered'),
            rightShard: document.getElementById('crystal-right-shard-withered'),
            glow: document.getElementById('crystal-glow-withered'),
        },
    };

    // --- TIMER UPDATE FUNCTIONS ---
    const updateFocusTimer = () => {
        if (!isSessionActive || !sessionConfig || !sessionConfig.endTime) return;

        const timeLeftMs = sessionConfig.endTime - Date.now();
        const timeLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
        
        sessionConfig.timeLeft = timeLeft; // Keep this for early exit logic

        const progress = (sessionConfig.duration - timeLeft) / sessionConfig.duration;
        const progressPercentage = (timeLeft / sessionConfig.duration) * 100;

        updateTimerDisplay(timeLeft);
        updateGrowthVisual(progress, 'session');
        sessionElements.timerProgressBar.style.width = `${progressPercentage}%`;

        if (timeLeft <= 0) {
            handleSessionComplete();
        }
    };
    
    const breakDurationSeconds = 5 * 60;
    const updateBreakTimer = () => {
        if (!isBreakActive || !sessionConfig || !sessionConfig.breakEndTime) return;

        const timeLeftMs = sessionConfig.breakEndTime - Date.now();
        const timeLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
        const progressPercentage = (timeLeft / breakDurationSeconds) * 100;
        
        updateTimerDisplay(timeLeft);
        sessionElements.timerProgressBar.style.width = `${progressPercentage}%`;

        if (timeLeft <= 0) {
            handleBreakComplete();
        }
    };


    // --- HELPER FUNCTIONS ---
    const showScreen = (screenName) => {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        if(screens.mainApp === screens[screenName] || screens.emailCapture === screens[screenName]) {
            Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        }

        if (screens[screenName]) {
            screens[screenName].classList.remove('hidden');
        }
    };

    const getVietnamDateString = (date = new Date()) => {
        const vietnamTimeOpts = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric' };
        return new Intl.DateTimeFormat('en-CA', vietnamTimeOpts).format(date);
    };

    const saveStudentData = () => {
        try {
            localStorage.setItem('studentData', JSON.stringify(studentData));
        } catch (e) {
            console.error("Failed to save student data to localStorage", e);
        }
    };

    const getContrastColor = (hexColor) => {
        if (!hexColor) return '#1e293b'; // Default to dark text
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Calculate luminance
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        // Return dark for light backgrounds, light for dark backgrounds
        return (yiq >= 128) ? '#1e293b' : '#f8fafc'; // slate-800 or slate-50
    };

    // --- UI UPDATE FUNCTIONS ---
    const applyTheme = (theme) => {
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        document.querySelectorAll('#theme-icon-moon-email, #theme-icon-moon-main').forEach(el => theme === 'dark' ? el.classList.add('hidden') : el.classList.remove('hidden'));
        document.querySelectorAll('#theme-icon-sun-email, #theme-icon-sun-main').forEach(el => theme === 'dark' ? el.classList.remove('hidden') : el.classList.add('hidden'));
    };

    const updateDashboard = () => {
        if (!studentData) return;
        mainAppElements.studentName.textContent = studentData.name;
        
        // Progress Bar
        const { totalCrystalsGrown } = studentData;
        mainAppElements.totalCrystalsGrown.textContent = `${totalCrystalsGrown} Tinh thể đã nuôi`;
        const currentMilestoneIndex = MILESTONES.findIndex(m => totalCrystalsGrown < m);
        const prevMilestone = currentMilestoneIndex > 0 ? MILESTONES[currentMilestoneIndex - 1] : 0;
        const nextMilestone = currentMilestoneIndex !== -1 ? MILESTONES[currentMilestoneIndex] : MILESTONES[MILESTONES.length - 1];
        let progressPercentage = 0;
        if (totalCrystalsGrown >= nextMilestone && nextMilestone === MILESTONES[MILESTONES.length - 1]) {
            progressPercentage = 100;
        } else if (nextMilestone > prevMilestone) {
            progressPercentage = ((totalCrystalsGrown - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
        }
        mainAppElements.progressBarFill.style.width = `${progressPercentage}%`;
        mainAppElements.nextMilestone.textContent = `${nextMilestone} tinh thể`;

        // Daily Reward
        const { dailyReward } = studentData;
        const goalMet = dailyReward.sessionsToday >= 1;
        mainAppElements.claimRewardButton.classList.toggle('hidden', !goalMet || dailyReward.claimed);
        mainAppElements.dailyRewardIcon.textContent = goalMet && !dailyReward.claimed ? '🏆' : '🎁';
        mainAppElements.dailyRewardText.textContent = goalMet 
            ? (dailyReward.claimed ? "Bạn đã nhận phần thưởng hôm nay!" : "Bạn đã nhận được phần thưởng!") 
            : `Nuôi 1 tinh thể hôm nay để mở khóa!`;
    };
    
    const updateGrowthVisual = (progress, visualKey, withered = false) => {
        const elements = growthVisualElements[visualKey];
        if (!elements || !elements.mainShard) return;

        const mainShardScale = Math.min(1, progress * 2);
        const sideShardsScale = Math.max(0, Math.min(1, (progress - 0.4) * 2.5));
        const baseOpacity = progress > 0.1 ? 1 : 0;
        const glowOpacity = progress >= 1 ? 0.7 : 0;

        elements.base.style.opacity = baseOpacity;
        elements.mainShard.style.transform = `scaleY(${mainShardScale})`;
        elements.leftShard.style.transform = `scale(${sideShardsScale})`;
        elements.rightShard.style.transform = `scale(${sideShardsScale})`;
        elements.glow.style.opacity = glowOpacity;

        const mainFill = withered ? `url(#grad-withered-${visualKey})` : `url(#grad-main-${visualKey})`;
        const sideFill = withered ? `url(#grad-withered-${visualKey})` : `url(#grad-side-${visualKey})`;
        
        elements.mainShard.querySelector('polygon').setAttribute('fill', mainFill);
        elements.leftShard.querySelector('polygon').setAttribute('fill', sideFill);
        elements.rightShard.querySelector('polygon').setAttribute('fill', sideFill);

        if (withered) {
            elements.base.style.opacity = 1;
            elements.base.querySelector('path').setAttribute('stroke', '#6b7280');
            elements.glow.style.opacity = 0;
        } else {
             elements.base.querySelector('path').setAttribute('stroke', '#a78bfa');
        }
    };

    const updateTimerDisplay = (timeLeft) => {
        const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
        const seconds = String(timeLeft % 60).padStart(2, '0');
        sessionElements.timerDisplay.innerHTML = `<span>${hours}</span><span class="animate-pulse relative -top-2 md:-top-3 mx-1">:</span><span>${minutes}</span><span class="animate-pulse relative -top-2 md:-top-3 mx-1">:</span><span>${seconds}</span>`;
    };

    const resetSessionView = () => {
        sessionElements.subheader.textContent = 'Hãy ở lại đây. Tinh thể của bạn đang phát triển bên trong.';
        sessionElements.timerContainer.classList.remove('hidden');
        sessionElements.successMessageContainer.classList.add('hidden');
        sessionElements.endEarlyButton.classList.remove('hidden');
        sessionElements.postSessionControls.classList.add('hidden');
        sessionElements.startBreakButton.classList.remove('hidden'); // Ensure break button is visible for next time
        sessionElements.crystalContainer.classList.remove('hidden');
        sessionElements.aiCoachContainer.classList.add('hidden');
        configurator.letterInput.value = '';
        configurator.letterInput.style.backgroundColor = '';
        configurator.letterInput.style.color = '';
        configurator.letterColorPicker.value = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
    };
    
    // --- CORE LOGIC ---
    const getAICoachMessage = async (letterContent) => {
        if (!letterContent) return;

        sessionElements.aiCoachContainer.classList.remove('hidden');
        sessionElements.aiCoachMessage.innerHTML = `<span class="opacity-70 animate-pulse">Coach AI đang nghĩ...</span>`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `You are an encouraging and wise study coach. A student has just completed a focus session after writing the following commitment. Based on their commitment, write a short, positive, and motivating message for them in Vietnamese. Keep it concise (2-3 sentences). Do not surround your response with markdown. Student's commitment: "${letterContent}"`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const text = response.text;
            
            if (text) {
                // As requested, ensure any "generated by" phrases are removed.
                const cleanedText = text.replace(/generated by .* ai/gi, '').trim();
                sessionElements.aiCoachMessage.textContent = cleanedText;
            } else {
                throw new Error("Empty response from AI.");
            }
        } catch (error) {
            console.error("AI Coach Error:", error);
            sessionElements.aiCoachMessage.textContent = "Làm tốt lắm! Mỗi bước nhỏ bạn đi hôm nay sẽ tạo nên thành công lớn cho ngày mai. Hãy tự hào về nỗ lực của mình!";
        }
    };

    const startAlarm = () => {
        body.classList.add('shake');
        document.title = "🚨 BÁO ĐỘNG! QUAY LẠI TẬP TRUNG! 🚨";
    };

    const stopAlarm = () => {
        body.classList.remove('shake');
        document.title = "FocusFence";
    };

    const cleanupSession = () => {
        stopAlarm();
        clearInterval(timerInterval);
        timerInterval = null;
        isSessionActive = false;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };

    const handleSessionComplete = () => {
        cleanupSession();
        
        studentData.totalCrystalsGrown += 1;
        studentData.totalFocusTime += sessionConfig.duration;
        studentData.dailyReward.sessionsToday += 1;

        // Save the letter only upon successful completion
        if (sessionConfig.letter && sessionConfig.letter.content) {
            studentData.letters.push({
                date: new Date().toISOString(),
                content: sessionConfig.letter.content,
                duration: sessionConfig.originalDurationMinutes,
                color: sessionConfig.letter.color,
            });
        }
        
        saveStudentData();
        
        updateDashboard();

        // Update UI to success state
        sessionElements.header.textContent = 'Hộp Thời Gian đã mở khóa!';
        sessionElements.subheader.textContent = 'Bạn đã hoàn thành cam kết của mình. Làm tốt lắm!';
        sessionElements.timerContainer.classList.add('hidden');
        sessionElements.successMessageContainer.classList.remove('hidden');
        sessionElements.endEarlyButton.classList.add('hidden');
        sessionElements.postSessionControls.classList.remove('hidden');
        
        // New call to the AI Coach
        if (sessionConfig.letter && sessionConfig.letter.content) {
            getAICoachMessage(sessionConfig.letter.content);
        }
    };
    
    const handleBreakComplete = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isBreakActive = false;
        if (sessionConfig) {
            delete sessionConfig.breakEndTime;
        }

        // Update UI after break
        sessionElements.timerContainer.classList.add('hidden');
        sessionElements.header.textContent = 'Hết giờ nghỉ!';
        sessionElements.subheader.textContent = 'Sẵn sàng cho thử thách tiếp theo chưa?';
        
        sessionElements.postSessionControls.classList.remove('hidden');
        sessionElements.startBreakButton.classList.add('hidden');

        // Reset timer colors
        sessionElements.timerDisplay.classList.add('text-purple-500', 'dark:text-purple-400');
        sessionElements.timerDisplay.classList.remove('text-green-500', 'dark:text-green-400');
        sessionElements.timerProgressBar.classList.add('from-blue-400', 'via-purple-500', 'to-green-400');
        sessionElements.timerProgressBar.classList.remove('bg-green-500');
    };

    const startFocusSession = (durationMinutes) => {
        const letterContent = configurator.letterInput.value.trim();
        const letterColor = configurator.letterColorPicker.value;

        sessionConfig = { 
            duration: durationMinutes * 60,
            endTime: Date.now() + (durationMinutes * 60 * 1000),
            originalDurationMinutes: durationMinutes,
            letter: {
                content: letterContent,
                color: letterColor
            }
        };
        isSessionActive = true;
        
        resetSessionView();
        views.configurator.classList.add('hidden');
        views.session.classList.remove('hidden');

        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Could not enter fullscreen: ${err.message}`);
        });

        updateFocusTimer(); // Initial call
        timerInterval = setInterval(updateFocusTimer, 1000);
    };

    const startBreakSession = () => {
        isBreakActive = true;
        sessionConfig.breakEndTime = Date.now() + (breakDurationSeconds * 1000);

        // Update UI for break
        sessionElements.postSessionControls.classList.add('hidden');
        sessionElements.crystalContainer.classList.add('hidden');
        sessionElements.successMessageContainer.classList.remove('hidden');
        sessionElements.timerContainer.classList.remove('hidden');
        
        sessionElements.header.textContent = 'Giờ giải lao';
        sessionElements.subheader.textContent = 'Thư giãn và nạp lại năng lượng nhé!';
        sessionElements.timerDisplay.classList.remove('text-purple-500', 'dark:text-purple-400');
        sessionElements.timerDisplay.classList.add('text-green-500', 'dark:text-green-400');
        sessionElements.timerProgressBar.classList.remove('from-blue-400', 'via-purple-500', 'to-green-400');
        sessionElements.timerProgressBar.classList.add('bg-green-500');

        updateBreakTimer(); // Initial call
        timerInterval = setInterval(updateBreakTimer, 1000);
    };

    const showDailyReminder = () => {
        if (!studentData || !studentData.wantsReminders || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const todayStr = getVietnamDateString();
        if (studentData.lastNotificationDate === todayStr) {
            return; // Already shown today
        }
        
        const now = new Date();
        const vietnamHour = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(now);
        const hour = parseInt(vietnamHour, 10);

        if (hour >= 8 && hour < 18) {
            const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
            const title = `Chào buổi sáng, ${studentData.name}!`;
            const body = MOTIVATIONAL_MESSAGES[randomIndex];
            
            new Notification(title, { body });

            studentData.lastNotificationDate = todayStr;
            saveStudentData();
        }
    };

    const renderWeeklyReview = () => {
        weeklyReviewElements.totalCrystals.textContent = studentData.totalCrystalsGrown;
        const totalMinutes = Math.round(studentData.totalFocusTime / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        weeklyReviewElements.totalTime.textContent = `${hours} giờ ${minutes} phút`;

        weeklyReviewElements.lettersContainer.innerHTML = '';
        if (studentData.letters.length === 0) {
             weeklyReviewElements.lettersContainer.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-center py-8">Bạn chưa viết lá thư nào. Hãy bắt đầu một phiên học để gửi gắm cam kết đầu tiên!</p>`;
             return;
        }

        [...studentData.letters].reverse().forEach(letter => {
            const letterEl = document.createElement('div');
            letterEl.className = 'p-4 rounded-lg';
            
            const date = new Date(letter.date);
            const formattedDate = new Intl.DateTimeFormat('vi-VN', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: 'Asia/Ho_Chi_Minh'
            }).format(date);

            const letterBgColor = letter.color || (document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9');
            const mainTextColor = getContrastColor(letterBgColor);
            const metaTextColor = mainTextColor === '#1e293b' ? '#64748b' : '#94a3b8'; // slate-500 or slate-400
            
            letterEl.style.backgroundColor = letterBgColor;

            letterEl.innerHTML = `
                <p class="text-xs mb-2 font-semibold" style="color: ${metaTextColor};">${formattedDate} - ${letter.duration} phút</p>
                <p class="whitespace-pre-wrap" style="color: ${mainTextColor};">${letter.content}</p>
            `;
            weeklyReviewElements.lettersContainer.appendChild(letterEl);
        });
    };

    // --- EVENT HANDLERS ---
    const onVisibilityChange = () => {
        if (document.hidden) {
            if (isSessionActive) startAlarm();
        } else {
            stopAlarm();
            if (isSessionActive) {
                updateFocusTimer();
            } else if (isBreakActive) {
                updateBreakTimer();
            }
        }
    };

    const onFullscreenChange = () => {
        if (!document.fullscreenElement && isSessionActive) startAlarm();
    };

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        const name = emailCaptureForm.nameInput.value.trim();
        const email = emailCaptureForm.emailInput.value.trim();
        const wantsReminders = emailCaptureForm.remindersCheckbox.checked;
        
        if (!name) {
            emailCaptureForm.error.textContent = 'Vui lòng nhập tên của bạn.';
            emailCaptureForm.error.classList.remove('hidden');
            return;
        }
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            emailCaptureForm.error.textContent = 'Vui lòng nhập một địa chỉ email hợp lệ.';
            emailCaptureForm.error.classList.remove('hidden');
            return;
        }
        
        emailCaptureForm.error.classList.add('hidden');
        
        studentData = {
            name, email,
            wantsReminders,
            lastNotificationDate: null,
            lastSeen: new Date().getTime(),
            totalCrystalsGrown: 0,
            totalFocusTime: 0, // seconds
            letters: [],
            dailyReward: { date: getVietnamDateString(), sessionsToday: 0, claimed: false }
        };
        saveStudentData();

        if (wantsReminders && 'Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                }
            });
        }
        
        initializeApp();
    };

    const handleConfigSubmit = (e) => {
        e.preventDefault();
        const mode = document.querySelector('#manual-mode-btn.bg-white') ? 'manual' : 'scheduled';
        if (mode === 'manual') {
            const duration = parseInt(configurator.durationInput.value, 10);
            if (!duration || duration < 1) {
                alert('Vui lòng nhập thời gian hợp lệ, ít nhất 1 phút.');
                return;
            }
            startFocusSession(duration);
        } else {
            const days = Array.from(configurator.daysContainer.querySelectorAll('input:checked')).map(input => input.dataset.day);
            const scheduleData = {
                mode: 'scheduled',
                startTime: configurator.startTimeInput.value,
                endTime: configurator.endTimeInput.value,
                days: days,
            };
            studentData.schedule = scheduleData;
            saveStudentData();
            alert('Lịch học của bạn đã được lưu!');
            startScheduleChecker();
        }
    };

    const handleEarlyEndSession = () => {
        const progress = (sessionConfig.duration - sessionConfig.timeLeft) / sessionConfig.duration;
        updateGrowthVisual(progress, 'withered', true);
        cleanupSession();
        showScreen('earlyExit');
        startAlarm();
        setTimeout(() => {
            stopAlarm();
            showScreen('mainApp');
            views.configurator.classList.remove('hidden');
            views.session.classList.add('hidden');
            sessionConfig = null;
        }, 5000); // 5 seconds
    };

    // --- SCHEDULED MODE ---
    const startScheduleChecker = () => {
        if (scheduleCheckInterval) clearInterval(scheduleCheckInterval);
        if (!studentData?.schedule || studentData.schedule.mode !== 'scheduled') return;
        
        scheduleCheckInterval = setInterval(() => {
            if (isSessionActive) return;

            const { schedule } = studentData;
            const now = new Date();
            const vietnamTimeOpts = { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false };
            const formatter = new Intl.DateTimeFormat('en-US', vietnamTimeOpts);
            const parts = formatter.formatToParts(now);
            const currentDay = parts.find(p => p.type === 'weekday')?.value;
            const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
            const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
            const currentTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            if (schedule.days.includes(currentDay) && currentTime >= schedule.startTime && currentTime < schedule.endTime) {
                const [endHours, endMinutes] = schedule.endTime.split(':').map(Number);
                const duration = (endHours * 60 + endMinutes) - (hour * 60 + minute);
                if (duration > 0) startFocusSession(duration);
            }
        }, 60000);
    };

    // --- INITIALIZATION ---
    const initializeApp = () => {
        // Load data
        const storedData = localStorage.getItem('studentData');
        if (storedData) {
            studentData = JSON.parse(storedData);
            // --- Data Migration for returning users ---
            if (studentData.totalTreesPlanted !== undefined) {
                studentData.totalCrystalsGrown = studentData.totalTreesPlanted;
                delete studentData.totalTreesPlanted;
            }
            if (studentData.totalFocusTime === undefined) studentData.totalFocusTime = 0;
            if (studentData.letters === undefined) studentData.letters = [];
            if (studentData.letters.length > 0 && typeof studentData.letters[0] === 'string') {
                 studentData.letters = studentData.letters.map(l => ({ content: l, date: new Date().toISOString(), duration: 25, color: '#ffffff' }));
            }
            saveStudentData();
            // --- End Migration ---
        } else {
            showScreen('emailCapture');
            return;
        }

        showScreen('mainApp');
        showDailyReminder();

        // Daily Reward Logic
        const todayStr = getVietnamDateString();
        if (!studentData.dailyReward || studentData.dailyReward.date !== todayStr) {
            studentData.dailyReward = { date: todayStr, sessionsToday: 0, claimed: false };
        }
        
        // Welcome back alert
        const now = new Date();
        const vietnamTimeOpts = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric' };
        const formatter = new Intl.DateTimeFormat('en-CA', vietnamTimeOpts);
        const parts = formatter.formatToParts(now);
        const year = parseInt(parts.find(p => p.type === 'year')?.value ?? '0');
        const month = parseInt(parts.find(p => p.type === 'month')?.value ?? '1') - 1;
        const day = parseInt(parts.find(p => p.type === 'day')?.value ?? '1');
        const startOfTodayVietnam = Date.UTC(year, month, day) - (7 * 60 * 60 * 1000);
        const startOfYesterdayVietnam = startOfTodayVietnam - (24 * 60 * 60 * 1000);
        if (studentData.lastSeen < startOfYesterdayVietnam) {
            setTimeout(() => {
                alert(`Chào mừng quay trở lại, ${studentData.name}! Chúng tôi đã nhớ bạn ngày hôm qua. Cùng quay lại học nào!`);
            }, 100);
        }
        studentData.lastSeen = now.getTime();
        saveStudentData();

        // Render UI
        updateDashboard();
        startScheduleChecker();
    };

    // --- SETUP EVENT LISTENERS ---
    themeToggles.forEach(btn => btn.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
    }));

    emailCaptureForm.form.addEventListener('submit', handleProfileSubmit);

    configurator.form.addEventListener('submit', handleConfigSubmit);
    configurator.manualModeBtn.addEventListener('click', () => {
        configurator.manualModeBtn.className = 'w-1/2 rounded-md py-2 text-sm font-medium transition-colors bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow';
        configurator.scheduledModeBtn.className = 'w-1/2 rounded-md py-2 text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50';
        configurator.manualPanel.classList.remove('hidden');
        configurator.scheduledPanel.classList.add('hidden');
        configurator.submitBtnText.textContent = 'Khóa Hộp & Bắt đầu';
    });
    configurator.scheduledModeBtn.addEventListener('click', () => {
        configurator.manualModeBtn.className = 'w-1/2 rounded-md py-2 text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50';
        configurator.scheduledModeBtn.className = 'w-1/2 rounded-md py-2 text-sm font-medium transition-colors bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow';
        configurator.manualPanel.classList.add('hidden');
        configurator.scheduledPanel.classList.remove('hidden');
        configurator.submitBtnText.textContent = 'Lưu lịch trình';
    });
    configurator.durationInput.addEventListener('input', () => {
        const duration = parseInt(configurator.durationInput.value, 10) || 0;
        updateGrowthVisual(Math.min(1, duration / 120), 'config');
    });

    configurator.letterColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        configurator.letterInput.style.backgroundColor = color;
        configurator.letterInput.style.color = getContrastColor(color);
    });

    sessionElements.endEarlyButton.addEventListener('click', handleEarlyEndSession);
    sessionElements.newCrystalButton.addEventListener('click', () => {
        sessionConfig = null;
        views.session.classList.add('hidden');
        views.configurator.classList.remove('hidden');
        sessionElements.postSessionControls.classList.add('hidden');
    });
    sessionElements.startBreakButton.addEventListener('click', startBreakSession);
    
    mainAppElements.claimRewardButton.addEventListener('click', () => {
        if (!studentData || !studentData.dailyReward) return;
        studentData.dailyReward.claimed = true;
        saveStudentData();
        updateDashboard();
        alert("Đã nhận phần thưởng! Hãy tiếp tục phát huy!");
    });
    
    mainAppElements.showReviewBtn.addEventListener('click', () => {
        renderWeeklyReview();
        showScreen('weeklyReview');
    });
    weeklyReviewElements.closeBtn.addEventListener('click', () => {
        showScreen('mainApp');
    });

    // Day toggles for schedule
    DAYS_OF_WEEK.forEach(day => {
        const defaultChecked = ['T2', 'T3', 'T4', 'T5', 'T6'].includes(day);
        const label = document.createElement('label');
        label.className = `flex items-center justify-center px-3 py-1.5 rounded-full border-2 cursor-pointer text-sm font-medium transition-all ${defaultChecked ? 'bg-purple-100/50 dark:bg-purple-900/30 border-purple-500 text-purple-800 dark:text-purple-300' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`;
        label.innerHTML = `
            <input type="checkbox" data-day="${day}" ${defaultChecked ? 'checked' : ''} class="sr-only" />
            ${day}
        `;
        label.querySelector('input').addEventListener('change', (e) => {
            label.className = `flex items-center justify-center px-3 py-1.5 rounded-full border-2 cursor-pointer text-sm font-medium transition-all ${e.target.checked ? 'bg-purple-100/50 dark:bg-purple-900/30 border-purple-500 text-purple-800 dark:text-purple-300' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`;
        });
        configurator.daysContainer.appendChild(label);
    });

    // Listen for session activity to add/remove distraction listeners
    const observer = new MutationObserver(() => {
        const sessionIsRunning = isSessionActive || isBreakActive;
        // Using a single visibility change listener now for everything
        if (views.session.classList.contains('hidden')) {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            document.removeEventListener("fullscreenchange", onFullscreenChange);
        } else {
            document.addEventListener("visibilitychange", onVisibilityChange);
            document.addEventListener("fullscreenchange", onFullscreenChange);
        }
    });
    observer.observe(views.session, { attributes: true, attributeFilter: ['class'] });

    // --- Final Initialization Call ---
    applyTheme(localStorage.getItem('theme') || 'light');
    updateGrowthVisual(25 / 120, 'config'); // Initial crystal preview
    initializeApp();
});