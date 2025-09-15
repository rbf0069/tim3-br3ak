// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, collection, query, where, getDocs, onSnapshot, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- ELEMENTOS DEL DOM ---
const passwordScreen = document.getElementById('password-protection-screen');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const passwordSubmit = document.getElementById('password-submit');
const passwordError = document.getElementById('password-error');
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

// --- VARIABLES DE ESTADO ---
const APP_PASSWORD = "speed";
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

// --- DEFINICIONES DE FUNCIONES ---

function mainApp() {
    if (window.appInitialized) return;
    window.appInitialized = true;

    initializeAppUI();
    initializeFirebase();
    addEventListeners();
}

function checkPasswordAndInit() {
    if (sessionStorage.getItem('isUnlocked') === 'true') {
        passwordScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        mainApp();
    }
}

function showScreen(screenToShow) {
    const screens = [elements.mainScreen, elements.gameScreen, elements.howToPlayScreen, elements.rankingScreen, elements.settingsScreen, elements.aboutScreen, elements.profileScreen, elements.friendsScreen];
    screens.forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });
    if (screenToShow) screenToShow.classList.remove('hidden');
}

function initializeAppUI() {
    showScreen(elements.mainScreen);
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    elements.dateDisplay.textContent = `${days[now.getDay()]}, ${now.getDate()}`;
}

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

async function loadUserData() {
    if (!isAuthReady || !userId) return;
    const userDocRef = doc(db, `users/${userId}`);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const today = new Date().toLocaleDateString();
            bestScoreToday = (data.bestScore && data.bestScore.date === today) ? data.bestScore.score : 0;
            settings = data.settings || { sound: true, vibration: true, showScore: true };
            userProfile = data.profile || { nickname: '', avatar: 'avatar-circle' };
            selectedAvatar = userProfile.avatar;
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
    elements.bestScoreDisplay.textContent = bestScoreToday;
    updateSettingsUI();
}

function updateProfileDisplay() {
    elements.profileDisplay.innerHTML = '';
    if (userProfile.nickname) {
        const avatar = getAvatarSvg(userProfile.avatar);
        if (avatar) {
            avatar.classList.add('w-6', 'h-6');
            elements.profileDisplay.appendChild(avatar);
        }
        const nickEl = document.createElement('span');
        nickEl.textContent = userProfile.nickname;
        elements.profileDisplay.appendChild(nickEl);
    } else {
        elements.profileDisplay.textContent = `Player ID: ${userId ? userId.substring(0, 6) : 'Cargando...'}`;
    }
}

function getAvatarSvg(avatarId) {
    const avatarSvgs = {
        'avatar-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>',
        'avatar-square': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>',
        'avatar-triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path></svg>',
        'avatar-star': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
        'avatar-heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path></svg>',
        'avatar-zap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        'avatar-shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
        'avatar-ghost': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.52 15.02L2 19l4.04 3.49M18.48 15.02L22 19l-4.04 3.49M8 12h8M12 8v8M2 11h20M19 3l3 4M5 3l-3 4"></path></svg>',
        'avatar-diamond': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41L13.7 2.71a2.41 2.41 0 00-3.41 0z"></path></svg>',
        'avatar-anchor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8M5 12H2a10 10 0 0020 0h-3M12 8a4 4 0 00-4-4 4 4 0 00-4 4"></path><circle cx="12" cy="5" r="2"></circle></svg>',
        'avatar-aperture': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m14.31 8 5.74 9.94M9.69 8h11.48M7.38 12.01 9.69 16l-5.74-9.94M9.69 16 4.26 6.06M14.31 16H2.83M16.62 12.01 14.31 8l5.74 9.94"></path></svg>',
        'avatar-cloud': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"></path></svg>',
        'avatar-crown': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"></path></svg>',
        'avatar-moon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>',
        'avatar-sun': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
        'avatar-key': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>',
    };
    const svgString = avatarSvgs[avatarId];
    if (!svgString) return null;
    const div = document.createElement('div');
    div.innerHTML = svgString.trim();
    const svg = div.firstChild;
    svg.setAttribute('class', 'w-full h-full text-gray-300');
    return svg;
}

function updateProfileUI() {
    elements.currentAvatarDisplay.innerHTML = '';
    const avatar = getAvatarSvg(selectedAvatar);
    if (avatar) elements.currentAvatarDisplay.appendChild(avatar);
    const galleryAvatars = elements.avatarGallery.children;
    for (const avatarEl of galleryAvatars) {
        if (avatarEl.dataset.avatarId === selectedAvatar) {
            avatarEl.classList.add('avatar-selected');
        } else {
            avatarEl.classList.remove('avatar-selected');
        }
    }
}

