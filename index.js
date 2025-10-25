document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let studentData = null;
    let sessionConfig = null;
    let isSessionActive = false;
    let timerInterval = null;
    let scheduleCheckInterval = null;

    const MILESTONES = [1, 5, 10, 25, 50, 100];
    const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // --- DOM ELEMENT SELECTORS ---
    const body = document.body;
    const screens = {
        emailCapture: document.getElementById('email-capture-screen'),
        mainApp: document.getElementById('main-app-screen'),
        earlyExit: document.getElementById('early-exit-screen'),
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
        error: document.getElementById('email-error'),
    };
    const mainAppElements = {
        studentName: document.getElementById('student-name'),
        totalTreesPlanted: document.getElementById('total-trees-planted'),
        progressBarFill: document.getElementById('progress-bar-fill'),
        nextMilestone: document.getElementById('next-milestone'),
        dailyRewardIcon: document.getElementById('daily-reward-icon'),
        dailyRewardText: document.getElementById('daily-reward-text'),
        claimRewardButton: document.getElementById('claim-reward-button'),
    };
    const configurator = {
        form: document.getElementById('config-form'),
        manualModeBtn: document.getElementById('manual-mode-btn'),
        scheduledModeBtn: document.getElementById('scheduled-mode-btn'),
        manualPanel: document.getElementById('manual-config-panel'),
        scheduledPanel: document.getElementById('scheduled-config-panel'),
        durationInput: document.getElementById('duration-input'),
        startTimeInput: document.getElementById('start-time'),
        endTimeInput: document.getElementById('end-time'),
        daysContainer: document.getElementById('days-of-week-container'),
        submitBtnText: document.getElementById('submit-config-text'),
    };
    const sessionElements = {
        header: document.getElementById('session-header'),
        subheader: document.getElementById('session-subheader'),
        timerContainer: document.getElementById('timer-container'),
        commitmentBox: document.getElementById('commitment-box'),
        timerDisplay: document.getElementById('timer-display'),
        timerProgressBar: document.getElementById('timer-progress-bar'),
        endEarlyButton: document.getElementById('end-early-button'),
        newTreeButton: document.getElementById('new-tree-button'),
    };
    const musicPlayer = {
        toggleBtn: document.getElementById('music-toggle-button'),
        panel: document.getElementById('music-panel'),
        playPauseBtn: document.getElementById('play-pause-button'),
        playIcon: document.getElementById('play-icon'),
        pauseIcon: document.getElementById('pause-icon'),
        volumeSlider: document.getElementById('volume-slider'),
        audio: document.getElementById('audio-player'),
    };
    const treeElements = {
        config: {
            svg: document.getElementById('tree-svg-config'),
            trunk: document.getElementById('tree-trunk-config'),
            foliage: document.getElementById('tree-foliage-config')
        },
        session: {
            svg: document.getElementById('tree-svg-session'),
            trunk: document.getElementById('tree-trunk-session'),
            foliage: document.getElementById('tree-foliage-session')
        },
        withered: {
            svg: document.getElementById('tree-svg-withered'),
            trunk: document.getElementById('tree-trunk-withered'),
            foliage: document.getElementById('tree-foliage-withered')
        },
    };

    // --- HELPER FUNCTIONS ---
    const showScreen = (screenName) => {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        if (screens[screenName]) {
            screens[screenName].classList.remove('hidden');
        }
    };

    const getVietnamDateString = () => {
        const vietnamTimeOpts = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric' };
        return new Intl.DateTimeFormat('en-CA', vietnamTimeOpts).format(new Date());
    };

    const saveStudentData = () => {
        try {
            localStorage.setItem('studentData', JSON.stringify(studentData));
        } catch (e) {
            console.error("Failed to save student data to localStorage", e);
        }
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
        updateVolumeSliderBackground(musicPlayer.volumeSlider.value);
    };

    const updateDashboard = () => {
        if (!studentData) return;
        mainAppElements.studentName.textContent = studentData.name;
        
        // Progress Bar
        const { totalTreesPlanted } = studentData;
        mainAppElements.totalTreesPlanted.textContent = `${totalTreesPlanted} Cây đã trồng`;
        const currentMilestoneIndex = MILESTONES.findIndex(m => totalTreesPlanted < m);
        const prevMilestone = currentMilestoneIndex > 0 ? MILESTONES[currentMilestoneIndex - 1] : 0;
        const nextMilestone = currentMilestoneIndex !== -1 ? MILESTONES[currentMilestoneIndex] : MILESTONES[MILESTONES.length - 1];
        let progressPercentage = 0;
        if (totalTreesPlanted >= nextMilestone && nextMilestone === MILESTONES[MILESTONES.length - 1]) {
            progressPercentage = 100;
        } else if (nextMilestone > prevMilestone) {
            progressPercentage = ((totalTreesPlanted - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
        }
        mainAppElements.progressBarFill.style.width = `${progressPercentage}%`;
        mainAppElements.nextMilestone.textContent = `${nextMilestone} cây`;

        // Daily Reward
        const { dailyReward } = studentData;
        const goalMet = dailyReward.sessionsToday >= 1;
        mainAppElements.claimRewardButton.classList.toggle('hidden', !goalMet || dailyReward.claimed);
        mainAppElements.dailyRewardIcon.textContent = goalMet && !dailyReward.claimed ? '🏆' : '🎁';
        mainAppElements.dailyRewardText.textContent = goalMet 
            ? (dailyReward.claimed ? "Bạn đã nhận phần thưởng hôm nay!" : "Bạn đã nhận được phần thưởng!") 
            : `Trồng 1 cây hôm nay để mở khóa!`;
    };

    const updateTree = (progress, treeKey, withered = false) => {
        const elements = treeElements[treeKey];
        if (!elements) return;

        const trunkHeight = 10 + 90 * progress;
        const foliageScale = progress;

        elements.trunk.style.y = 190 - trunkHeight;
        elements.trunk.style.height = trunkHeight;
        elements.foliage.style.transform = `scale(${foliageScale})`;
        elements.foliage.style.opacity = foliageScale > 0.1 ? 1 : 0;

        const color = withered ? '#9ca3af' : '#84cc16';
        const trunkColor = withered ? '#78716c' : '#7c2d12';
        elements.foliage.querySelectorAll('circle').forEach(c => c.setAttribute('fill', color));
        elements.trunk.setAttribute('fill', trunkColor);
        elements.svg.querySelector('path').setAttribute('stroke', trunkColor);
    };

    const updateTimerDisplay = (timeLeft) => {
        const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
        const seconds = String(timeLeft % 60).padStart(2, '0');
        sessionElements.timerDisplay.innerHTML = `<span>${hours}</span><span class="animate-pulse relative -top-2 md:-top-3 mx-1">:</span><span>${minutes}</span><span class="animate-pulse relative -top-2 md:-top-3 mx-1">:</span><span>${seconds}</span>`;
    };

    const resetSessionView = () => {
        sessionElements.header.textContent = 'Phiên học đang diễn ra';
        sessionElements.subheader.textContent = 'Ở lại trang này để cây của bạn phát triển.';
        sessionElements.timerContainer.classList.remove('hidden');
        sessionElements.commitmentBox.classList.remove('hidden');
        sessionElements.endEarlyButton.classList.remove('hidden');
        sessionElements.newTreeButton.classList.add('hidden');
    };
    
    // --- CORE LOGIC ---
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
        
        studentData.totalTreesPlanted += 1;
        studentData.dailyReward.sessionsToday += 1;
        saveStudentData();
        
        updateDashboard();

        // Update UI to success state
        sessionElements.header.textContent = 'Tuyệt vời! Bạn đã trồng được một cây mới.';
        sessionElements.subheader.textContent = 'Hãy tiếp tục duy trì sự tập trung tuyệt vời này.';
        sessionElements.timerContainer.classList.add('hidden');
        sessionElements.commitmentBox.classList.add('hidden');
        sessionElements.endEarlyButton.classList.add('hidden');
        sessionElements.newTreeButton.classList.remove('hidden');
    };

    const startFocusSession = (durationMinutes) => {
        sessionConfig = { duration: durationMinutes * 60 };
        isSessionActive = true;
        
        resetSessionView();
        views.configurator.classList.add('hidden');
        views.session.classList.remove('hidden');
        
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Could not enter fullscreen: ${err.message}`);
        });

        let timeLeft = sessionConfig.duration;
        updateTimerDisplay(timeLeft);
        updateTree(0, 'session');
        sessionElements.timerProgressBar.style.width = '100%';

        timerInterval = setInterval(() => {
            timeLeft -= 1;
            const progress = (sessionConfig.duration - timeLeft) / sessionConfig.duration;
            const progressPercentage = (timeLeft / sessionConfig.duration) * 100;

            updateTimerDisplay(timeLeft);
            updateTree(progress, 'session');
            sessionElements.timerProgressBar.style.width = `${progressPercentage}%`;

            if (timeLeft <= 0) {
                handleSessionComplete();
            }
        }, 1000);
    };

    // --- EVENT HANDLERS ---
    const onVisibilityChange = () => {
        if (document.hidden) startAlarm(); else stopAlarm();
    };

    const onFullscreenChange = () => {
        if (!document.fullscreenElement && isSessionActive) startAlarm();
    };

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        const name = emailCaptureForm.nameInput.value.trim();
        const email = emailCaptureForm.emailInput.value.trim();
        
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
            lastSeen: new Date().getTime(),
            totalTreesPlanted: 0,
            dailyReward: { date: getVietnamDateString(), sessionsToday: 0, claimed: false }
        };
        saveStudentData();
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
        const progress = (sessionConfig.duration - (sessionConfig.duration - (timerInterval ? 1 : 0))) / sessionConfig.duration; // A mock progress
        updateTree(progress, 'withered', true);
        cleanupSession();
        showScreen('earlyExit');
        startAlarm();
        setTimeout(() => {
            stopAlarm();
            showScreen('mainApp');
            sessionConfig = null;
        }, 20000); // 20 seconds
    };
    
    // --- MUSIC PLAYER ---
    const updateVolumeSliderBackground = (volume) => {
        const isDark = document.documentElement.classList.contains('dark');
        const sliderTrackColor = isDark ? '#334155' : '#e2e8f0';
        musicPlayer.volumeSlider.style.background = `linear-gradient(to right, #8b5cf6 ${volume * 100}%, ${sliderTrackColor} ${volume * 100}%)`;
    };

    musicPlayer.toggleBtn.addEventListener('click', () => {
        musicPlayer.panel.classList.toggle('hidden');
    });

    musicPlayer.playPauseBtn.addEventListener('click', () => {
        const isPlaying = !musicPlayer.audio.paused;
        if (isPlaying) {
            musicPlayer.audio.pause();
        } else {
            musicPlayer.audio.play().catch(e => console.error("Audio play failed:", e));
        }
        musicPlayer.playIcon.classList.toggle('hidden', !isPlaying);
        musicPlayer.pauseIcon.classList.toggle('hidden', isPlaying);
    });

    musicPlayer.volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        musicPlayer.audio.volume = volume;
        updateVolumeSliderBackground(volume);
    });


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
        } else {
            showScreen('emailCapture');
            return;
        }

        showScreen('mainApp');

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
        configurator.submitBtnText.textContent = 'Bắt đầu trồng cây';
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
        updateTree(Math.min(1, duration / 120), 'config');
    });

    sessionElements.endEarlyButton.addEventListener('click', handleEarlyEndSession);
    sessionElements.newTreeButton.addEventListener('click', () => {
        sessionConfig = null;
        views.session.classList.add('hidden');
        views.configurator.classList.remove('hidden');
    });
    
    mainAppElements.claimRewardButton.addEventListener('click', () => {
        if (!studentData || !studentData.dailyReward) return;
        studentData.dailyReward.claimed = true;
        saveStudentData();
        updateDashboard();
        alert("Đã nhận phần thưởng! Hãy tiếp tục phát huy!");
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
        if (isSessionActive) {
            document.addEventListener("visibilitychange", onVisibilityChange);
            document.addEventListener("fullscreenchange", onFullscreenChange);
        } else {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            document.removeEventListener("fullscreenchange", onFullscreenChange);
        }
    });
    observer.observe(views.session, { attributes: true, attributeFilter: ['class'] });

    // --- Final Initialization Call ---
    applyTheme(localStorage.getItem('theme') || 'light');
    updateTree(25 / 120, 'config'); // Initial tree preview
    initializeApp();
});