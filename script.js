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

    // --- 1. ELEMENTOS DEL DOM ---
    const elements = {
        // ... (todos tus elementos anteriores)
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
        // NUEVOS ELEMENTOS para las notificaciones
        friendsNotificationBadge: document.getElementById('friends-notification-badge'),
        requestsNotificationBadge: document.getElementById('requests-notification-badge'),
    };

    // --- 2. VARIABLES DE ESTADO ---
    let app, db, auth;
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
    let hasNewRequests = false; // NUEVA VARIABLE de estado

    // --- 2.5 DATOS SIMULADOS (PARA LA SECCIÓN DE AMIGOS) ---
    const mockAllPlayers = [
        { userId: 'player002', nickname: 'ChronoMaster', avatar: 'avatar-zap', bestScoreToday: 850 },
        { userId: 'player003', nickname: 'Glitch', avatar: 'avatar-ghost', bestScoreToday: 920 },
        { userId: 'player004', nickname: '8-Bit-Hero', avatar: 'avatar-square', bestScoreToday: 780 },
        { userId: 'player005', nickname: 'RacerX', avatar: 'avatar-diamond', bestScoreToday: 950 },
        { userId: 'player006', nickname: 'Serenity', avatar: 'avatar-moon', bestScoreToday: 810 },
    ];
    let mockUserFriends = [
        { userId: 'player003', nickname: 'Glitch', avatar: 'avatar-ghost', bestScoreToday: 920 },
        { userId: 'player005', nickname: 'RacerX', avatar: 'avatar-diamond', bestScoreToday: 950 },
    ];
    let mockFriendRequests = [
        { userId: 'player002', nickname: 'ChronoMaster', avatar: 'avatar-zap' },
    ];
    
    // --- 3. DEFINICIONES DE FUNCIONES ---

    // --- NUEVAS FUNCIONES PARA NOTIFICACIONES ---
    function checkNewRequests() {
        // Por ahora, usamos los datos MOCK. En el futuro, esto usará los datos de Firebase.
        if (mockFriendRequests.length > 0) {
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
    
    initializeAppUI();
    initializeFirebase();
    checkNewRequests(); // Comprobamos si hay notificaciones al iniciar

    // ... (El resto de tus funciones como loadUserData, saveProfile, etc. se mantienen igual)
    async function loadUserData(){
        if(!isAuthReady||!userId)return;
        const userDocRef=doc(db,"users",userId);
        try{
            const docSnap=await getDoc(userDocRef);
            if(docSnap.exists()){
                const data=docSnap.data();
                const today=(new Date).toLocaleDateString();
                bestScoreToday=data.bestScore&&data.bestScore.date===today?data.bestScore.score:0;
                settings=data.settings||{sound:!0,vibration:!0,showScore:!0};
                userProfile=data.profile||{nickname:"",avatar:"avatar-circle"};
                selectedAvatar=userProfile.avatar
            }
        }catch(error){
            console.error("Error loading user data:",error)
        }
        elements.bestScoreDisplay.textContent=bestScoreToday;
        updateSettingsUI()
    }
    async function saveProfile(){
        if(!isAuthReady||!userId)return;
        const newNickname=elements.nicknameInput.value.trim();
        const feedbackEl=elements.nicknameFeedback;
        if(newNickname.length<2){
            feedbackEl.textContent="El nick debe tener 2+ caracteres.";
            feedbackEl.className="text-center text-sm mt-2 h-4 text-red-500";
            return
        }
        if(!/^[a-zA-Z0-9]+$/.test(newNickname)){
            feedbackEl.textContent="Solo letras y números, sin espacios.";
            feedbackEl.className="text-center text-sm mt-2 h-4 text-red-500";
            return
        }
        feedbackEl.textContent="Comprobando...";
        feedbackEl.className="text-center text-sm mt-2 h-4 text-gray-400";
        const newNicknameLower=newNickname.toLowerCase();
        const nicknamesColRef=collection(db,"nicknames");
        const q=query(nicknamesColRef,where("nicknameLower","==",newNicknameLower));
        try{
            const querySnapshot=await getDocs(q);
            let isTaken=!1;
            querySnapshot.forEach(doc=>{
                if(doc.data().userId!==userId)isTaken=!0
            });
            if(isTaken){
                feedbackEl.textContent="Ese nick ya está en uso.";
                feedbackEl.className="text-center text-sm mt-2 h-4 text-red-500";
                return
            }
            const userDocRef=doc(db,"users",userId);
            const nicknameDocRef=doc(nicknamesColRef,userId);
            await runTransaction(db,async transaction=>{
                transaction.set(userDocRef,{profile:{nickname:newNickname,avatar:selectedAvatar}},{merge:!0});
                transaction.set(nicknameDocRef,{nicknameLower:newNicknameLower,userId:userId,avatar:selectedAvatar,nickname:newNickname})
            });
            userProfile={nickname:newNickname,avatar:selectedAvatar};
            updateProfileDisplay();
            feedbackEl.textContent="¡Perfil guardado!";
            feedbackEl.className="text-center text-sm mt-2 h-4 text-green-500"
        }catch(error){
            console.error("Error saving profile: ",error);
            feedbackEl.textContent="Error al guardar.";
            feedbackEl.className="text-center text-sm mt-2 h-4 text-red-500"
        }
    }
    async function saveBestScore(){
        if(!isAuthReady||!userId)return;
        const userDocRef=doc(db,"users",userId);
        const today=(new Date).toLocaleDateString();
        try{
            await setDoc(userDocRef,{bestScore:{score:bestScoreToday,date:today}},{merge:!0})
        }catch(error){
            console.error("Error saving best score:",error)
        }
    }
    async function saveRanking(newScore){
        if(!isAuthReady||!userId||newScore<=0)return;
        const userDocRef=doc(db,"users",userId);
        try{
            const docSnap=await getDoc(userDocRef);
            let ranking=docSnap.exists()&&docSnap.data().ranking?docSnap.data().ranking:[];
            const now=new Date;
            const dateString=`${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
            ranking.push({score:newScore,date:dateString});
            ranking.sort((a,b)=>b.score-a.score);
            ranking=ranking.slice(0,5);
            await setDoc(userDocRef,{ranking:ranking},{merge:!0})
        }catch(error){
            console.error("Error saving ranking:",error)
        }
    }
    async function resetAllData(){
        if(!isAuthReady||!userId)return;
        const userDocRef=doc(db,"users",userId);
        try{
            await setDoc(userDocRef,{bestScore:{score:0,date:(new Date).toLocaleDateString()},ranking:[]},{merge:!0});
            bestScoreToday=0;
            elements.bestScoreDisplay.textContent=0
        }catch(error){
            console.error("Error resetting data:",error)
        }
    }
    async function saveSettings(){
        if(!isAuthReady||!userId)return;
        const userDocRef=doc(db,"users",userId);
        try{
            await setDoc(userDocRef,{settings:settings},{merge:!0})
        }catch(error){
            console.error("Error saving settings:",error)
        }
    }
    function showScreen(screenToShow){
        const screens=[elements.mainScreen,elements.gameScreen,elements.howToPlayScreen,elements.rankingScreen,elements.settingsScreen,elements.aboutScreen,elements.profileScreen,elements.friendsScreen];
        screens.forEach(screen=>screen.classList.add("hidden"));
        screenToShow.classList.remove("hidden")
    }
    function initializeAppUI(){
        showScreen(elements.mainScreen);
        const now=new Date;
        const days=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
        elements.dateDisplay.textContent=`${days[now.getDay()]}, ${now.getDate()}`
    }
    function getAvatarSvg(avatarId){
        const svgTemplate=document.getElementById(avatarId);
        if(!svgTemplate)return null;
        const svgClone=svgTemplate.cloneNode(!0);
        svgClone.removeAttribute("id");
        svgClone.setAttribute("class","w-full h-full text-gray-300");
        return svgClone
    }
    function updateProfileDisplay(){
        elements.profileDisplay.innerHTML="";
        if(userProfile.nickname){
            const avatar=getAvatarSvg(userProfile.avatar);
            if(avatar){
                avatar.classList.add("w-6","h-6");
                elements.profileDisplay.appendChild(avatar)
            }
            const nickEl=document.createElement("span");
            nickEl.textContent=userProfile.nickname;
            elements.profileDisplay.appendChild(nickEl)
        }else elements.profileDisplay.textContent=`Player ID: ${userId||"Cargando..."}`
    }
    function updateProfileUI(){
        elements.currentAvatarDisplay.innerHTML="";
        const avatar=getAvatarSvg(selectedAvatar);
        if(avatar)elements.currentAvatarDisplay.appendChild(avatar);
        const galleryAvatars=elements.avatarGallery.children;
        for(const avatarEl of galleryAvatars)
            if(avatarEl.dataset.avatarId===selectedAvatar)avatarEl.classList.add("avatar-selected");
            else avatarEl.classList.remove("avatar-selected")
    }
    function resetGame(){
        gameState="ready";
        attemptsLeft=10;
        score=0;
        elapsedTime=0;
        timeWhenStopped=0;
        if(intervalId)clearInterval(intervalId);
        if(hardStopTimer)clearTimeout(hardStopTimer);
        updateChronometerDisplay();
        setupAttemptsIndicator();
        elements.currentScoreDisplay.textContent=0;
        elements.actionButton.textContent="¡GO!";
        elements.actionButton.className="action-button w-1/2 h-20 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
        if(settings.showScore)elements.currentScoreContainer.classList.remove("hidden");
        else elements.currentScoreContainer.classList.add("hidden")
    }
    function startGameFlow(){
        resetGame();
        showScreen(elements.gameScreen)
    }
    function setupAttemptsIndicator(){
        elements.attemptsIndicator.innerHTML="";
        for(let i=0;i<10;i++){
            const dot=document.createElement("div");
            dot.className="w-5 h-5 bg-gray-600 rounded-full transition-colors";
            elements.attemptsIndicator.appendChild(dot)
        }
    }
    function updateAttemptsIndicator(){
        const dots=elements.attemptsIndicator.children;
        const usedAttempts=10-attemptsLeft;
        for(let i=0;i<10;i++){
            dots[i].className="w-5 h-5 rounded-full transition-colors";
            if(i<usedAttempts)dots[i].classList.add("bg-red-500");
            else dots[i].classList.add("bg-green-500")
        }
    }
    function updateChronometer(){
        elapsedTime=Date.now()-startTime+timeWhenStopped;
        if(elapsedTime>=1e4){
            elapsedTime=1e4;
            updateChronometerDisplay();
            endGame("time_limit");
            return
        }
        updateChronometerDisplay()
    }
    function updateChronometerDisplay(){
        const seconds=Math.floor(elapsedTime/1e3);
        const milliseconds=Math.floor(elapsedTime%1e3/10);
        elements.chronometerDisplay.innerHTML=`${String(seconds).padStart(2,"0")}<span class="text-5xl sm:text-6xl text-gray-400">.${String(milliseconds).padStart(2,"0")}</span>`
    }
    function showScoreFeedback(text){
        if(!text)return;
        if(settings.vibration&&navigator.vibrate)navigator.vibrate(100);
        elements.scoreFeedback.textContent=text;
        elements.scoreFeedback.classList.add("show");
        setTimeout(()=>elements.scoreFeedback.classList.remove("show"),800)
    }
    function calculateScore(){
        const seconds=Math.floor(elapsedTime/1e3),
        decimals=Math.floor(elapsedTime%1e3/10);
        let pointsThisTurn=0,feedbackText="";
        const decStr=String(decimals).padStart(2,"0"),
        lastSecondDigit=String(seconds%10),
        isCapicua=decStr[0]===decStr[1],
        isDecena=decStr[1]==="0",
        secondMatchesDecimal=lastSecondDigit===decStr[0];
        if(seconds>0&&isCapicua&&secondMatchesDecimal){
            pointsThisTurn=5;
            feedbackText="¡HIT! +5"
        }else if(seconds>0&&isDecena&&secondMatchesDecimal){
            pointsThisTurn=3;
            feedbackText="+3"
        }else if(isCapicua){
            pointsThisTurn=2;
            feedbackText="+2"
        }else if(isDecena){
            pointsThisTurn=1;
            feedbackText="+1"
        }
        score+=pointsThisTurn;
        elements.currentScoreDisplay.textContent=score;
        if(pointsThisTurn>0)showScoreFeedback(feedbackText)
    }
    async function endGame(reason){
        if(gameState==="finished")return;
        gameState="finished";
        clearInterval(intervalId);
        clearTimeout(hardStopTimer);
        elements.finalScoreDisplay.textContent=score;
        if(score>bestScoreToday){
            bestScoreToday=score;
            elements.bestScoreDisplay.textContent=bestScoreToday;
            await saveBestScore()
        }
        await saveRanking(score);
        elements.endGamePopup.classList.remove("hidden")
    }
    function handleActionClick(){
        if(gameState==="ready"){
            gameState="running";
            startTime=Date.now();
            intervalId=setInterval(updateChronometer,10);
            elements.actionButton.textContent="STOP";
            elements.actionButton.className="action-button w-1/2 h-20 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
            const dots=elements.attemptsIndicator.children;
            for(let i=0;i<dots.length;i++)dots[i].classList.replace("bg-gray-600","bg-green-500")
        }else if(gameState==="running"){
            clearInterval(intervalId);
            timeWhenStopped=elapsedTime;
            gameState="stopped";
            attemptsLeft--;
            updateAttemptsIndicator();
            calculateScore();
            if(attemptsLeft<=0){
                endGame("no_attempts");
                return
            }
            elements.actionButton.textContent="PLAY";
            elements.actionButton.className="action-button w-1/2 h-20 bg-sky-500 hover:bg-sky-600 text-white font-bold text-2xl rounded-full flex items-center justify-center";
            hardStopTimer=setTimeout(()=>endGame("hard_stop_timeout"),15e3)
        }else if(gameState==="stopped"){
            clearTimeout(hardStopTimer);
            gameState="running";
            startTime=Date.now();
            intervalId=setInterval(updateChronometer,10);
            elements.actionButton.textContent="STOP";
            elements.actionButton.className="action-button w-1/2 h-20 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl rounded-full flex items-center justify-center"
        }
    }
    async function displayRanking(){
        if(!isAuthReady||!userId){
            elements.rankingList.innerHTML='<div class="text-gray-400 text-center">Conectando...</div>';
            return
        }
        const userDocRef=doc(db,"users",userId);
        elements.rankingList.innerHTML="";
        try{
            const docSnap=await getDoc(userDocRef),
            ranking=docSnap.exists()&&docSnap.data().ranking?docSnap.data().ranking:[];
            if(ranking.length===0){
                elements.rankingList.innerHTML='<div class="text-gray-400 text-center">Aún no has puntuado. ¡Juega para ser el primero!</div>';
                return
            }
            const rankColors=["text-yellow-400","text-gray-300","text-yellow-600"];
            ranking.forEach((entry,index)=>{
                const colorClass=index<3?rankColors[index]:"text-white",
                listItem=` <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg"> <span class="font-bold text-2xl w-12 text-center ${colorClass}">#${index+1}</span> <span class="font-chrono text-3xl flex-grow text-center ${colorClass}">${entry.score} PTS</span> <span class="text-sm text-gray-500 w-24 text-right">${entry.date}</span> </div>`;
                elements.rankingList.innerHTML+=listItem
            })
        }catch(error){
            console.error("Error displaying ranking:",error);
            elements.rankingList.innerHTML='<div class="text-red-500 text-center">No se pudo cargar el ranking.</div>'
        }
    }
    function updateSettingsUI(){
        if(settings.sound){
            elements.soundCheckbox.classList.add("bg-emerald-500");
            elements.soundCheckmark.classList.remove("hidden")
        }else{
            elements.soundCheckbox.classList.remove("bg-emerald-500");
            elements.soundCheckmark.classList.add("hidden")
        }
        if(settings.vibration){
            elements.vibrationCheckbox.classList.add("bg-emerald-500");
            elements.vibrationCheckmark.classList.remove("hidden")
        }else{
            elements.vibrationCheckbox.classList.remove("bg-emerald-500");
            elements.vibrationCheckmark.classList.add("hidden")
        }
        if(settings.showScore){
            elements.showScoreCheckbox.classList.add("bg-emerald-500");
            elements.showScoreCheckmark.classList.remove("hidden")
        }else{
            elements.showScoreCheckbox.classList.remove("bg-emerald-500");
            elements.showScoreCheckmark.classList.add("hidden")
        }
    }
    
    function displayFriends(){
        const container=elements.friendsListContainer;
        container.innerHTML="";
        if(mockUserFriends.length===0){
            container.innerHTML='<div class="text-center text-gray-400 p-4">Añade amigos para verlos aquí.</div>';
            return
        }
        mockUserFriends.forEach(friend=>{
            const friendCard=document.createElement("div");
            friendCard.className="flex items-center justify-between bg-gray-800 p-3 rounded-lg";
            const profileInfo=document.createElement("div");
            profileInfo.className="flex items-center space-x-4";
            const avatarContainer=document.createElement("div");
            avatarContainer.className="w-12 h-12 p-1 bg-gray-900 rounded-full";
            const avatar=getAvatarSvg(friend.avatar);
            if(avatar)avatarContainer.appendChild(avatar);
            const textInfo=document.createElement("div"),
            nickEl=document.createElement("span");
            nickEl.className="font-bold text-white text-lg";
            nickEl.textContent=friend.nickname;
            const scoreEl=document.createElement("p");
            scoreEl.className="font-chrono text-sm text-yellow-400";
            scoreEl.textContent=`Best: ${friend.bestScoreToday}`;
            textInfo.appendChild(nickEl);
            textInfo.appendChild(scoreEl);
            profileInfo.appendChild(avatarContainer);
            profileInfo.appendChild(textInfo);
            const removeButton=document.createElement("button");
            removeButton.className="bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-full action-button";
            removeButton.innerHTML='<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
            friendCard.appendChild(profileInfo);
            friendCard.appendChild(removeButton);
            container.appendChild(friendCard)
        })
    }
    function displayFriendRequests(){
        const container=elements.requestsListContainer;
        container.innerHTML="";
        if(mockFriendRequests.length===0){
            container.innerHTML='<div class="text-center text-gray-400 p-4">No tienes solicitudes pendientes.</div>';
            return
        }
        mockFriendRequests.forEach(request=>{
            const requestCard=document.createElement("div");
            requestCard.className="flex items-center justify-between bg-gray-700 p-3 rounded-lg";
            const profileInfo=document.createElement("div");
            profileInfo.className="flex items-center space-x-4";
            const avatarContainer=document.createElement("div");
            avatarContainer.className="w-12 h-12 p-1 bg-gray-900 rounded-full";
            const avatar=getAvatarSvg(request.avatar);
            if(avatar)avatarContainer.appendChild(avatar);
            const nickEl=document.createElement("span");
            nickEl.className="font-bold text-white text-lg";
            nickEl.textContent=request.nickname;
            profileInfo.appendChild(avatarContainer);
            profileInfo.appendChild(nickEl);
            const buttonsContainer=document.createElement("div");
            buttonsContainer.className="flex space-x-2";
            const acceptButton=document.createElement("button");
            acceptButton.className="bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded-full action-button";
            acceptButton.innerHTML='<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            const rejectButton=document.createElement("button");
            rejectButton.className="bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-full action-button";
            rejectButton.innerHTML='<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            buttonsContainer.appendChild(acceptButton);
            buttonsContainer.appendChild(rejectButton);
            requestCard.appendChild(profileInfo);
            requestCard.appendChild(buttonsContainer);
            container.appendChild(requestCard)
        })
    }
    function switchFriendsTab(activeTab){
        const {friendsTabList,friendsTabRequests,friendsListContainer,requestsListContainer}=elements;
        if(activeTab==="list"){
            friendsTabList.classList.remove("text-gray-400","border-transparent");
            friendsTabList.classList.add("text-white","border-purple-500");
            friendsTabRequests.classList.add("text-gray-400","border-transparent");
            friendsTabRequests.classList.remove("text-white","border-purple-500");
            displayFriends();
            friendsListContainer.classList.remove("hidden");
            requestsListContainer.classList.add("hidden")
        }else{
            friendsTabRequests.classList.remove("text-gray-400","border-transparent");
            friendsTabRequests.classList.add("text-white","border-purple-500");
            friendsTabList.classList.add("text-gray-400","border-transparent");
            friendsTabList.classList.remove("text-white","border-purple-500");
            displayFriendRequests();
            // Lógica para quitar la notificación al ver las solicitudes
            if (hasNewRequests) {
                hasNewRequests = false;
                updateNotificationUI();
            }
            requestsListContainer.classList.remove("hidden");
            friendsListContainer.classList.add("hidden")
        }
    }
    async function searchPlayers(searchTerm){
        const container=elements.searchResultsContainer;
        container.innerHTML="";
        if(searchTerm.length<2)return;
        const nicknamesColRef=collection(db,"nicknames"),
        q=query(nicknamesColRef,where("nicknameLower","==",searchTerm.toLowerCase()));
        try{
            const querySnapshot=await getDocs(q);
            if(querySnapshot.empty){
                container.innerHTML='<div class="text-center text-gray-400 p-4">No se encontraron jugadores.</div>';
                return
            }
            querySnapshot.forEach(docSnap=>{
                const playerData=docSnap.data();
                if(playerData.userId===userId)return;
                const resultEl=document.createElement("div");
                resultEl.className="flex items-center justify-between bg-gray-700 p-2 rounded-lg";
                const profileInfo=document.createElement("div");
                profileInfo.className="flex items-center space-x-3";
                const avatarContainer=document.createElement("div");
                avatarContainer.className="w-10 h-10 p-1 bg-gray-800 rounded-full";
                const avatar=getAvatarSvg(playerData.avatar);
                if(avatar)avatarContainer.appendChild(avatar);
                const nickEl=document.createElement("span");
                nickEl.textContent=playerData.nickname;
                profileInfo.appendChild(avatarContainer);
                profileInfo.appendChild(nickEl);
                const addButton=document.createElement("button");
                addButton.className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-md text-sm action-button";
                addButton.textContent="Añadir";
                addButton.dataset.id=playerData.userId;
                addButton.onclick=e=>sendFriendRequest(e.target);
                resultEl.appendChild(profileInfo);
                resultEl.appendChild(addButton);
                container.appendChild(resultEl)
            })
        }catch(error){
            console.error("Error searching players:",error);
            container.innerHTML='<div class="text-center text-red-500 p-4">Error al buscar.</div>'
        }
    }
    async function sendFriendRequest(button){
        const friendId=button.dataset.id;
        if(!userId||!friendId)return;
        const requestsRef=collection(db,"friendRequests"),
        requestId=userId<friendId?`${userId}_${friendId}`:`${friendId}_${userId}`,
        requestDocRef=doc(requestsRef,requestId);
        try{
            await setDoc(requestDocRef,{from:userId,to:friendId,status:"pending",createdAt:new Date});
            button.textContent="Enviada";
            button.disabled=!0;
            button.classList.remove("bg-purple-600","hover:bg-purple-700");
            button.classList.add("bg-gray-500","cursor-not-allowed")
        }catch(error){
            console.error("Error sending friend request:",error);
            button.textContent="Error"
        }
    }
    function listenToFriendRequests(){
        if(!userId)return;
        const requestsColRef=collection(db,"friendRequests"),
        q=query(requestsColRef,where("to","==",userId),where("status","==","pending"));
        onSnapshot(q,async snapshot=>{
            elements.requestsListContainer.innerHTML="";
            if(snapshot.empty){
                elements.requestsListContainer.innerHTML='<div class="text-center text-gray-400 p-4">No tienes solicitudes pendientes.</div>';
                return
            }
            for(const docSnap of snapshot.docs){
                const request=docSnap.data(),
                senderId=request.from,
                nicknamesColRef=collection(db,"nicknames"),
                senderProfileDoc=await getDoc(doc(nicknamesColRef,senderId));
                if(senderProfileDoc.exists()){
                    const senderProfile=senderProfileDoc.data(),
                    requestEl=document.createElement("div");
                    requestEl.className="flex items-center justify-between bg-gray-700 p-2 rounded-lg";
                    const profileInfo=document.createElement("div");
                    profileInfo.className="flex items-center space-x-3";
                    const avatarContainer=document.createElement("div");
                    avatarContainer.className="w-10 h-10 p-1 bg-gray-800 rounded-full";
                    const avatar=getAvatarSvg(senderProfile.avatar);
                    if(avatar)avatarContainer.appendChild(avatar);
                    const nickEl=document.createElement("span");
                    nickEl.textContent=senderProfile.nickname;
                    profileInfo.appendChild(avatarContainer);
                    profileInfo.appendChild(nickEl);
                    const buttonsContainer=document.createElement("div");
                    buttonsContainer.className="flex space-x-2";
                    const acceptButton=document.createElement("button");
                    acceptButton.className="bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded-full action-button";
                    acceptButton.innerHTML='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                    acceptButton.onclick=()=>handleFriendRequest(docSnap.id,"accepted");
                    const rejectButton=document.createElement("button");
                    rejectButton.className="bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-full action-button";
                    rejectButton.innerHTML='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
                    rejectButton.onclick=()=>handleFriendRequest(docSnap.id,"rejected");
                    buttonsContainer.appendChild(acceptButton);
                    buttonsContainer.appendChild(rejectButton);
                    requestEl.appendChild(profileInfo);
                    requestEl.appendChild(buttonsContainer);
                    elements.requestsListContainer.appendChild(requestEl)
                }
            }
        })
    }
    async function handleFriendRequest(requestId,status){
        const requestDocRef=doc(db,"friendRequests",requestId);
        if(status==="accepted")try{
            const requestSnap=await getDoc(requestDocRef);
            if(!requestSnap.exists())return;
            const requestData=requestSnap.data(),
            friendId=requestData.from,
            userFriendsRef=doc(db,`users/${userId}/friends/${friendId}`),
            friendFriendsRef=doc(db,`users/${friendId}/friends/${userId}`),
            batch=writeBatch(db);
            batch.set(userFriendsRef,{addedAt:new Date});
            batch.set(friendFriendsRef,{addedAt:new Date});
            batch.delete(requestDocRef);
            await batch.commit()
        }catch(error){
            console.error("Error accepting friend request:",error)
        }else try{
            await deleteDoc(requestDocRef)
        }catch(error){
            console.error("Error rejecting friend request:",error)
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