async function saveSettings() {
    if (!isAuthReady || !userId) return;
    const userDocRef = doc(db, `users/${userId}`);
    try {
        await setDoc(userDocRef, { settings: settings }, { merge: true });
    } catch (error) {
        console.error("Error saving settings:", error);
    }
}

async function saveProfile() {
    if (!isAuthReady || !userId) return;
    const newNickname = elements.nicknameInput.value.trim();
    const feedbackEl = elements.nicknameFeedback;
    if (newNickname.length < 2) {
        feedbackEl.textContent = "El nick debe tener 2+ caracteres.";
        feedbackEl.className = "text-center text-sm mt-2 h-4 text-red-500";
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(newNickname)) {
        feedbackEl.textContent = "Solo letras y números, sin espacios.";
        feedbackEl.className = "text-center text-sm mt-2 h-4 text-red-500";
        return;
    }
    feedbackEl.textContent = "Comprobando...";
    feedbackEl.className = "text-center text-sm mt-2 h-4 text-gray-400";
    const newNicknameLower = newNickname.toLowerCase();
    const nicknamesColRef = collection(db, `nicknames`);
    const q = query(nicknamesColRef, where("nicknameLower", "==", newNicknameLower));
    try {
        const querySnapshot = await getDocs(q);
        let isTaken = false;
        querySnapshot.forEach((doc) => {
            if (doc.data().userId !== userId) {
                isTaken = true;
            }
        });
        if (isTaken) {
            feedbackEl.textContent = "Ese nick ya está en uso.";
            feedbackEl.className = "text-center text-sm mt-2 h-4 text-red-500";
            return;
        }
        const userDocRef = doc(db, `users/${userId}`);
        const nicknameDocRef = doc(nicknamesColRef, userId);
        await runTransaction(db, async (transaction) => {
            transaction.set(userDocRef, { profile: { nickname: newNickname, avatar: selectedAvatar } }, { merge: true });
            transaction.set(nicknameDocRef, { nicknameLower: newNicknameLower, userId: userId, avatar: selectedAvatar, nickname: newNickname });
        });
        userProfile = { nickname: newNickname, avatar: selectedAvatar };
        updateProfileDisplay();
        feedbackEl.textContent = "¡Perfil guardado!";
        feedbackEl.className = "text-center text-sm mt-2 h-4 text-green-500";
    } catch (error) {
        console.error("Error saving profile: ", error);
        feedbackEl.textContent = "Error al guardar.";
        feedbackEl.className = "text-center text-sm mt-2 h-4 text-red-500";
    }
}

async function saveBestScore() {
    if (!isAuthReady || !userId) return;
    const userDocRef = doc(db, `users/${userId}`);
    const today = new Date().toLocaleDateString();
    try {
        await setDoc(userDocRef, { bestScore: { score: bestScoreToday, date: today } }, { merge: true });
    } catch (error) {
        console.error("Error saving best score:", error);
    }
}

async function saveRanking(newScore) {
    if (!isAuthReady || !userId || newScore <= 0) return;
    const userDocRef = doc(db, `users/${userId}`);
    try {
        const docSnap = await getDoc(userDocRef);
        let ranking = (docSnap.exists() && docSnap.data().ranking) ? docSnap.data().ranking : [];
        const now = new Date();
        const dateString = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        ranking.push({ score: newScore, date: dateString });
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        await setDoc(userDocRef, { ranking: ranking }, { merge: true });
    } catch (error) {
        console.error("Error saving ranking:", error);
    }
}

async function resetAllData() {
    if (!isAuthReady || !userId) return;
    const userDocRef = doc(db, `users/${userId}`);
    try {
        await setDoc(userDocRef, { bestScore: { score: 0, date: new Date().toLocaleDateString() }, ranking: [] }, { merge: true });
        bestScoreToday = 0;
        elements.bestScoreDisplay.textContent = 0;
    } catch (error) {
        console.error("Error resetting data:", error);
    }
}

