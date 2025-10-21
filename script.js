// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, collection, query, where, getDocs, onSnapshot, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

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

    // --- 1. ELEMENTOS DEL DOM ---
    const elements = {
        mainScreen: document.getElementById('main-screen'),
        gameScreen: document.getElementById('game-screen'),
        howToPlayScreen: document.getElementById('how-to-play-screen'),
        rankingScreen: document.getElementById('ranking-screen'),
        settingsScreen: document.getElementById('settings-screen'),
        aboutScreen: document.getElementById('about-screen'),
        infoScreen: document.getElementById('info-screen'),
        profileScreen: document.getElementById('profile-screen'),
        friendsScreen: document.getElementById('friends-screen'),
        playButton: document.getElementById('play-button'),
        rankingButton: document.getElementById('ranking-button'),
        friendsButton: document.getElementById('friends-button'),
        settingsIconButton: document.getElementById('settings-icon-button'),
        infoIconButton: document.getElementById('info-icon-button'),
        infoNavHowToPlayButton: document.getElementById('info-nav-how-to-play-button'),
        infoNavAboutButton: document.getElementById('info-nav-about-button'),
        backToMainButtons: document.querySelectorAll('[id^="back-to-main-"]'),
        exitButton: document.getElementById('exit-button'),
        chronometerDisplay: document.getElementById('chronometer'),
        attemptsIndicator: document.getElementById('attempts-indicator'),
        actionButton: document.getElementById('action-button'),
        dateDisplay: document.getElementById('date-display'),
        scoreFeedback: document.getElementById('score-feedback'),
        bestScoreDisplay: document.getElementById('best-score-display'),
        personalRankingList: document.getElementById('personal-ranking-list'),
        globalRankingList: document.getElementById('global-ranking-list'),
        rankingTabPersonal: document.getElementById('ranking-tab-personal'),
        rankingTabGlobal: document.getElementById('ranking-tab-global'),
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
        finalScoreText: document.querySelector('#end-game-popup .text-xl'),
        playAgainButton: document.getElementById('play-again-button'),
        mainMenuButton: document.getElementById('main-menu-button'),
        gameModePopup: document.getElementById('game-mode-popup'),
        modeClassicButton: document.getElementById('mode-classic-button'),
        modeHiddenButton: document.getElementById('mode-hidden-button'),
        modeProButton: document.getElementById('mode-pro-button'),
        modeFastButton: document.getElementById('mode-fast-button'),
        closeModePopupButton: document.getElementById('close-mode-popup-button'),
        resetDataPopup: document.getElementById('reset-data-popup'),
        confirmResetButton: document.getElementById('confirm-reset-button'),
        cancelResetButton: document.getElementById('cancel-reset-button'),
        currentScoreDisplay: document.getElementById('current-score-display'),
        currentScoreContainer: document.getElementById('current-score-container'),
        friendsNotificationBadge: document.getElementById('friends-notification-badge'),
        requestsNotificationBadge: document.getElementById('requests-notification-badge'),
        deleteNicknameInput: document.getElementById('delete-nickname-input'),
        deleteNicknameButton: document.getElementById('delete-nickname-button'),
        deleteFeedback: document.getElementById('delete-feedback'),
        profileButton: document.getElementById('profile-button'),
        profileTabEdit: document.getElementById('profile-tab-edit'),
        profileTabMedals: document.getElementById('profile-tab-medals'),
        profileEditContainer: document.getElementById('profile-edit-container'),
        profileMedalsContainer: document.getElementById('profile-medals-container'),
        medalGalleryContainer: document.getElementById('medal-gallery-container'),
        medalDetailPopup: document.getElementById('medal-detail-popup'),
        closeMedalPopup: document.getElementById('close-medal-popup'),
        medalPopupIcon: document.getElementById('medal-popup-icon'),
        medalPopupName: document.getElementById('medal-popup-name'),
        medalPopupDescription: document.getElementById('medal-popup-description'),
        medalPopupStatus: document.getElementById('medal-popup-status'),
    };

    // --- 2. VARIABLES DE ESTADO ---
    let app, db, auth, functions;
    let userId = null;
    let isAuthReady = false;
    let userProfile = { nickname: '', avatar: 'avatar-circle' };
    let gameState = 'ready', attemptsLeft = 10, score = 0, bestScoreToday = 0;
    let intervalId = null, startTime = 0, elapsedTime = 0, timeWhenStopped = 0;
    const HARD_STOP_LIMIT = 15000;
    let hardStopTimer = null;
    let settings = { sound: true, vibration: true, showScore: true };
    let selectedAvatar = 'avatar-circle';
    const AVATAR_IDS = ['avatar-circle', 'avatar-square', 'avatar-triangle', 'avatar-star', 'avatar-heart', 'avatar-zap', 'avatar-shield', 'avatar-ghost', 'avatar-diamond', 'avatar-anchor', 'avatar-aperture', 'avatar-cloud', 'avatar-crown', 'avatar-moon', 'avatar-sun', 'avatar-key'];
    let hasNewRequests = false;
    const audio = {};
    let currentGameMode = 'classic';
    let currentGameDuration = 10000;
    let gameSpeedMultiplier = 1;
    let userMilestones = {}; // Para el progreso a largo plazo
    let sessionStats = {};   // Para las estadísticas de la partida actual

    // --- CATÁLOGO DE LOGROS Y MEDALLAS ---
