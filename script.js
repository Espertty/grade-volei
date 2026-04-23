// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBFdVDye-g-RpbgiWOWfYw70NWAIoYpXao",
  authDomain: "grade-volei-blumenau.firebaseapp.com",
  databaseURL: "https://grade-volei-blumenau-default-rtdb.firebaseio.com",
  projectId: "grade-volei-blumenau",
  storageBucket: "grade-volei-blumenau.firebasestorage.app",
  messagingSenderId: "259646522974",
  appId: "1:259646522974:web:2111c41d8f26e346d1d6cf"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ==========================================
// 2. ESTADO E VARIÁVEIS GLOBAIS
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const currentLocal = urlParams.get('local'); 
const dbRef = currentLocal ? database.ref('parques/' + currentLocal) : null;

const locaisNames = { 'ramiro': 'Parque Ramiro Ruediger', 'artex': 'Artex (Garcia)', 'itoupavas': 'Parque das Itoupavas', 'aguaverde': 'Terminal Água Verde' };
const locaisPasswords = { 'ramiro': 'ramiro123', 'artex': 'artex123', 'itoupavas': 'itoupavas123', 'aguaverde': 'aguaverde123' };

let court = { 1: null, 2: null };
let queue = [];
let scores = { 1: 0, 2: 0 };
let myPlayerName = null; 
let isAdmin = false;

const playerNameDisplay = document.getElementById("playerNameDisplay");
const addPlayerGroup = document.getElementById("addPlayerGroup");
const quickJoinBtn = document.getElementById("quickJoinBtn");

// ==========================================
// 3. SISTEMA DE IDENTIDADE
// ==========================================
auth.onAuthStateChanged(async (user) => {
    const loggedOutUI = document.getElementById("user-logged-out");
    const loggedInUI = document.getElementById("user-logged-in");

    if (user) {
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData && userData.nickname) {
            myPlayerName = userData.nickname;
        } else {
            await definirNovoApelido(user);
        }

        if (playerNameDisplay) playerNameDisplay.textContent = myPlayerName;
        if (loggedOutUI) loggedOutUI.style.display = "none";
        if (loggedInUI) loggedInUI.style.display = "flex";
    } else {
        myPlayerName = null;
        if (loggedOutUI) loggedOutUI.style.display = "block";
        if (loggedInUI) loggedInUI.style.display = "none";
    }
    updateFrictionlessUI();
    render();
});

async function definirNovoApelido(user = auth.currentUser) {
    if (!user) return;
    let nick = prompt(`Como você quer ser chamado na grade?`, myPlayerName || "");
    if (!nick || nick.trim() === "") {
        if (!myPlayerName) nick = user.displayName.split(" ")[0];
        else return;
    }
    myPlayerName = nick.trim();
    await database.ref('users/' + user.uid).set({ nickname: myPlayerName, email: user.email });
    if (playerNameDisplay) playerNameDisplay.textContent = myPlayerName;
    updateFrictionlessUI();
    render();
}

function editPlayerName(type, id) {
    if (!isAdmin) return;
    let oldName = (type === 'court') ? court[id] : queue[id];
    let newName = prompt(`Editar apelido de: ${oldName}`, oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
        if (type === 'court') court[id] = newName.trim();
        else queue[id] = newName.trim();
        saveData();
    }
}

function loginGoogle() { auth.signInWithPopup(provider).catch(e => alert("Erro: " + e.message)); }
function logout() { if(confirm("Deseja sair?")) auth.signOut(); }

// ==========================================
// 4. NAVEGAÇÃO E BANCO
// ==========================================
function selectLocal(localId) { window.location.href = `?local=${localId}`; }
function backToLobby() { window.location.href = window.location.pathname; }

function startDatabaseListener() {
    if (!dbRef) return;
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            court = data.court || { 1: null, 2: null };
            queue = data.queue || [];
            scores = data.scores || { 1: 0, 2: 0 };
        } else {
            court = { 1: null, 2: null }; queue = []; scores = { 1: 0, 2: 0 };
        }
        render();
    });
}

function saveData() { if (dbRef) dbRef.set({ court, queue, scores }); }

// ==========================================
// 5. INTERFACE (UI)
// ==========================================
function updateFrictionlessUI() {
    if (isAdmin) {
        if (addPlayerGroup) addPlayerGroup.style.display = "flex";
        if (quickJoinBtn) quickJoinBtn.style.display = "none";
    } else if (myPlayerName) {
        if (addPlayerGroup) addPlayerGroup.style.display = "none";
        if (quickJoinBtn) {
            quickJoinBtn.style.display = "block";
            quickJoinBtn.textContent = `👉 Entrar na Fila como ${myPlayerName}`;
        }
    } else {
        if (addPlayerGroup) addPlayerGroup.style.display = "none";
        if (quickJoinBtn) quickJoinBtn.style.display = "none";
    }
}

function render() {
    const courtList = document.getElementById("courtList");
    const queueList = document.getElementById("queueList");
    if (!courtList || !queueList) return;
    courtList.innerHTML = ""; queueList.innerHTML = "";

    const lowerMe = myPlayerName ? myPlayerName.toLowerCase() : "";
    if (queue.length > 0 && queue[0].toLowerCase() === lowerMe && !isAdmin) {
        document.body.classList.add("is-scorekeeper");
    } else {
        document.body.classList.remove("is-scorekeeper");
    }

    renderSlot(1); renderSlot(2);

    queue.forEach((player, index) => {
        const li = document.createElement("li");
        const isMe = (myPlayerName && player.toLowerCase() === lowerMe) ? " (Você)" : "";
        li.innerHTML = `<span><strong>${index + 1}º</strong> - ${player}${isMe}</span>`;
        
        if (isAdmin) {
            const bg = document.createElement("div"); bg.className = "btn-group";
            bg.innerHTML = `
                <button class="btn-move" onclick="moveUp(${index})">⬆️</button>
                <button class="btn-move" onclick="moveDown(${index})">⬇️</button>
                <select class="action-select" onchange="adminAction(${index}, this.value)">
                    <option disabled selected>...</option>
                    <option value="v1">V1</option>
                    <option value="v2">V2</option>
                    <option value="renomear">Renomear</option>
                    <option value="sair">Sair</option>
                </select>`;
            li.appendChild(bg);
        }
        queueList.appendChild(li);
    });
}