function updateSettingsUI() {
    if (settings.sound) {
        elements.soundCheckbox.classList.add('bg-emerald-500');
        elements.soundCheckmark.classList.remove('hidden');
    } else {
        elements.soundCheckbox.classList.remove('bg-emerald-500');
        elements.soundCheckmark.classList.add('hidden');
    }
    if (settings.vibration) {
        elements.vibrationCheckbox.classList.add('bg-emerald-500');
        elements.vibrationCheckmark.classList.remove('hidden');
    } else {
        elements.vibrationCheckbox.classList.remove('bg-emerald-500');
        elements.vibrationCheckmark.classList.add('hidden');
    }
    if (settings.showScore) {
        elements.showScoreCheckbox.classList.add('bg-emerald-500');
        elements.showScoreCheckmark.classList.remove('hidden');
    } else {
        elements.showScoreCheckbox.classList.remove('bg-emerald-500');
        elements.showScoreCheckmark.classList.add('hidden');
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

function switchFriendsTab(activeTab) { /* Placeholder */ }
async function searchPlayers(searchTerm) { /* Placeholder */ }
async function sendFriendRequest(button) { /* Placeholder */ }
async function handleFriendRequest(requestId, status) { /* Placeholder */ }


function addEventListeners() {
    elements.playButton.addEventListener('click', startGameFlow);
    elements.actionButton.addEventListener('click', handleActionClick);
    elements.howToPlayButton.addEventListener('click', () => showScreen(elements.howToPlayScreen));
    elements.rankingButton.addEventListener('click', async () => { await displayRanking(); showScreen(elements.rankingScreen); });
    elements.settingsButton.addEventListener('click', () => showScreen(elements.settingsScreen));
    elements.aboutButton.addEventListener('click', () => showScreen(elements.aboutScreen));
    elements.friendsButton.addEventListener('click', () => showScreen(elements.friendsScreen));
    elements.editProfileButton.addEventListener('click', () => {
        elements.nicknameInput.value = userProfile.nickname;
        selectedAvatar = userProfile.avatar;
        updateProfileUI();
        showScreen(elements.profileScreen)
    });
    elements.backToMainButtons.forEach(button => button.addEventListener('click', () => showScreen(elements.mainScreen)));
    elements.backToSettingsFromProfileButton.addEventListener('click', () => showScreen(elements.settingsScreen));
    elements.exitButton.addEventListener('click', () => {
        if (gameState === 'running') clearInterval(intervalId);
        if (gameState === 'stopped') clearTimeout(hardStopTimer);
        elements.exitPopup.classList.remove('hidden');
    });
    elements.cancelExitButton.addEventListener('click', () => {
        elements.exitPopup.classList.add('hidden');
        if (gameState === 'running') {
            startTime = Date.now();
            intervalId = setInterval(updateChronometer, 10);
        }
        if (gameState === 'stopped') {
            hardStopTimer = setTimeout(() => endGame('hard_stop_timeout'), HARD_STOP_LIMIT);
        }
    });
    elements.confirmExitButton.addEventListener('click', () => {
        elements.exitPopup.classList.add('hidden');
        showScreen(elements.mainScreen);
    });
    elements.playAgainButton.addEventListener('click', () => {
        elements.endGamePopup.classList.add('hidden');
        startGameFlow();
    });
    elements.mainMenuButton.addEventListener('click', () => {
        elements.endGamePopup.classList.add('hidden');
        showScreen(elements.mainScreen);
    });
    elements.soundCheckbox.addEventListener('click', () => {
        settings.sound = !settings.sound;
        saveSettings();
        updateSettingsUI();
    });
    elements.vibrationCheckbox.addEventListener('click', () => {
        settings.vibration = !settings.vibration;
        saveSettings();
        updateSettingsUI();
    });
    elements.showScoreCheckbox.addEventListener('click', () => {
        settings.showScore = !settings.showScore;
        saveSettings();
        updateSettingsUI();
    });
    elements.resetDataButton.addEventListener('click', () => elements.resetDataPopup.classList.remove('hidden'));
    elements.cancelResetButton.addEventListener('click', () => elements.resetDataPopup.classList.add('hidden'));
    elements.confirmResetButton.addEventListener('click', async () => {
        await resetAllData();
        elements.resetDataPopup.classList.add('hidden');
        await displayRanking();
    });
    elements.saveProfileButton.addEventListener('click', saveProfile);
    elements.friendsTabList.addEventListener('click', () => switchFriendsTab('list'));
    elements.friendsTabRequests.addEventListener('click', () => switchFriendsTab('requests'));
    elements.addFriendInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchPlayers(e.target.value);
        }
    });

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
}

// --- ARRANQUE DE LA APLICACIÓN ---
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

// ESTA LÍNEA ES LA QUE INICIA TODO
checkPasswordAndInit();