const MEDAL_CONFIG = {
        'habilidad_primer_3': {
            name: "Primeros Pasos",
            description: "Consigue tu primer +3.",
            icon: 'avatar-triangle', // Icono para esta medalla
            milestone: 'totalThreePointers',
            levels: { bronze: 1 }
        },
        'habilidad_primer_hit': {
            name: "¡Bautismo de Fuego!",
            description: "Consigue tu primer ¡HIT! (+5).",
            icon: 'avatar-zap', // Icono para esta medalla
            milestone: 'totalHits',
            levels: { bronze: 1 }
        },
        'habilidad_primer_capicua': {
            name: "Doble o Nada",
            description: "Consigue tu primer Capicúa (+2).",
            icon: 'avatar-heart', // Icono para esta medalla
            milestone: 'totalCapicuas',
            levels: { bronze: 1 }
        }
    };

    // --- 3. DEFINICIONES DE FUNCIONES ---

    function showMedalDetails(medalId) {
    const config = MEDAL_CONFIG[medalId];
    if (!config || !elements.medalDetailPopup) return;

    // Limpiamos el icono anterior
    elements.medalPopupIcon.innerHTML = ''; 
    const medalIcon = getAvatarSvg(config.icon);

    // Comprobamos el estado
    const medalKey = `${medalId}_bronze`;
    const isUnlocked = userMilestones.unlockedMedals && userMilestones.unlockedMedals[medalKey];

    // Coloreamos el icono del popup
    if (isUnlocked) {
        medalIcon.classList.add('text-yellow-600'); // Color bronce
        elements.medalPopupStatus.textContent = "¡CONSEGUIDA!";
        elements.medalPopupStatus.className = "mt-4 text-lg font-semibold text-yellow-400";
    } else {
        medalIcon.classList.add('text-gray-700'); // Color bloqueado
        elements.medalPopupStatus.textContent = "BLOQUEADA";
        elements.medalPopupStatus.className = "mt-4 text-lg font-semibold text-gray-500";
    }

    if (medalIcon) {
        elements.medalPopupIcon.appendChild(medalIcon);
    }

    // Rellenamos el resto de la información
    elements.medalPopupName.textContent = config.name;
    elements.medalPopupDescription.textContent = config.description;

    // Mostramos el popup
    playSound('ui-click'); // Sonido al abrir
    elements.medalDetailPopup.classList.remove('hidden');
}

    function showMedalUnlockedPopup(medalName) {
        // Alerta temporal para probar la funcionalidad.
        alert(`¡MEDALLA DESBLOQUEADA!\n\n${medalName}`);
    }

    async function checkAndUnlockMedals() {
        let newMedalsUnlocked = false;
        
        // Aseguramos que el objeto para guardar medallas exista
        if (!userMilestones.unlockedMedals) {
            userMilestones.unlockedMedals = {};
        }

        for (const medalId in MEDAL_CONFIG) {
            const config = MEDAL_CONFIG[medalId];
            const playerProgress = userMilestones[config.milestone] || 0;
            
            // Por ahora, solo comprobamos el nivel "bronze"
            const requirement = config.levels.bronze;
            const medalKey = `${medalId}_bronze`;

            // Si el jugador cumple el requisito Y AÚN NO tiene la medalla...
            if (playerProgress >= requirement && !userMilestones.unlockedMedals[medalKey]) {
                userMilestones.unlockedMedals[medalKey] = true; // Desbloqueamos la medalla
                newMedalsUnlocked = true;
                showMedalUnlockedPopup(config.name);
                // NOTA: Usamos await aquí para que las alertas no se solapen si se desbloquean varias a la vez
                await new Promise(resolve => setTimeout(resolve, 100)); 
            }
        }

        // Si hemos desbloqueado algo, actualizamos los datos en la nube
        if (newMedalsUnlocked) {
            await saveMilestones();
        }
    }

    function preloadAudio() {
        const soundFiles = ['ui-click', 'start-game', 'stop-button', 'score-point', 'score-hit', 'game-over', 'new-best-score'];
        soundFiles.forEach(soundName => {
            const sound = new Audio(`sounds/${soundName}.mp3`);
            sound.preload = 'auto';
            audio[soundName] = sound;
        });
    }

    function playSound(soundName) {
        if (!settings.sound || !audio[soundName]) return;
        audio[soundName].currentTime = 0;
        audio[soundName].play().catch(error => console.error(`Error playing sound ${soundName}:`, error));
    }

    function vibrate(pattern) {
        if (settings.vibration && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    function setAppLoading(isLoading) {
        const mainButtons = [
            elements.playButton, elements.friendsButton, elements.rankingButton
        ];
        mainButtons.forEach(button => {
            if (button) {
                if (isLoading) {
                    button.disabled = true;
                    button.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    button.disabled = false;
                    button.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        });
    }

    function checkNewRequests(requests) {
        if (requests && requests.length > 0) {
            hasNewRequests = true;
        } else {
            hasNewRequests = false;
        }
        updateNotificationUI();
    }

    function updateNotificationUI() {
        if (elements.friendsNotificationBadge) {
            if (hasNewRequests) {
                elements.friendsNotificationBadge.classList.remove('hidden');
                elements.requestsNotificationBadge.classList.remove('hidden');
            } else {
                elements.friendsNotificationBadge.classList.add('hidden');
                elements.requestsNotificationBadge.classList.add('hidden');
            }
        }
    }

    async function loadUserData() {
        if (!userId) return;
        const userDocRef = doc(db, "users", userId);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const today = new Date().toLocaleDateString();
                bestScoreToday = (data.bestScore && data.bestScore.date === today) ? data.bestScore.score : 0;
                settings = data.settings || { sound: true, vibration: true, showScore: true };
                userProfile = data.profile || { nickname: '', avatar: 'avatar-circle' };
                userMilestones = data.milestones || { totalScore: 0, gamesPlayed: 0, totalHits: 0, totalCapicuas: 0, totalThreePointers: 0 };
                selectedAvatar = userProfile.avatar;
            } else {
                userProfile = { nickname: '', avatar: 'avatar-circle' };
                userMilestones = { totalScore: 0, gamesPlayed: 0, totalHits: 0, totalCapicuas: 0, totalThreePointers: 0 };
                selectedAvatar = 'avatar-circle';
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
        if (elements.bestScoreDisplay) {
            elements.bestScoreDisplay.textContent = bestScoreToday;
        }
        updateSettingsUI();
    }

    async function saveProfile() {
        if (!isAuthReady) return;
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
        const nicknamesColRef = collection(db, "nicknames");
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
            const userDocRef = doc(db, "users", userId);
            const nicknameDocRef = doc(nicknamesColRef, userId);
            await runTransaction(db, async (transaction) => {
                transaction.set(userDocRef, { profile: { nickname: newNickname, avatar: selectedAvatar } }, { merge: true });
                transaction.set(nicknameDocRef, { nicknameLower: newNicknameLower, userId: userId, avatar: selectedAvatar, nickname: newNickname });
            });
            userProfile = { nickname: newNickname, avatar: selectedAvatar };
            updateProfileButton();
            feedbackEl.textContent = "¡Perfil guardado!";
            feedbackEl.className = "text-center text-sm mt-2 h-4 text-green-500";
            playSound('ui-click');
        } catch (error) {
            console.error("Error saving profile: ", error);
            feedbackEl.textContent = "Error al guardar.";
            feedbackEl.className = "text-center text-sm mt-2 h-4 text-red-500";
        }
    }

    async function saveBestScore(scoreToSave) {
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        const today = new Date().toLocaleDateString();
        try {
            await setDoc(userDocRef, { bestScore: { score: scoreToSave, date: today } }, { merge: true });
            playSound('new-best-score');
        } catch (error) {
            console.error("Error saving best score:", error);
        }
    }

    async function saveRanking(newScore) {
        if (!isAuthReady || newScore <= 0) return;
        const userDocRef = doc(db, "users", userId);
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
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        try {
            await setDoc(userDocRef, { bestScore: { score: 0, date: new Date().toLocaleDateString() }, ranking: [] }, { merge: true });
            bestScoreToday = 0;
            elements.bestScoreDisplay.textContent = 0;
            playSound('ui-click');
        } catch (error) {
            console.error("Error resetting data:", error);
        }
    }

    async function saveSettings() {
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        try {
            await setDoc(userDocRef, { settings: settings }, { merge: true });
            playSound('ui-click');
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    }

    function showScreen(screenToShow) {
        const screens = [elements.mainScreen, elements.gameScreen, elements.howToPlayScreen, elements.rankingScreen, elements.settingsScreen, elements.aboutScreen, elements.infoScreen, elements.profileScreen, elements.friendsScreen];
        screens.forEach(screen => { if (screen) screen.classList.add('hidden') });
        if (screenToShow) screenToShow.classList.remove('hidden');
    }

    function initializeAppUI() {
        showScreen(elements.mainScreen);
        const now = new Date();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        if (elements.dateDisplay) {
            elements.dateDisplay.textContent = `${days[now.getDay()]}, ${now.getDate()}`;
        }
    }

function getAvatarSvg(avatarId) {
        const svgTemplate = document.getElementById(avatarId);
        if (!svgTemplate) return null;
        const svgClone = svgTemplate.cloneNode(true);
        svgClone.removeAttribute('id');
        svgClone.setAttribute('class', 'w-full h-full'); 
        return svgClone;
    }

    function updateProfileButton() {
        if (!elements.profileButton) return;
        elements.profileButton.innerHTML = ''; // Limpiamos el botón
        if (userProfile.nickname) {
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'w-8 h-8'; // Un poco más grande para el botón
        const avatar = getAvatarSvg(userProfile.avatar);
        if (avatar) {
            avatarContainer.appendChild(avatar);
        }
        elements.profileButton.appendChild(avatarContainer);

        const nickEl = document.createElement('span');
        nickEl.className = 'text-lg font-semibold text-gray-300';
        nickEl.textContent = userProfile.nickname;
        elements.profileButton.appendChild(nickEl);
    } else {
        // Texto provisional si no hay perfil
        const placeholderText = document.createElement('span');
        placeholderText.className = 'text-gray-400';
        placeholderText.textContent = `Crea tu Perfil`;
        elements.profileButton.appendChild(placeholderText);
    }
}

    function updateProfileUI() {
        if (!elements.currentAvatarDisplay || !elements.avatarGallery) return;
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

    function resetGame() {
        gameState = 'ready';
        attemptsLeft = 10;
        score = 0;
        elapsedTime = 0;
        timeWhenStopped = 0;
        if (intervalId) clearInterval(intervalId);
        if (hardStopTimer) clearTimeout(hardStopTimer);
        sessionStats = {
        score: 0,
        hits: 0,
        capicuas: 0,
        threePointers: 0
         };
        updateChronometerDisplay();
        setupAttemptsIndicator();
        elements.currentScoreDisplay.textContent = 0;
        elements.actionButton.textContent = '¡GO!';
        elements.actionButton.className = "action-button w-1/2 h-20 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";

        if (settings.showScore) {
            elements.currentScoreContainer.classList.remove('hidden');
        } else {
            elements.currentScoreContainer.classList.add('hidden');
        }
        elements.chronometerDisplay.classList.remove('opacity-0');
    }

    function startGameFlow(mode) {
        currentGameMode = mode;
        gameSpeedMultiplier = 1; // Resetea la velocidad por defecto

        switch (mode) {
            case 'classic':
            case 'hidden':
                currentGameDuration = 10000;
                break;
            case 'pro':
                currentGameDuration = 3000;
                break;
            case 'fast':
                currentGameDuration = 10000;
                gameSpeedMultiplier = 2; // El tiempo corre al doble de velocidad
                break;
            default:
                currentGameDuration = 10000;
        }

        // Se movió la vibración y sonido al pulsar GO en handleActionClick
        resetGame();

        if (currentGameMode === 'hidden') {
            elements.chronometerDisplay.classList.add('opacity-0');
        }

        showScreen(elements.gameScreen);
    }

    function setupAttemptsIndicator() {
        if (!elements.attemptsIndicator) return;
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
            if (i < usedAttempts) {
                dots[i].classList.add('bg-red-500');
            } else {
                dots[i].classList.add('bg-green-500');
            }
        }
    }

    function updateChronometer() {
        const realElapsedTime = Date.now() - startTime;
        elapsedTime = timeWhenStopped + (realElapsedTime * gameSpeedMultiplier); // Lógica de velocidad

        if (elapsedTime >= currentGameDuration) {
            elapsedTime = currentGameDuration;
            updateChronometerDisplay();
            endGame('time_limit');
            return;
        }
        updateChronometerDisplay();
    }

    function updateChronometerDisplay() {
        if (!elements.chronometerDisplay) return;
        const seconds = Math.floor(elapsedTime / 1000);
        const milliseconds = Math.floor((elapsedTime % 1000) / 10);
        elements.chronometerDisplay.innerHTML = `${String(seconds).padStart(2, '0')}<span class="text-5xl sm:text-6xl text-gray-400">.${String(milliseconds).padStart(2, '0')}</span>`;
    }

    function showScoreFeedback(text) {
        if (!text || !elements.scoreFeedback) return;
        vibrate(100);
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
            playSound('score-hit');
            sessionStats.hits++; // Correcto para el HIT
        } else if (seconds > 0 && isDecena && secondMatchesDecimal) {
            pointsThisTurn = 3;
            feedbackText = '+3';
            playSound('score-point');
            sessionStats.threePointers++;
            // Aquí no se cuenta nada específico, es una jugada de +3
        } else if (isCapicua) {
            pointsThisTurn = 2;
            feedbackText = '+2';
            playSound('score-point');
            sessionStats.capicuas++; // CORREGIDO: Ahora se cuenta en la jugada de +2
        } else if (isDecena) {
            pointsThisTurn = 1;
            feedbackText = '+1';
            playSound('score-point');
        }
        
        score += pointsThisTurn;
        sessionStats.score = score; // Correcto
        elements.currentScoreDisplay.textContent = score;
        if (pointsThisTurn > 0) showScoreFeedback(feedbackText);
    }

    async function saveMilestones() {
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        try {
            await setDoc(userDocRef, { milestones: userMilestones }, { merge: true });
        } catch (error) {
            console.error("Error saving milestones:", error);
        }
    }
    
    async function endGame(reason) {
        if (gameState === 'finished') return;
        gameState = 'finished';
        clearInterval(intervalId);
        clearTimeout(hardStopTimer);

        playSound('game-over');
        vibrate([100, 50, 100]);

    // 1. Blindamos el 'score' para asegurar que es un número
    const finalSessionScore = isNaN(score) ? 0 : score;

    // 2. Calculamos el bonus de forma segura
    let bonus = 0;
    if (finalSessionScore > 0) {
    if (currentGameMode === 'hidden') bonus = 5;
    if (currentGameMode === 'pro') bonus = 3;
    if (currentGameMode === 'fast') bonus = 2;
}
    const finalScoreWithBonus = finalSessionScore + bonus;

    // 3. Actualizamos los hitos con datos 100% seguros
    userMilestones.gamesPlayed = (userMilestones.gamesPlayed || 0) + 1;
    userMilestones.totalScore = (userMilestones.totalScore || 0) + finalScoreWithBonus;
    userMilestones.totalHits = (userMilestones.totalHits || 0) + (sessionStats.hits || 0);
    userMilestones.totalCapicuas = (userMilestones.totalCapicuas || 0) + (sessionStats.capicuas || 0);
    userMilestones.totalThreePointers = (userMilestones.totalThreePointers || 0) + (sessionStats.threePointers || 0);

    await saveMilestones(); // ¡Guardamos el progreso en la nube!
    await checkAndUnlockMedals(); // Ahora esta línea SÍ se ejecutará

    // 4. Mostramos el resultado en la UI
    if (bonus > 0) {
    elements.finalScoreText.innerHTML = `Tu puntuación: <span class="font-bold text-white">${finalScoreWithBonus}</span> <span class="text-base text-cyan-400">(${finalSessionScore} + ${bonus} Bonus)</span>`;
} else {
    elements.finalScoreText.innerHTML = `Tu puntuación: <span class="font-bold text-white">${finalSessionScore}</span>`;
}

    // 5. Guardamos el mejor score y llamamos al ranking
    if (finalScoreWithBonus > bestScoreToday) {
    bestScoreToday = finalScoreWithBonus;
    elements.bestScoreDisplay.textContent = bestScoreToday;
    await saveBestScore(finalScoreWithBonus);
}
    await saveRanking(finalScoreWithBonus);

        // --- LLAMADA A LA FUNCIÓN CON FETCH ---
        if (finalScoreWithBonus > 0 && auth.currentUser) {
            try {
                const idToken = await auth.currentUser.getIdToken(true);
                const url = 'https://us-central1-tim3-br3ak.cloudfunctions.net/submitScore';
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + idToken,
                        'Content-Type': 'application/json'
                    },
                    // ENVIAMOS LA EVIDENCIA, NO SOLO EL RESULTADO
                    body: JSON.stringify({ 
                        gameMode: currentGameMode,
                        stats: sessionStats, 
                        duration: elapsedTime
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error del servidor: ${response.statusText}`);
                }
                console.log("Puntuación verificada y enviada al ranking global.");

            } catch (error)
{
                console.error("Error al enviar la puntuación global:", error);
            }
        }

        if (currentGameMode === 'hidden') {
            elements.chronometerDisplay.classList.remove('opacity-0');
            updateChronometerDisplay();
        }

        setTimeout(() => {
            if (elements.endGamePopup) elements.endGamePopup.classList.remove('hidden');
        }, 300);
    }

    function handleActionClick() {
        if (gameState === 'ready') {
            playSound('start-game');
            vibrate(50);
            gameState = 'running';
            startTime = Date.now();
            intervalId = setInterval(updateChronometer, 10);

            hardStopTimer = setTimeout(() => endGame('hard_stop_timeout'), HARD_STOP_LIMIT);

            elements.actionButton.textContent = 'STOP';
            elements.actionButton.className = "action-button w-1/2 h-20 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
            const dots = elements.attemptsIndicator.children;
            for (let i = 0; i < dots.length; i++) {
                dots[i].classList.replace('bg-gray-600', 'bg-green-500');
            }
        } else if (gameState === 'running') {
            playSound('stop-button');
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
        } else if (gameState === 'stopped') {
            playSound('stop-button');
            gameState = 'running';
            startTime = Date.now();
            intervalId = setInterval(updateChronometer, 10);
            elements.actionButton.textContent = 'STOP';
            elements.actionButton.className = "action-button w-1/2 h-20 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
        }
    }

    async function displayPersonalRanking() {
        const userDocRef = doc(db, "users", userId);
        elements.personalRankingList.innerHTML = '';
        try {
            const docSnap = await getDoc(userDocRef);
            const ranking = (docSnap.exists() && docSnap.data().ranking) ? docSnap.data().ranking : [];
            if (ranking.length === 0) {
                elements.personalRankingList.innerHTML = `<div class="text-gray-400 text-center">Aún no has puntuado. ¡Juega para ser el primero!</div>`;
                return;
            }
            const rankColors = ['text-yellow-400', 'text-gray-300', 'text-yellow-600'];
            ranking.forEach((entry, index) => {
                const colorClass = index < 3 ? rankColors[index] : 'text-white';
                const listItem = ` <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg"> <span class="font-bold text-2xl w-12 text-center ${colorClass}">#${index + 1}</span> <span class="font-chrono text-3xl flex-grow text-center ${colorClass}">${entry.score} PTS</span> <span class="text-sm text-gray-500 w-24 text-right">${entry.date}</span> </div>`;
                elements.personalRankingList.innerHTML += listItem;
            });
        } catch (error) {
            console.error("Error displaying personal ranking:", error);
            elements.personalRankingList.innerHTML = `<div class="text-red-500 text-center">No se pudo cargar el ranking.</div>`;
        }
    }
    
    async function displayGlobalRanking() {
        elements.globalRankingList.innerHTML = `<div class="text-center text-gray-400 p-8">Cargando ranking mundial...</div>`;

        try {
            if (!auth.currentUser) {
                throw new Error("Usuario no autenticado.");
            }
            const idToken = await auth.currentUser.getIdToken(true);
            const url = 'https://us-central1-tim3-br3ak.cloudfunctions.net/getGlobalRanking';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + idToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `Error del servidor: ${response.statusText}`);
            }
            
            const result = await response.json();
            const { topScores, userRank } = result;

            elements.globalRankingList.innerHTML = ''; 

            if (!topScores || topScores.length === 0) {
                elements.globalRankingList.innerHTML = `<div class="text-center text-gray-400 p-8">Aún no hay puntuaciones. ¡Sé el primero!</div>`;
                return;
            }

            const medalIcons = ['icon-gold-medal', 'icon-silver-medal', 'icon-bronze-medal'];

            topScores.forEach((entry, index) => {
                const isCurrentUser = entry.userId === userId;
                const rowClass = isCurrentUser ? 'bg-purple-900/50 border-2 border-purple-500' : 'bg-gray-800';
                
                let rankDisplay = `<span class="font-bold text-2xl w-12 text-center text-white">#${entry.rank}</span>`;
                if (index < 3) {
                    const medalSvg = getAvatarSvg(medalIcons[index]);
                    if(medalSvg) rankDisplay = `<div class="w-12 h-12 flex items-center justify-center">${medalSvg.outerHTML}</div>`;
                }
                
                const avatarSvg = getAvatarSvg(entry.avatar);
                const listItem = `
                    <div class="flex items-center justify-between p-2 rounded-lg ${rowClass}">
                        ${rankDisplay}
                        <div class="flex items-center space-x-3 flex-grow ml-4">
                            <div class="w-10 h-10 p-1 bg-gray-900 rounded-full">${avatarSvg ? avatarSvg.outerHTML : ''}</div>
                            <span class="font-semibold text-lg truncate">${entry.nickname}</span>
                        </div>
                        <span class="font-chrono text-2xl text-yellow-400 w-24 text-right">${entry.score}</span>
                    </div>`;
                elements.globalRankingList.innerHTML += listItem;
            });

            const userIsInTop50 = topScores.some(entry => entry.userId === userId);

            if (userRank && !userIsInTop50 && userRank.rank > 50) {
                 const userAvatarSvg = getAvatarSvg(userProfile.avatar);
                 const userRow = `
                    <div class="flex items-center justify-between p-2 rounded-lg bg-purple-900/50 border-2 border-purple-500 mt-4">
                        <span class="font-bold text-2xl w-12 text-center text-white">#${userRank.rank}</span>
                        <div class="flex items-center space-x-3 flex-grow ml-4">
                            <div class="w-10 h-10 p-1 bg-gray-900 rounded-full">${userAvatarSvg ? userAvatarSvg.outerHTML : ''}</div>
                            <span class="font-semibold text-lg truncate">${userProfile.nickname}</span>
                        </div>
                        <span class="font-chrono text-2xl text-yellow-400 w-24 text-right">${userRank.score}</span>
                    </div>`;
                elements.globalRankingList.innerHTML += userRow;
            }

        } catch (error) {
            console.error("Error al obtener el ranking global:", error);
            elements.globalRankingList.innerHTML = `<div class="text-center text-red-500 p-8">No se pudo cargar el ranking mundial.</div>`;
        }
    }
    
    function updateSettingsUI() {
        if (!elements.soundCheckbox) return;
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

    function displayFriends(friendsList) {
        const container = elements.friendsListContainer;
        if (!container) return;
        container.innerHTML = "";
        if (!friendsList || friendsList.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-400 p-4">Añade amigos para verlos aquí.</div>`;
            return;
        }
        friendsList.forEach(friend => {
            const friendCard = document.createElement('div');
            friendCard.className = 'flex items-center justify-between bg-gray-800 p-3 rounded-lg';
            const profileInfo = document.createElement('div');
            profileInfo.className = 'flex items-center space-x-4';
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'w-12 h-12 p-1 bg-gray-900 rounded-full';
            const avatar = getAvatarSvg(friend.avatar);
            if (avatar) avatarContainer.appendChild(avatar);
            const textInfo = document.createElement('div');
            const nickEl = document.createElement('span');
            nickEl.className = 'font-bold text-white text-lg';
            nickEl.textContent = friend.nickname;
            const scoreEl = document.createElement('p');
            scoreEl.className = 'font-chrono text-sm text-yellow-400';
            scoreEl.textContent = `Best: 0`;
            textInfo.appendChild(nickEl);
            textInfo.appendChild(scoreEl);
            profileInfo.appendChild(avatarContainer);
            profileInfo.appendChild(textInfo);
            const removeButton = document.createElement('button');
            removeButton.className = 'bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-full action-button';
            removeButton.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
            friendCard.appendChild(profileInfo);
            friendCard.appendChild(removeButton);
            container.appendChild(friendCard);
        });
    }

    function switchRankingTab(activeTab) {
        const { rankingTabPersonal, rankingTabGlobal, personalRankingList, globalRankingList } = elements;
        if (!rankingTabPersonal) return;

        if (activeTab === 'personal') {
            rankingTabPersonal.classList.add("text-white", "border-purple-500");
            rankingTabPersonal.classList.remove("text-gray-400", "border-transparent");
            rankingTabGlobal.classList.add("text-gray-400", "border-transparent");
            rankingTabGlobal.classList.remove("text-white", "border-purple-500");
            
            personalRankingList.classList.remove("hidden");
            globalRankingList.classList.add("hidden");
        } else { // 'global'
            rankingTabGlobal.classList.add("text-white", "border-purple-500");
            rankingTabGlobal.classList.remove("text-gray-400", "border-transparent");
            rankingTabPersonal.classList.add("text-gray-400", "border-transparent");
            rankingTabPersonal.classList.remove("text-white", "border-purple-500");

            globalRankingList.classList.remove("hidden");
            personalRankingList.classList.add("hidden");
        }
    }

    function switchFriendsTab(activeTab) {
        const { friendsTabList, friendsTabRequests, friendsListContainer, requestsListContainer } = elements;
        if (!friendsTabList) return;
        if (activeTab === 'list') {
            friendsTabList.classList.remove("text-gray-400", "border-transparent");
            friendsTabList.classList.add("text-white", "border-purple-500");
            friendsTabRequests.classList.add("text-gray-400", "border-transparent");
            friendsTabRequests.classList.remove("text-white", "border-purple-500");
            friendsListContainer.classList.remove("hidden");
            requestsListContainer.classList.add("hidden");
        } else { // 'requests'
            friendsTabRequests.classList.remove("text-gray-400", "border-transparent");
            friendsTabRequests.classList.add("text-white", "border-purple-500");
            friendsTabList.classList.add("text-gray-400", "border-transparent");
            friendsTabList.classList.remove("text-white", "border-purple-500");
            if (hasNewRequests) {
                hasNewRequests = false;
                updateNotificationUI();
            }
            requestsListContainer.classList.remove("hidden");
            friendsListContainer.classList.add("hidden");
        }
    }

    async function searchPlayers(searchTerm) {
        const container = elements.searchResultsContainer;
        if (!container) return;
        container.innerHTML = "";
        if (searchTerm.length < 2) return;
        const nicknamesColRef = collection(db, `nicknames`);
        const q = query(nicknamesColRef, where("nicknameLower", "==", searchTerm.toLowerCase()));
        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                container.innerHTML = `<div class="text-center text-gray-400 p-4">No se encontraron jugadores.</div>`;
                return;
            }
            querySnapshot.forEach(docSnap => {
                const playerData = docSnap.data();
                if (playerData.userId === userId) return;
                const resultEl = document.createElement('div');
                resultEl.className = 'flex items-center justify-between bg-gray-700 p-2 rounded-lg';
                const profileInfo = document.createElement('div');
                profileInfo.className = 'flex items-center space-x-3';
                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'w-10 h-10 p-1 bg-gray-800 rounded-full';
                const avatar = getAvatarSvg(playerData.avatar);
                if (avatar) avatarContainer.appendChild(avatar);
                const nickEl = document.createElement('span');
                nickEl.textContent = playerData.nickname;
                profileInfo.appendChild(avatarContainer);
                profileInfo.appendChild(nickEl);
                const addButton = document.createElement('button');
                addButton.className = 'bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-md text-sm action-button';
                addButton.textContent = 'Añadir';
                addButton.dataset.id = playerData.userId;
                addButton.onclick = (e) => sendFriendRequest(e.target);
                resultEl.appendChild(profileInfo);
                resultEl.appendChild(addButton);
                container.appendChild(resultEl);
            });
        } catch (error) {
            console.error("Error searching players:", error);
            container.innerHTML = `<div class="text-center text-red-500 p-4">Error al buscar.</div>`;
        }
    }

    async function sendFriendRequest(button) {
        const friendId = button.dataset.id;
        if (!userId || !friendId) return;
        const requestsRef = collection(db, "friendRequests");
        const requestId = userId < friendId ? `${userId}_${friendId}` : `${friendId}_${userId}`;
        const requestDocRef = doc(requestsRef, requestId);
        try {
            const docSnap = await getDoc(requestDocRef);
            if (docSnap.exists() && docSnap.data().status === 'rejected') {
                await updateDoc(requestDocRef, { from: userId, to: friendId, status: 'pending', createdAt: new Date() });
            } else if (!docSnap.exists()) {
                await setDoc(requestDocRef, { from: userId, to: friendId, status: 'pending', createdAt: new Date() });
            }
            button.textContent = "Enviada";
            button.disabled = true;
            button.classList.remove("bg-purple-600", "hover:bg-purple-700");
            button.classList.add("bg-gray-500", "cursor-not-allowed");
        } catch (error) {
            console.error("Error sending friend request:", error);
            button.textContent = "Error";
        }
    }

    function listenToFriends() {
        if (!userId) return;
        const friendsColRef = collection(db, `users/${userId}/friends`);
        onSnapshot(friendsColRef, (snapshot) => {
            const friendsList = snapshot.docs.map(doc => ({ 
                userId: doc.id, 
                ...doc.data() 
            }));
            displayFriends(friendsList);
        }, (error) => {
            console.error("Error en el listener de amigos:", error);
        });
    }

    function listenToFriendRequests() {
        if (!userId) return;
        const requestsColRef = collection(db, `friendRequests`);
        const q = query(requestsColRef, where("to", "==", userId), where("status", "==", "pending"));
        onSnapshot(q, async (snapshot) => {
            checkNewRequests(snapshot.docs);
            const requestsPromises = snapshot.docs.map(requestDoc => {
                const senderId = requestDoc.data().from;
                const nicknameDocRef = doc(db, 'nicknames', senderId);
                return getDoc(nicknameDocRef);
            });
            const senderNickDocs = await Promise.all(requestsPromises);
            const requestsList = senderNickDocs.map((nickDoc, index) => {
                if (nickDoc.exists()) {
                    return { requestId: snapshot.docs[index].id, ...nickDoc.data() };
                }
                return null;
            }).filter(Boolean);
            displayFriendRequests(requestsList);
        }, (error) => {
            console.error("Error en el listener de solicitudes:", error);
        });
    }

    function displayFriendRequests(requestsList) {
        const container = elements.requestsListContainer;
        if (!container) return;
        container.innerHTML = "";
        if (!requestsList || requestsList.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-400 p-4">No tienes solicitudes pendientes.</div>`;
            return;
        }
        requestsList.forEach(request => {
            const requestCard = document.createElement('div');
            requestCard.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-lg';
            const profileInfo = document.createElement('div');
            profileInfo.className = 'flex items-center space-x-4';
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'w-12 h-12 p-1 bg-gray-900 rounded-full';
            const avatar = getAvatarSvg(request.avatar);
            if (avatar) avatarContainer.appendChild(avatar);
            const nickEl = document.createElement('span');
            nickEl.className = 'font-bold text-white text-lg';
            nickEl.textContent = request.nickname;
            profileInfo.appendChild(avatarContainer);
            profileInfo.appendChild(nickEl);
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'flex space-x-2';
            const acceptButton = document.createElement('button');
            acceptButton.className = 'bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded-full action-button';
            acceptButton.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            acceptButton.dataset.requestId = request.requestId;
            acceptButton.onclick = () => handleFriendRequest(request.requestId, 'accepted');
            const rejectButton = document.createElement('button');
            rejectButton.className = 'bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-full action-button';
            rejectButton.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            rejectButton.dataset.requestId = request.requestId;
            rejectButton.onclick = () => handleFriendRequest(request.requestId, 'rejected');
            buttonsContainer.appendChild(acceptButton);
            buttonsContainer.appendChild(rejectButton);
            requestCard.appendChild(profileInfo);
            requestCard.appendChild(buttonsContainer);
            container.appendChild(requestCard);
        });
    }

    async function handleFriendRequest(requestId, action) {
        if (!isAuthReady) return;
        const handleRequest = httpsCallable(functions, 'handleFriendRequest');
        try {
            const buttons = document.querySelectorAll(`button[data-request-id="${requestId}"]`);
            buttons.forEach(btn => btn.disabled = true);

            await handleRequest({
                requestId,
                action,
                accepterProfile: {
                    nickname: userProfile.nickname,
                    avatar: userProfile.avatar
                }
            });

        } catch (error) {
            console.error("Error al llamar a la Cloud Function:", error);
            const buttons = document.querySelectorAll(`button[data-request-id="${requestId}"]`);
            buttons.forEach(btn => btn.disabled = false);
        }
    }

    async function deleteUserByNickname() {
        if (!isAuthReady) return;
        const nicknameToDelete = elements.deleteNicknameInput.value.trim();
        if (!nicknameToDelete) {
            elements.deleteFeedback.textContent = "Introduce un nick.";
            return;
        }

        elements.deleteFeedback.textContent = "Borrando...";
        const deleteFunction = httpsCallable(functions, 'deleteUserByNickname');
        try {
            const result = await deleteFunction({ nickname: nicknameToDelete });
            elements.deleteFeedback.textContent = result.data.message;
        } catch (error) {
            console.error("Error al borrar usuario:", error);
            elements.deleteFeedback.textContent = error.message;
        } finally {
            elements.deleteNicknameInput.value = "";
            setTimeout(() => { elements.deleteFeedback.textContent = ""; }, 3000);
        }
    }
