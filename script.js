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
// 2. ESTADO E REFERÊNCIAS
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const currentLocal = urlParams.get('local'); 
const dbRef = currentLocal ? database.ref('parques/' + currentLocal) : null;
const profilesRef = currentLocal ? database.ref('parques/' + currentLocal + '/profiles') : null;

let court = { 1: null, 2: null }; // Agora guarda UIDs
let queue = []; // Agora guarda UIDs
let scores = { 1: 0, 2: 0 };
let allProfiles = {}; // Cache de apelidos { uid: "Apelido" }
let myUID = null;
let isAdmin = false;

const locaisNames = { 'ramiro': 'Ramiro', 'artex': 'Artex', 'itoupavas': 'Itoupavas', 'aguaverde': 'Água Verde' };
const locaisPasswords = { 'ramiro': 'ramiro123', 'artex': 'artex123', 'itoupavas': 'itoupavas123', 'aguaverde': 'aguaverde123' };

// ==========================================
// 3. AUTENTICAÇÃO E PERFIL
// ==========================================

auth.onAuthStateChanged(async (user) => {
    const loggedOutUI = document.getElementById("user-logged-out");
    const loggedInUI = document.getElementById("user-logged-in");

    if (user) {
        myUID = user.uid;
        
        // Verifica se o usuário já tem um apelido salvo
        const snapshot = await profilesRef.child(myUID).once('value');
        let profile = snapshot.val();

        if (!profile || !profile.nickname) {
            // Primeiro login: pede apelido
            let nick = prompt("Como a galera te chama na quadra? (Apelido)");
            if (!nick || nick.trim() === "") nick = user.displayName.split(" ")[0];
            
            profile = { nickname: nick.trim(), originalName: user.displayName };
            profilesRef.child(myUID).set(profile);
        }

        document.getElementById("playerNameDisplay").textContent = profile.nickname;
        if (loggedOutUI) loggedOutUI.style.display = "none";
        if (loggedInUI) loggedInUI.style.display = "flex";
    } else {
        myUID = null;
        if (loggedOutUI) loggedOutUI.style.display = "block";
        if (loggedInUI) loggedInUI.style.display = "none";
    }
    updateFrictionlessUI();
});

function loginGoogle() { auth.signInWithPopup(provider); }
function logout() { if(confirm("Sair da conta?")) auth.signOut(); }

// ==========================================
// 4. SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================

function startDatabaseListener() {
    if (!dbRef) return;
    
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            court = data.court || { 1: null, 2: null };
            queue = data.queue || [];
            scores = data.scores || { 1: 0, 2: 0 };
            allProfiles = data.profiles || {};
        }
        render();
    });
}

function saveData() {
    if (!dbRef) return;
    dbRef.update({ court, queue, scores });
}

// ==========================================
// 5. RENDERIZAÇÃO (MOSTRANDO APELIDOS)
// ==========================================

function getNick(uid) {
    if (!uid) return "Vazio";
    // Se for um convidado (string manual), retorna o nome. Se for UID, busca no perfil.
    return allProfiles[uid] ? allProfiles[uid].nickname : uid;
}

function render() {
    const courtList = document.getElementById("courtList");
    const queueList = document.getElementById("queueList");
    if (!courtList || !queueList) return;

    courtList.innerHTML = "";
    queueList.innerHTML = "";

    // Placar / Marcador
    if (queue.length > 0 && myUID && queue[0] === myUID && !isAdmin) {
        document.body.classList.add("is-scorekeeper");
    } else {
        document.body.classList.remove("is-scorekeeper");
    }

    renderSlot(1);
    renderSlot(2);

    queue.forEach((uid, index) => {
        const li = document.createElement("li");
        const isMe = (myUID && uid === myUID) ? " (Você)" : "";
        
        li.innerHTML = `<span><strong>${index + 1}º</strong> - ${getNick(uid)}${isMe}</span>`;
        
        const btnGroup = document.createElement("div");
        btnGroup.className = "btn-group";

        if (isAdmin) {
            // Botão de Renomear (Exclusivo Admin)
            const btnEdit = document.createElement("button");
            btnEdit.innerHTML = "✏️";
            btnEdit.className = "btn-move";
            btnEdit.onclick = () => renamePlayer(uid);
            btnGroup.appendChild(btnEdit);

            btnGroup.innerHTML += `
                <button class="btn-move" onclick="moveUp(${index})">⬆️</button>
                <select class="action-select" onchange="adminAction(${index}, this.value)">
                    <option disabled selected>...</option>
                    <option value="v1">V1</option>
                    <option value="v2">V2</option>
                    <option value="sair">Remover</option>
                </select>`;
        }
        li.appendChild(btnGroup);
        queueList.appendChild(li);
    });
}

