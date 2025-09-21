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
        mainScreen: document.getElementById('main-screen'), gameScreen: document.getElementById('game-screen'),
        howToPlayScreen: document.getElementById('how-to-play-screen'), rankingScreen: document.getElementById('ranking-screen'),
        settingsScreen: document.getElementById('settings-screen'), aboutScreen: document.getElementById('about-screen'),
        profileScreen: document.getElementById('profile-screen'), friendsScreen: document.getElementById('friends-screen'),
        playButton: document.getElementById('play-button'), howToPlayButton: document.getElementById('how-to-play-button'),
        rankingButton: document.getElementById('ranking-button'), settingsButton: document.getElementById('settings-button'),
        aboutButton: document.getElementById('about-button'), editProfileButton: document.getElementById('edit-profile-button'),
        friendsButton: document.getElementById('friends-button'),
        backToMainButtons: document.querySelectorAll('[id^="back-to-main-"]'),
        backToSettingsFromProfileButton: document.getElementById('back-to-settings-from-profile-button'),
        exitButton: document.getElementById('exit-button'), chronometerDisplay: document.getElementById('chronometer'),
        attemptsIndicator: document.getElementById('attempts-indicator'), actionButton: document.getElementById('action-button'),
        dateDisplay: document.getElementById('date-display'), scoreFeedback: document.getElementById('score-feedback'),
        bestScoreDisplay: document.getElementById('best-score-display'), rankingList: document.getElementById('ranking-list'),
        profileDisplay: document.getElementById('profile-display'),
        resetDataButton: document.getElementById('reset-data-button'),
        soundCheckbox: document.getElementById('sound-checkbox'), soundCheckmark: document.getElementById('sound-checkmark'),
        vibrationCheckbox: document.getElementById('vibration-checkbox'), vibrationCheckmark: document.getElementById('vibration-checkmark'),
        showScoreCheckbox: document.getElementById('show-score-checkbox'), showScoreCheckmark: document.getElementById('show-score-checkmark'),
        nicknameInput: document.getElementById('nickname-input'), nicknameFeedback: document.getElementById('nickname-feedback'),
        currentAvatarDisplay: document.getElementById('current-avatar-display'), avatarGallery: document.getElementById('avatar-gallery'),
        saveProfileButton: document.getElementById('save-profile-button'),
        friendsTabList: document.getElementById('friends-tab-list'), friendsTabRequests: document.getElementById('friends-tab-requests'),
        friendsListContainer: document.getElementById('friends-list-container'), requestsListContainer: document.getElementById('requests-list-container'),
        addFriendInput: document.getElementById('add-friend-input'), searchResultsContainer: document.getElementById('search-results-container'),
        exitPopup: document.getElementById('exit-popup'), confirmExitButton: document.getElementById('confirm-exit-button'),
        cancelExitButton: document.getElementById('cancel-exit-button'), endGamePopup: document.getElementById('end-game-popup'),
        finalScoreDisplay: document.getElementById('final-score'), playAgainButton: document.getElementById('play-again-button'),
        mainMenuButton: document.getElementById('main-menu-button'), resetDataPopup: document.getElementById('reset-data-popup'),
        confirmResetButton: document.getElementById('confirm-reset-button'), cancelResetButton: document.getElementById('cancel-reset-button'),
        currentScoreDisplay: document.getElementById('current-score-display'), currentScoreContainer: document.getElementById('current-score-container'),
        friendsNotificationBadge: document.getElementById('friends-notification-badge'),
        requestsNotificationBadge: document.getElementById('requests-notification-badge'),
        deleteNicknameInput: document.getElementById('delete-nickname-input'),
        deleteNicknameButton: document.getElementById('delete-nickname-button'),
        deleteFeedback: document.getElementById('delete-feedback'),
    };

    // --- 2. VARIABLES DE ESTADO ---
    let app, db, auth, functions;
    let userId = null;
    let isAuthReady = false;
    let userProfile = { nickname: '', avatar: 'avatar-circle' };
    let gameState = 'ready', attemptsLeft = 10, score = 0, bestScoreToday = 0;
    let intervalId = null, startTime = 0, elapsedTime = 0, timeWhenStopped = 0;
    const GAME_DURATION_LIMIT = 10000, HARD_STOP_LIMIT = 15000;
    let hardStopTimer = null;
    let settings = { sound: true, vibration: true, showScore: true };
    let selectedAvatar = 'avatar-circle';
    const AVATAR_IDS = ['avatar-circle', 'avatar-square', 'avatar-triangle', 'avatar-star', 'avatar-heart', 'avatar-zap', 'avatar-shield', 'avatar-ghost', 'avatar-diamond', 'avatar-anchor', 'avatar-aperture', 'avatar-cloud', 'avatar-crown', 'avatar-moon', 'avatar-sun', 'avatar-key'];
    let hasNewRequests = false;

    // --- 3. DEFINICIONES DE FUNCIONES ---

    function setAppLoading(isLoading) {
        const mainButtons = [
            elements.playButton, elements.friendsButton, elements.howToPlayButton,
            elements.rankingButton, elements.settingsButton, elements.aboutButton
        ];
        mainButtons.forEach(button => {
            if (isLoading) {
                button.disabled = true;
                button.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                button.disabled = false;
                button.classList.remove('opacity-50', 'cursor-not-allowed');
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
        if (hasNewRequests) {
            elements.friendsNotificationBadge.classList.remove('hidden');
            elements.requestsNotificationBadge.classList.remove('hidden');
        } else {
            elements.friendsNotificationBadge.classList.add('hidden');
            elements.requestsNotificationBadge.classList.add('hidden');
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
                selectedAvatar = userProfile.avatar;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
        elements.bestScoreDisplay.textContent = bestScoreToday;
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
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        const today = new Date().toLocaleDateString();
        try {
            await setDoc(userDocRef, { bestScore: { score: bestScoreToday, date: today } }, { merge: true });
        } catch (error) {
            console.error("Error saving best score:", error);
        }
    }

    async function saveRanking(newScore) {
        if (!isAuthReady) return;
        if (newScore <= 0) return;
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
        } catch (error) {
            console.error("Error resetting data:", error);
        }
    }

    async function saveSettings() {
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        try {
            await setDoc(userDocRef, { settings: settings }, { merge: true });
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    }

    function showScreen(screenToShow) {
        const screens = [elements.mainScreen, elements.gameScreen, elements.howToPlayScreen, elements.rankingScreen, elements.settingsScreen, elements.aboutScreen, elements.profileScreen, elements.friendsScreen];
        screens.forEach(screen => screen.classList.add('hidden'));
        screenToShow.classList.remove('hidden');
    }

    function initializeAppUI() {
        showScreen(elements.mainScreen);
        const now = new Date();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        elements.dateDisplay.textContent = `${days[now.getDay()]}, ${now.getDate()}`;
    }

    function getAvatarSvg(avatarId) {
        const svgTemplate = document.getElementById(avatarId);
        if (!svgTemplate) return null;
        const svgClone = svgTemplate.cloneNode(true);
        svgClone.removeAttribute('id');
        svgClone.setAttribute('class', 'w-full h-full text-gray-300');
        return svgClone;
    }

    function updateProfileDisplay() {
        elements.profileDisplay.innerHTML = '';
        if (userProfile.nickname) {
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'w-6 h-6';
            const avatar = getAvatarSvg(userProfile.avatar);
            if (avatar) {
                avatarContainer.appendChild(avatar);
            }
            elements.profileDisplay.appendChild(avatarContainer);
            
            const nickEl = document.createElement('span');
            nickEl.textContent = userProfile.nickname;
            elements.profileDisplay.appendChild(nickEl);
        } else {
            elements.profileDisplay.textContent = `Player ID: ${userId || 'Cargando...'}`;
        }
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
        if (settings.showScore) {
            elements.currentScoreContainer.classList.remove('hidden');
        } else {
            elements.currentScoreContainer.classList.add('hidden');
        }
    }

    function startGameFlow() {
        if (!isAuthReady) return;
        resetGame();
        showScreen(elements.gameScreen);
    }

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
            if (i < usedAttempts) {
                dots[i].classList.add('bg-red-500');
            } else {
                dots[i].classList.add('bg-green-500');
            }
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

    async function displayRanking() {
        if (!isAuthReady) return;
        const userDocRef = doc(db, "users", userId);
        elements.rankingList.innerHTML = '';
        try {
            const docSnap = await getDoc(userDocRef);
            const ranking = (docSnap.exists() && docSnap.data().ranking) ? docSnap.data().ranking : [];
            if (ranking.length === 0) {
                elements.rankingList.innerHTML = `<div class="text-gray-400 text-center">Aún no has puntuado. ¡Juega para ser el primero!</div>`;
                return;
            }
            const rankColors = ['text-yellow-400', 'text-gray-300', 'text-yellow-600'];
            ranking.forEach((entry, index) => {
                const colorClass = index < 3 ? rankColors[index] : 'text-white';
                const listItem = ` <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg"> <span class="font-bold text-2xl w-12 text-center ${colorClass}">#${index + 1}</span> <span class="font-chrono text-3xl flex-grow text-center ${colorClass}">${entry.score} PTS</span> <span class="text-sm text-gray-500 w-24 text-right">${entry.date}</span> </div>`;
                elements.rankingList.innerHTML += listItem;
            });
        } catch (error) {
            console.error("Error displaying ranking:", error);
            elements.rankingList.innerHTML = `<div class="text-red-500 text-center">No se pudo cargar el ranking.</div>`;
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
    
    function displayFriends(friendsList) {
        const container = elements.friendsListContainer;
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

    function switchFriendsTab(activeTab) {
        const { friendsTabList, friendsTabRequests, friendsListContainer, requestsListContainer } = elements;
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
        if (!isAuthReady) return;
        const container = elements.searchResultsContainer;
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
        if (!isAuthReady) return;
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
        if (!isAuthReady) {
            console.error("Intento de acción sin que la autenticación esté lista.");
            return;
        }
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
        if (!isAuthReady) {
            elements.deleteFeedback.textContent = "La app no está lista. Espera.";
            return;
        }
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

    // --- 4. INICIALIZACIÓN Y EVENT LISTENERS ---
    elements.playButton.addEventListener('click', startGameFlow);
    elements.howToPlayButton.addEventListener('click', () => showScreen(elements.howToPlayScreen));
    elements.rankingButton.addEventListener('click', async () => { await displayRanking(); showScreen(elements.rankingScreen); });
    elements.settingsButton.addEventListener('click', () => showScreen(elements.settingsScreen));
    elements.aboutButton.addEventListener('click', () => showScreen(elements.aboutScreen));
    elements.friendsButton.addEventListener('click', () => {
        switchFriendsTab('list');
        showScreen(elements.friendsScreen);
    });
    elements.editProfileButton.addEventListener('click', () => { elements.nicknameInput.value = userProfile.nickname; selectedAvatar = userProfile.avatar; updateProfileUI(); showScreen(elements.profileScreen) });
    elements.deleteNicknameButton.addEventListener('click', deleteUserByNickname);
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
        if (svg) avatarContainer.appendChild(svg);
        elements.avatarGallery.appendChild(avatarContainer);
        avatarContainer.addEventListener('click', () => {
            selectedAvatar = id;
            updateProfileUI();
        });
    });
}

checkPasswordAndInit();
