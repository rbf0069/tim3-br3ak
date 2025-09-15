// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, collection, query, where, getDocs, onSnapshot, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- LÓGICA DE CONTRASEÑA ---
const APP_PASSWORD = "speed";
const passwordScreen = document.getElementById('password-protection-screen');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const passwordSubmit = document.getElementById('password-submit');
const passwordError = document.getElementById('password-error');

function checkPasswordAndInit() {
    if (sessionStorage.getItem('isUnlocked') === 'true') {
        passwordScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        mainApp();
    }
}

passwordSubmit.addEventListener('click', () => {
    if (passwordInput.value === APP_PASSWORD) {
        sessionStorage.setItem('isUnlocked', 'true');
        checkPasswordAndInit();
    } else {
        passwordError.textContent = 'Contraseña incorrecta.';
        passwordInput.value = '';
    }
});

passwordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') passwordSubmit.click();
    passwordError.textContent = '';
});


// --- FUNCIÓN PRINCIPAL DE LA APP ---
function mainApp() {
    if (window.appInitialized) return;
    window.appInitialized = true;

    const elements = {
        mainScreen: document.getElementById('main-screen'),
        gameScreen: document.getElementById('game-screen'),
        howToPlayScreen: document.getElementById('how-to-play-screen'),
        rankingScreen: document.getElementById('ranking-screen'),
        settingsScreen: document.getElementById('settings-screen'),
        aboutScreen: document.getElementById('about-screen'),
        profileScreen: document.getElementById('profile-screen'),
        friendsScreen: document.getElementById('friends-screen'),
        playButton: document.getElementById('play-button'),
        howToPlayButton: document.getElementById('how-to-play-button'),
        rankingButton: document.getElementById('ranking-button'),
        settingsButton: document.getElementById('settings-button'),
        aboutButton: document.getElementById('about-button'),
        editProfileButton: document.getElementById('edit-profile-button'),
        friendsButton: document.getElementById('friends-button'),
        backToMainButtons: document.querySelectorAll('[id^="back-to-main-"]'),
        backToSettingsFromProfileButton: document.getElementById('back-to-settings-from-profile-button'),
        exitButton: document.getElementById('exit-button'),
        chronometerDisplay: document.getElementById('chronometer'),
        attemptsIndicator: document.getElementById('attempts-indicator'),
        actionButton: document.getElementById('action-button'),
        dateDisplay: document.getElementById('date-display'),
        scoreFeedback: document.getElementById('score-feedback'),
        bestScoreDisplay: document.getElementById('best-score-display'),
        rankingList: document.getElementById('ranking-list'),
        profileDisplay: document.getElementById('profile-display'),
        resetDataButton: document.getElementById('reset-data-button'),
        soundCheckbox: document.getElementById('sound-checkbox'),
        soundCheckmark: document.getElementById('sound-checkmark'),
        vibrationCheckbox: document.getElementById('vibration-checkbox'),
        vibrationCheckmark: document.getElementById('vibration-checkmark'),
        showScoreCheckbox: document.getElementById('show-score-checkbox'),
        showScoreCheckmark: document.getElementById('show-score-checkmark'),
        nicknameInput: document.getElementById('nickname-input'),
        nicknameFeedback: document.getElementById('nickname-feedback'),
        currentAvatarDisplay: document.getElementById('current-avatar-display'),
        avatarGallery: document.getElementById('avatar-gallery'),
        saveProfileButton: document.getElementById('save-profile-button'),
        friendsTabList: document.getElementById('friends-tab-list'),
        friendsTabRequests: document.getElementById('friends-tab-requests'),
        friendsListContainer: document.getElementById('friends-list-container'),
        requestsListContainer: document.getElementById('requests-list-container'),
        addFriendInput: document.getElementById('add-friend-input'),
        searchResultsContainer: document.getElementById('search-results-container'),
        exitPopup: document.getElementById('exit-popup'),
        confirmExitButton: document.getElementById('confirm-exit-button'),
        cancelExitButton: document.getElementById('cancel-exit-button'),
        endGamePopup: document.getElementById('end-game-popup'),
        finalScoreDisplay: document.getElementById('final-score'),
        playAgainButton: document.getElementById('play-again-button'),
        mainMenuButton: document.getElementById('main-menu-button'),
        resetDataPopup: document.getElementById('reset-data-popup'),
        confirmResetButton: document.getElementById('confirm-reset-button'),
        cancelResetButton: document.getElementById('cancel-reset-button'),
        currentScoreDisplay: document.getElementById('current-score-display'),
        currentScoreContainer: document.getElementById('current-score-container'),
    };

    let app, db, auth;
    let userId = null;
    let isAuthReady = false;
    let userProfile = { nickname: '', avatar: 'avatar-circle' };
    let gameState = 'ready',
        attemptsLeft = 10,
        score = 0,
        bestScoreToday = 0;
    let intervalId = null,
        startTime = 0,
        elapsedTime = 0,
        timeWhenStopped = 0;
    const GAME_DURATION_LIMIT = 10000,
        HARD_STOP_LIMIT = 15000;
    let hardStopTimer = null;
    let settings = { sound: true, vibration: true, showScore: true };
    let selectedAvatar = 'avatar-circle';
    const AVATAR_IDS = ['avatar-circle', 'avatar-square', 'avatar-triangle', 'avatar-star', 'avatar-heart', 'avatar-zap', 'avatar-shield', 'avatar-ghost', 'avatar-diamond', 'avatar-anchor', 'avatar-aperture', 'avatar-cloud', 'avatar-crown', 'avatar-moon', 'avatar-sun', 'avatar-key'];

    // --- FUNCIÓN DE FIREBASE ---
    async function initializeFirebase() {
        try {
            const firebaseConfig = {
              apiKey: "AIzaSyDSm5KfMJEQj8jVB0CfqvkyABH-rNNKgc4",
              authDomain: "tim3-br3ak.firebaseapp.com",
              projectId: "tim3-br3ak",
              storageBucket: "tim3-br3ak.appspot.com",
              messagingSenderId: "1029726018714",
              appId: "1:1029726018714:web:16ed60f60bdf57ebe2d323",
              measurementId: "G-VGSD8GC449"
            };

            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    await loadUserData();
                    updateProfileDisplay();
                    listenToFriendRequests();
                }
                isAuthReady = true;
            });
            
            await signInAnonymously(auth);

        } catch (error) {
            console.error("Firebase initialization failed:", error);
        }
    }
    
    // --- DEFINICIONES DE FUNCIONES DE LA APP ---

    function showScreen(screenToShow) {
        const screens = [elements.mainScreen, elements.gameScreen, elements.howToPlayScreen, elements.rankingScreen, elements.settingsScreen, elements.aboutScreen, elements.profileScreen, elements.friendsScreen];
        screens.forEach(screen => {
            if(screen) screen.classList.add('hidden')
        });
        if(screenToShow) screenToShow.classList.remove('hidden');
    }

    function initializeAppUI() {
        showScreen(elements.mainScreen);
        const now = new Date();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        elements.dateDisplay.textContent = `${days[now.getDay()]}, ${now.getDate()}`;
    }
    
    function resetGame() {
        gameState = 'ready';
        attemptsLeft = 10;
        score = 0;
        elapsedTime = 0;
        timeWhenStopped = 0;
        if (intervalId) clearInterval(intervalId);
        if (hardStopTimer) clearTimeout(hardStopTimer);
        updateChronometerDisplay();
        setupAttemptsIndicator();
        elements.currentScoreDisplay.textContent = 0;
        elements.actionButton.textContent = '¡GO!';
        elements.actionButton.className = "action-button w-1/2 h-20 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
        if(settings.showScore) {
            elements.currentScoreContainer.classList.remove('hidden');
        } else {
            elements.currentScoreContainer.classList.add('hidden');
        }
    }

    function startGameFlow() {
        resetGame();
        showScreen(elements.gameScreen);
    }
    
    function handleActionClick() {
        if (gameState === 'ready') {
            gameState = 'running';
            startTime = Date.now();
            intervalId = setInterval(updateChronometer, 10);
            elements.actionButton.textContent = 'STOP';
            elements.actionButton.className = "action-button w-1/2 h-20 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
            const dots = elements.attemptsIndicator.children;
            for (let i = 0; i < dots.length; i++) {
                dots[i].classList.replace('bg-gray-600', 'bg-green-500');
            }
        } else if (gameState === 'running') {
            clearInterval(intervalId);
            timeWhenStopped = elapsedTime;
            gameState = 'stopped';
            attemptsLeft--;
            updateAttemptsIndicator();
            calculateScore();
            if (attemptsLeft <= 0) {
                endGame('no_attempts');
                return;
            }
            elements.actionButton.textContent = 'PLAY';
            elements.actionButton.className = "action-button w-1/2 h-20 bg-sky-500 hover:bg-sky-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
            hardStopTimer = setTimeout(() => endGame('hard_stop_timeout'), HARD_STOP_LIMIT);
        } else if (gameState === 'stopped') {
            clearTimeout(hardStopTimer);
            gameState = 'running';
            startTime = Date.now();
            intervalId = setInterval(updateChronometer, 10);
            elements.actionButton.textContent = 'STOP';
            elements.actionButton.className = "action-button w-1/2 h-20 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
        }
    }

    // ... (Aquí irían el resto de funciones completas como getAvatarSvg, loadUserData, saveProfile, etc.)
    // Para no hacer el código excesivamente largo, solo pego las que faltaban, el resto ya estaban en tu script.
    
    function setupAttemptsIndicator() {
        elements.attemptsIndicator.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const dot = document.createElement('div');
            dot.className = 'w-5 h-5 bg-gray-600 rounded-full transition-colors';
            elements.attemptsIndicator.appendChild(dot);
        }
    }

    function updateAttemptsIndicator() {
        const dots = elements.attemptsIndicator.children;
        const usedAttempts = 10 - attemptsLeft;
        for (let i = 0; i < 10; i++) {
            dots[i].className = 'w-5 h-5 rounded-full transition-colors';
            if (i < usedAttempts) dots[i].classList.add('bg-red-500');
            else dots[i].classList.add('bg-green-500');
        }
    }

    function updateChronometer() {
        elapsedTime = Date.now() - startTime + timeWhenStopped;
        if (elapsedTime >= GAME_DURATION_LIMIT) {
            elapsedTime = GAME_DURATION_LIMIT;
            updateChronometerDisplay();
            endGame('time_limit');
            return;
        }
        updateChronometerDisplay();
    }

    function updateChronometerDisplay() {
        const seconds = Math.floor(elapsedTime / 1000);
        const milliseconds = Math.floor((elapsedTime % 1000) / 10);
        elements.chronometerDisplay.innerHTML = `${String(seconds).padStart(2, '0')}<span class="text-5xl sm:text-6xl text-gray-400">.${String(milliseconds).padStart(2, '0')}</span>`;
    }

    function showScoreFeedback(text) {
        if (!text) return;
        if (settings.vibration && navigator.vibrate) navigator.vibrate(100);
        elements.scoreFeedback.textContent = text;
        elements.scoreFeedback.classList.add('show');
        setTimeout(() => elements.scoreFeedback.classList.remove('show'), 800);
    }

    function calculateScore() {
        const seconds = Math.floor(elapsedTime / 1000);
        const decimals = Math.floor((elapsedTime % 1000) / 10);
        let pointsThisTurn = 0,
            feedbackText = '';
        const decStr = String(decimals).padStart(2, '0');
        const lastSecondDigit = String(seconds % 10);
        const isCapicua = decStr[0] === decStr[1];
        const isDecena = decStr[1] === '0';
        const secondMatchesDecimal = lastSecondDigit === decStr[0];

        if (seconds > 0 && isCapicua && secondMatchesDecimal) {
            pointsThisTurn = 5;
            feedbackText = '¡HIT! +5';
        } else if (seconds > 0 && isDecena && secondMatchesDecimal) {
            pointsThisTurn = 3;
            feedbackText = '+3';
        } else if (isCapicua) {
            pointsThisTurn = 2;
            feedbackText = '+2';
        } else if (isDecena) {
            pointsThisTurn = 1;
            feedbackText = '+1';
        }
        score += pointsThisTurn;
        elements.currentScoreDisplay.textContent = score;
        if (pointsThisTurn > 0) showScoreFeedback(feedbackText);
    }
    
    async function endGame(reason) {
        if (gameState === 'finished') return;
        gameState = 'finished';
        clearInterval(intervalId);
        clearTimeout(hardStopTimer);
        elements.finalScoreDisplay.textContent = score;
        if (score > bestScoreToday) {
            bestScoreToday = score;
            elements.bestScoreDisplay.textContent = bestScoreToday;
            await saveBestScore();
        }
        await saveRanking(score);
        elements.endGamePopup.classList.remove('hidden');
    }
    
    async function loadUserData() { /* ... Tu función existente ... */ }
    async function saveProfile() { /* ... Tu función existente ... */ }
    async function saveBestScore() { /* ... Tu función existente ... */ }
    async function saveRanking(newScore) { /* ... Tu función existente ... */ }
    async function resetAllData() { /* ... Tu función existente ... */ }
    async function saveSettings() { /* ... Tu función existente ... */ }
    function getAvatarSvg(avatarId) { /* ... Tu función existente ... */ }
    function updateProfileDisplay() { /* ... Tu función existente ... */ }
    function updateProfileUI() { /* ... Tu función existente ... */ }
    async function displayRanking() { /* ... Tu función existente ... */ }
    function updateSettingsUI() { /* ... Tu función existente ... */ }
    function switchFriendsTab(activeTab) { /* ... Tu función existente ... */ }
    async function searchPlayers(searchTerm) { /* ... Tu función existente ... */ }
    async function sendFriendRequest(button) { /* ... Tu función existente ... */ }
    function listenToFriendRequests() { /* ... Tu función existente ... */ }
    async function handleFriendRequest(requestId, status) { /* ... Tu función existente ... */ }


    // --- INICIALIZACIÓN Y EVENT LISTENERS ---
    initializeAppUI();
    initializeFirebase();

    elements.playButton.addEventListener('click', startGameFlow);
    elements.howToPlayButton.addEventListener('click', () => showScreen(elements.howToPlayScreen));
    elements.rankingButton.addEventListener('click', async () => { await displayRanking(); showScreen(elements.rankingScreen); });
    elements.settingsButton.addEventListener('click', () => showScreen(elements.settingsScreen));
    elements.aboutButton.addEventListener('click', () => showScreen(elements.aboutScreen));
    elements.friendsButton.addEventListener('click', () => showScreen(elements.friendsScreen));
    elements.editProfileButton.addEventListener('click', () => { elements.nicknameInput.value = userProfile.nickname; selectedAvatar = userProfile.avatar; updateProfileUI(); showScreen(elements.profileScreen) });
    elements.backToMainButtons.forEach(button => button.addEventListener('click', () => showScreen(elements.mainScreen)));
    elements.backToSettingsFromProfileButton.addEventListener('click', () => showScreen(elements.settingsScreen));

    elements.actionButton.addEventListener('click', handleActionClick);
    elements.exitButton.addEventListener('click', () => { if (gameState === 'running') clearInterval(intervalId); if (gameState === 'stopped') clearTimeout(hardStopTimer); elements.exitPopup.classList.remove('hidden'); });
    elements.cancelExitButton.addEventListener('click', () => { elements.exitPopup.classList.add('hidden'); if (gameState === 'running') { startTime = Date.now(); intervalId = setInterval(updateChronometer, 10); } if (gameState === 'stopped') { hardStopTimer = setTimeout(() => endGame('hard_stop_timeout'), HARD_STOP_LIMIT); } });
    elements.confirmExitButton.addEventListener('click', () => { elements.exitPopup.classList.add('hidden'); showScreen(elements.mainScreen); });
    elements.playAgainButton.addEventListener('click', () => { elements.endGamePopup.classList.add('hidden'); startGameFlow(); });
    elements.mainMenuButton.addEventListener('click', () => { elements.endGamePopup.classList.add('hidden'); showScreen(elements.mainScreen); });
    elements.soundCheckbox.addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); updateSettingsUI(); });
    elements.vibrationCheckbox.addEventListener('click', () => { settings.vibration = !settings.vibration; saveSettings(); updateSettingsUI(); });
    elements.showScoreCheckbox.addEventListener('click', () => { settings.showScore = !settings.showScore; saveSettings(); updateSettingsUI(); });
    elements.resetDataButton.addEventListener('click', () => elements.resetDataPopup.classList.remove('hidden'));
    elements.cancelResetButton.addEventListener('click', () => elements.resetDataPopup.classList.add('hidden'));
    elements.confirmResetButton.addEventListener('click', async () => { await resetAllData(); elements.resetDataPopup.classList.add('hidden'); await displayRanking(); });
    elements.saveProfileButton.addEventListener('click', saveProfile);
    elements.friendsTabList.addEventListener('click', () => switchFriendsTab('list'));
    elements.friendsTabRequests.addEventListener('click', () => switchFriendsTab('requests'));
    elements.addFriendInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') { searchPlayers(e.target.value); } });
    
    AVATAR_IDS.forEach(id => {
        const avatarContainer = document.createElement('div');
        avatarContainer.dataset.avatarId = id;
        avatarContainer.className = 'avatar-container p-2 rounded-lg cursor-pointer hover:bg-gray-700';
        const svg = getAvatarSvg(id);
        if (svg) {
            avatarContainer.appendChild(svg);
        }
        elements.avatarGallery.appendChild(avatarContainer);
        avatarContainer.addEventListener('click', () => {
            selectedAvatar = id;
            updateProfileUI();
        });
    });

} // --- Fin de mainApp() ---


// --- INICIO DE LA APLICACIÓN ---
checkPasswordAndInit();