function renderSlot(slot) {
    const uid = court[slot];
    const li = document.createElement("li");
    if (uid) {
        li.className = "court-item";
        const isMe = (myUID && uid === myUID) ? " (Você)" : "";
        li.innerHTML = `
            <div>🏐 <strong>Vaga ${slot}:</strong> ${getNick(uid)}${isMe}</div>
            <div class="score-board">
                <button class="btn-score scorekeeper-only" onclick="updateScore(${slot},-1)">-</button>
                <span class="score-value">${scores[slot]}</span>
                <button class="btn-score scorekeeper-only" onclick="updateScore(${slot},1)">+</button>
            </div>
            <div class="btn-group">
                ${isAdmin ? `<button class="btn-move" onclick="renamePlayer('${uid}')">✏️</button>` : ''}
                <button class="btn-action scorekeeper-only" onclick="playerLost(${slot})">Perdeu</button>
                <button class="btn-remove scorekeeper-only" onclick="removeFromSlot(${slot})">Sair</button>
            </div>`;
    } else {
        li.className = "slot-empty"; li.innerHTML = `Vaga ${slot}: Vazia`;
    }
    document.getElementById("courtList").appendChild(li);
}

// ==========================================
// 6. FUNÇÃO DE RENOMEAR (A MÁGICA DO ADMIN)
// ==========================================

function renamePlayer(uidOrName) {
    // Se for UID (usuário logado), altera no perfil global do banco
    // Se for string (convidado manual), altera direto na lista
    const newNick = prompt("Novo apelido fixo para este jogador:");
    if (!newNick || newNick.trim() === "") return;

    if (allProfiles[uidOrName]) {
        // Altera no banco de perfis (fica para sempre)
        profilesRef.child(uidOrName).update({ nickname: newNick.trim() });
    } else {
        // É um convidado manual, precisamos trocar o texto na fila/quadra
        if (court[1] === uidOrName) court[1] = newNick.trim();
        else if (court[2] === uidOrName) court[2] = newNick.trim();
        else {
            const idx = queue.indexOf(uidOrName);
            if (idx !== -1) queue[idx] = newNick.trim();
        }
        saveData();
    }
}

// ==========================================
// 7. AÇÕES GERAIS
// ==========================================

function updateFrictionlessUI() {
    const addGroup = document.getElementById("addPlayerGroup");
    const quickBtn = document.getElementById("quickJoinBtn");
    if (isAdmin) {
        addGroup.style.display = "flex"; quickBtn.style.display = "none";
    } else if (myUID) {
        addGroup.style.display = "none";
        quickBtn.style.display = "block";
        quickBtn.textContent = `👉 Entrar na Fila`;
    } else {
        addGroup.style.display = "none"; quickBtn.style.display = "none";
    }
}

document.getElementById("quickJoinBtn").onclick = () => {
    if (!myUID) return;
    if (court[1] === myUID || court[2] === myUID || queue.includes(myUID)) return alert("Já está na grade!");
    if (!court[1]) court[1] = myUID; else if (!court[2]) court[2] = myUID; else queue.push(myUID);
    saveData();
};

function addPlayer() {
    const input = document.getElementById("newPlayer");
    const name = input.value.trim();
    if (name) {
        if (!court[1]) court[1] = name; else if (!court[2]) court[2] = name; else queue.push(name);
        input.value = ""; saveData();
    }
}

// Admin Actions
function updateScore(s, c) { scores[s] += c; if (scores[s] < 0) scores[s] = 0; saveData(); }
function playerLost(s) { queue.push(court[s]); court[s] = null; scores = {1:0, 2:0}; if(queue.length > 0) court[s] = queue.shift(); saveData(); }
function removeFromSlot(s) { queue.push(court[s]); court[s] = null; scores = {1:0, 2:0}; saveData(); }
function adminAction(i, act) {
    const p = queue.splice(i, 1)[0];
    if (act === "v1") { if(court[1]) queue.push(court[1]); court[1] = p; }
    else if (act === "v2") { if(court[2]) queue.push(court[2]); court[2] = p; }
    scores = {1:0, 2:0}; saveData();
}
function moveUp(i) { if(i>0) { const t=queue[i]; queue[i]=queue[i-1]; queue[i-1]=t; saveData(); } }

// Inicialização
function selectLocal(l) { window.location.href = `?local=${l}`; }
function backToLobby() { window.location.href = window.location.pathname; }

document.getElementById("loginBtn").onclick = () => {
    if (isAdmin) { isAdmin = false; document.body.classList.remove("is-admin"); }
    else {
        const p = prompt("Senha Admin:");
        if (p === locaisPasswords[currentLocal]) { isAdmin = true; document.body.classList.add("is-admin"); }
    }
    updateFrictionlessUI(); render();
};

document.getElementById("resetBtn").onclick = () => { if(confirm("Zerar grade?")) { court={1:null, 2:null}; queue=[]; scores={1:0, 2:0}; saveData(); } };
document.getElementById("addBtn").onclick = addPlayer;
document.getElementById("newPlayer").onkeypress = (e) => { if(e.key === "Enter") addPlayer(); };

if (currentLocal) {
    document.getElementById("lobby-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    document.getElementById("parkNameDisplay").textContent = locaisNames[currentLocal];
    startDatabaseListener();
}