function switchProfileTab(activeTab) {
    if (activeTab === 'edit') {
        // Activa la pestaña Editar
        elements.profileTabEdit.classList.add('text-white', 'border-purple-500');
        elements.profileTabEdit.classList.remove('text-gray-400', 'border-transparent');
        elements.profileEditContainer.classList.remove('hidden');

        // Desactiva la pestaña Medallas
        elements.profileTabMedals.classList.add('text-gray-400', 'border-transparent');
        elements.profileTabMedals.classList.remove('text-white', 'border-purple-500');
        elements.profileMedalsContainer.classList.add('hidden');
    } else { // 'medals'
        // Activa la pestaña Medallas
        elements.profileTabMedals.classList.add('text-white', 'border-purple-500');
        elements.profileTabMedals.classList.remove('text-gray-400', 'border-transparent');
        elements.profileMedalsContainer.classList.remove('hidden');

        // Desactiva la pestaña Editar
        elements.profileTabEdit.classList.add('text-gray-400', 'border-transparent');
        elements.profileTabEdit.classList.remove('text-white', 'border-purple-500');
        elements.profileEditContainer.classList.add('hidden');
    }
}

function renderMedalGallery() {
    if (!elements.medalGalleryContainer) return;
    elements.medalGalleryContainer.innerHTML = ''; 

    for (const medalId in MEDAL_CONFIG) {
        const config = MEDAL_CONFIG[medalId];

        // Convertimos el div en un botón para hacerlo interactivo
        const medalButton = document.createElement('button'); 
        medalButton.className = 'medal-item focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg'; // Añadimos estilos de botón
        medalButton.onclick = () => showMedalDetails(medalId); // Llamamos a la nueva función al pulsar

        const medalIcon = getAvatarSvg(config.icon);
        if (!medalIcon) continue; 

        const medalKey = `${medalId}_bronze`;
        if (userMilestones.unlockedMedals && userMilestones.unlockedMedals[medalKey]) {
            medalButton.classList.add('medal-bronze'); // Aplicamos clase al botón
        } else {
            medalButton.classList.add('medal-locked'); // Aplicamos clase al botón
        }

        medalButton.appendChild(medalIcon);
        elements.medalGalleryContainer.appendChild(medalButton);
    }
}

    // --- 4. LÓGICA DE ARRANQUE ---
    async function startApp() {
        try {
            setAppLoading(true);
            initializeAppUI();
            preloadAudio();

            const firebaseConfig = {
                apiKey: "AIzaSyDSm5KfMJEQj8jVB0CfqvkyABH-rNNKgc4",
                authDomain: "tim3-br3ak.firebaseapp.com",
                projectId: "tim3-br3ak",
                storageBucket: "tim3-br3ak.appspot.com",
                messagingSenderId: "1029726018714",
                appId: "1:1029726018714:web:16ed60f60bdf57ebe2d323",
                measurementId: "G-VGSD8GC449"
            };
            const firebaseApp = initializeApp(firebaseConfig);
            db = getFirestore(firebaseApp);
            auth = getAuth(firebaseApp);
            functions = getFunctions(firebaseApp, 'us-central1');

            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    await loadUserData();
                    updateProfileButton();
                    listenToFriendRequests();
                    listenToFriends();
                    isAuthReady = true;
                    setAppLoading(false);
                } else {
                    await signInAnonymously(auth);
                }
            });
        } catch (error) {
            console.error("Error fatal durante la inicialización:", error);
            setAppLoading(false);
        }
    }

    // --- 5. INICIALIZACIÓN Y EVENT LISTENERS ---
    try {
        if (elements.playButton) elements.playButton.addEventListener('click', () => {
            playSound('ui-click');
            elements.gameModePopup.classList.remove('hidden');
        });

        if (elements.modeClassicButton) elements.modeClassicButton.addEventListener('click', () => {
            elements.gameModePopup.classList.add('hidden');
            startGameFlow('classic');
        });

        if (elements.modeHiddenButton) elements.modeHiddenButton.addEventListener('click', () => {
            elements.gameModePopup.classList.add('hidden');
            startGameFlow('hidden');
        });

        if (elements.modeProButton) elements.modeProButton.addEventListener('click', () => {
            elements.gameModePopup.classList.add('hidden');
            startGameFlow('pro');
        });

        if (elements.modeFastButton) elements.modeFastButton.addEventListener('click', () => {
            elements.gameModePopup.classList.add('hidden');
            startGameFlow('fast');
        });

        if (elements.closeModePopupButton) elements.closeModePopupButton.addEventListener('click', () => {
            playSound('ui-click');
            elements.gameModePopup.classList.add('hidden');
        });

        if (elements.settingsIconButton) elements.settingsIconButton.addEventListener('click', () => {
            playSound('ui-click');
            showScreen(elements.settingsScreen);
        });

        if (elements.infoIconButton) elements.infoIconButton.addEventListener('click', () => {
            playSound('ui-click');
            showScreen(elements.infoScreen);
        });

        if (elements.infoNavHowToPlayButton) elements.infoNavHowToPlayButton.addEventListener('click', () => {
            playSound('ui-click');
            showScreen(elements.howToPlayScreen);
        });

        if (elements.infoNavAboutButton) elements.infoNavAboutButton.addEventListener('click', () => {
            playSound('ui-click');
            showScreen(elements.aboutScreen);
        });

         if (elements.rankingButton) elements.rankingButton.addEventListener('click', async () => { 
            playSound('ui-click'); 
            if(isAuthReady) { 
                await displayPersonalRanking();
                switchRankingTab('personal');
                showScreen(elements.rankingScreen); 
            } 
        });

        if (elements.rankingTabPersonal) elements.rankingTabPersonal.addEventListener('click', () => {
            playSound('ui-click');
            switchRankingTab('personal');
        });
        
       if (elements.rankingTabGlobal) elements.rankingTabGlobal.addEventListener('click', async () => { // <-- Convertido a async
            playSound('ui-click');
            switchRankingTab('global');
            await displayGlobalRanking(); // <-- Llama a la nueva función
        });
        
        if (elements.friendsButton) elements.friendsButton.addEventListener('click', () => {
            playSound('ui-click'); 
            if (isAuthReady) { 
                switchFriendsTab('list'); 
                showScreen(elements.friendsScreen); 
            } 
        });

        if (elements.profileTabEdit) {
        elements.profileTabEdit.addEventListener('click', () => {
            playSound('ui-click');
            switchProfileTab('edit');
            });
        }

        if (elements.profileTabMedals) {
        elements.profileTabMedals.addEventListener('click', () => {
            playSound('ui-click');
            renderMedalGallery(); // Dibujamos la galería CADA VEZ que se pulsa
            switchProfileTab('medals');
            });
        }
        if (elements.closeMedalPopup) {
    elements.closeMedalPopup.addEventListener('click', () => {
        playSound('ui-click'); // Sonido al cerrar
        elements.medalDetailPopup.classList.add('hidden');
    });
}
        if (elements.profileButton) {
            elements.profileButton.addEventListener('click', () => {
        playSound('ui-click');
        if (isAuthReady) {
            // Preparamos la pantalla de perfil antes de mostrarla
            elements.nicknameInput.value = userProfile.nickname;
            selectedAvatar = userProfile.avatar;
            updateProfileUI(); 
            showScreen(elements.profileScreen);
            }
        });
      }

        elements.backToMainButtons.forEach(button => button.addEventListener('click', () => { playSound('ui-click'); showScreen(elements.mainScreen); }));
        document.getElementById('back-to-main-from-profile').addEventListener('click', () => { playSound('ui-click'); showScreen(elements.mainScreen); });

        if (elements.actionButton) elements.actionButton.addEventListener('click', handleActionClick);
        if (elements.exitButton) elements.exitButton.addEventListener('click', () => { playSound('ui-click'); if (gameState === 'running' || gameState === 'stopped') { clearInterval(intervalId); clearTimeout(hardStopTimer); } elements.exitPopup.classList.remove('hidden'); });
        if (elements.cancelExitButton) elements.cancelExitButton.addEventListener('click', () => { playSound('ui-click'); elements.exitPopup.classList.add('hidden'); if (gameState === 'running') { startTime = Date.now(); intervalId = setInterval(updateChronometer, 10); } if (gameState === 'stopped') { /* No reiniciamos el hardStopTimer */ } });
        if (elements.confirmExitButton) elements.confirmExitButton.addEventListener('click', () => { playSound('ui-click'); elements.exitPopup.classList.add('hidden'); showScreen(elements.mainScreen); });

        if (elements.playAgainButton) elements.playAgainButton.addEventListener('click', () => {
            elements.endGamePopup.classList.add('hidden');
            startGameFlow(currentGameMode);
        });

        if (elements.mainMenuButton) elements.mainMenuButton.addEventListener('click', () => { playSound('ui-click'); elements.endGamePopup.classList.add('hidden'); showScreen(elements.mainScreen); });
        if (elements.soundCheckbox) elements.soundCheckbox.addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); updateSettingsUI(); });
        if (elements.vibrationCheckbox) elements.vibrationCheckbox.addEventListener('click', () => { settings.vibration = !settings.vibration; saveSettings(); updateSettingsUI(); });
        if (elements.showScoreCheckbox) elements.showScoreCheckbox.addEventListener('click', () => { settings.showScore = !settings.showScore; saveSettings(); updatSettingsUI(); });
        if (elements.resetDataButton) elements.resetDataButton.addEventListener('click', () => { playSound('ui-click'); elements.resetDataPopup.classList.remove('hidden'); });
        if (elements.cancelResetButton) elements.cancelResetButton.addEventListener('click', () => { playSound('ui-click'); elements.resetDataPopup.classList.add('hidden'); });
        if (elements.confirmResetButton) elements.confirmResetButton.addEventListener('click', async () => { await resetAllData(); elements.resetDataPopup.classList.add('hidden'); await displayPersonalRanking(); });
        if (elements.saveProfileButton) elements.saveProfileButton.addEventListener('click', saveProfile);
        if (elements.friendsTabList) elements.friendsTabList.addEventListener('click', () => { playSound('ui-click'); switchFriendsTab('list'); });
        if (elements.friendsTabRequests) elements.friendsTabRequests.addEventListener('click', () => { playSound('ui-click'); switchFriendsTab('requests'); });
        if (elements.addFriendInput) elements.addFriendInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') { searchPlayers(e.target.value); } });

        if (elements.avatarGallery) {
            AVATAR_IDS.forEach(id => {
                const avatarContainer = document.createElement('div');
                avatarContainer.dataset.avatarId = id;
                avatarContainer.className = 'avatar-container p-2 rounded-lg cursor-pointer hover:bg-gray-700';
                const svg = getAvatarSvg(id);
                if (svg) avatarContainer.appendChild(svg);
                elements.avatarGallery.appendChild(avatarContainer);
                avatarContainer.addEventListener('click', () => {
                    playSound('ui-click');
                    selectedAvatar = id;
                    updateProfileUI();
                });
            });
        }

        startApp();
    } catch (error) {
        console.error("Error al añadir event listeners:", error);
    }
}

// Punto de entrada inicial
checkPasswordAndInit();