function renderSlot(slot) {
    const p = court[slot];
    const li = document.createElement("li");
    if (p) {
        li.className = "court-item";
        const isMe = (myPlayerName && p.toLowerCase() === (myPlayerName ? myPlayerName.toLowerCase() : "")) ? " (Você)" : "";
        
        let innerHTML = `<div>🏐 <strong>Vaga ${slot}:</strong> ${p}${isMe}</div>`;
        
        innerHTML += `
            <div class="score-board">
                <button class="btn-score scorekeeper-only" onclick="updateScore(${slot},-1)">-</button>
                <span class="score-value">${scores[slot]}</span>
                <button class="btn-score scorekeeper-only" onclick="updateScore(${slot},1)">+</button>
            </div>`;

        innerHTML += `
            <div class="btn-group">
                <button class="btn-action scorekeeper-only" onclick="playerLost(${slot})">Perdeu</button>
                <button class="btn-remove" onclick="removeFromSlot(${slot})">Sair</button>`;
        
        if (isAdmin) {
            innerHTML += `
                <select class="action-select" onchange="adminCourtAction(${slot}, this.value)">
                    <option disabled selected>Ações...</option>
                    <option value="renomear">Renomear</option>
                </select>`;
        }
        
        innerHTML += `</div>`;
        li.innerHTML = innerHTML;
    } else {
        li.className = "slot-empty"; li.innerHTML = `Vaga ${slot}: Vazia`;
    }
    document.getElementById("courtList").appendChild(li);
}

// ==========================================
// 6. AÇÕES
// ==========================================
if (quickJoinBtn) {
    quickJoinBtn.addEventListener("click", () => {
        if (!myPlayerName) return;
        const l = myPlayerName.toLowerCase();
        if ((court[1] && court[1].toLowerCase() === l) || (court[2] && court[2].toLowerCase() === l) || queue.some(p => p.toLowerCase() === l)) return alert("Você já está na grade!");
        if (!court[1]) court[1] = myPlayerName; else if (!court[2]) court[2] = myPlayerName; else queue.push(myPlayerName);
        saveData();
    });
}

function updateScore(s, c) { scores[s] += c; if (scores[s] < 0) scores[s] = 0; saveData(); }
function playerLost(s) { if (court[s]) { queue.push(court[s]); court[s] = null; scores = { 1: 0, 2: 0 }; if (queue.length > 0) court[s] = queue.shift(); saveData(); } }
function removeFromSlot(s) { if (court[s]) { queue.push(court[s]); court[s] = null; scores = { 1: 0, 2: 0 }; saveData(); } }

function adminAction(i, a) {
    if (a === "renomear") { editPlayerName('queue', i); }
    else if (a === "sair") { queue.splice(i, 1); saveData(); } 
    else {
        const p = queue.splice(i, 1)[0];
        if (a === "v1") { if (court[1]) queue.push(court[1]); court[1] = p; } 
        else { if (court[2]) queue.push(court[2]); court[2] = p; }
        scores = { 1: 0, 2: 0 }; saveData();
    }
}

function adminCourtAction(slot, a) {
    if (a === "renomear") { editPlayerName('court', slot); }
}

function moveUp(i) { if(i>0){ const t=queue[i]; queue[i]=queue[i-1]; queue[i-1]=t; saveData(); } }
function moveDown(i) { if(i<queue.length-1){ const t=queue[i]; queue[i]=queue[i+1]; queue[i+1]=t; saveData(); } }

function addPlayer() {
    const input = document.getElementById("newPlayer");
    const name = input.value.trim();
    if (name) {
        if (!court[1]) court[1] = name; else if (!court[2]) court[2] = name; else queue.push(name);
        input.value = ""; saveData();
    }
}

const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        if (isAdmin) { isAdmin = false; document.body.classList.remove("is-admin"); loginBtn.textContent = "Área Admin"; }
        else {
            const p = prompt(`Senha para ${locaisNames[currentLocal]}:`);
            if (p === locaisPasswords[currentLocal]) { isAdmin = true; document.body.classList.add("is-admin"); loginBtn.textContent = "Sair Admin"; }
            else alert("Senha incorreta!");
        }
        updateFrictionlessUI(); render();
    });
}

function resetPlacarManual() { scores = {1:0, 2:0}; saveData(); }
document.getElementById("resetBtn")?.addEventListener("click", () => { if (confirm("Zerar grade?")) { court={1:null,2:null}; queue=[]; scores={1:0,2:0}; saveData(); } });
document.getElementById("addBtn")?.addEventListener("click", addPlayer);
document.getElementById("newPlayer")?.addEventListener("keypress", (e) => { if (e.key === "Enter") addPlayer(); });

function initApp() {
    if (currentLocal && locaisNames[currentLocal]) {
        document.getElementById("lobby-container").style.display = "none";
        document.getElementById("app-container").style.display = "block";
        document.getElementById("parkNameDisplay").textContent = locaisNames[currentLocal];
        startDatabaseListener();
    }
}
initApp();