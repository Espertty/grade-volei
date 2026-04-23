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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ==========================================
// 2. VARIÁVEIS E ESTADO
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const currentLocal = urlParams.get('local'); 

const locaisNames = {
    'ramiro': 'Parque Ramiro Ruediger',
    'artex': 'Artex (Garcia)',
    'itoupavas': 'Parque das Itoupavas',
    'aguaverde': 'Terminal Água Verde'
};
const locaisPasswords = { 'ramiro': 'ramiro123', 'artex': 'artex123', 'itoupavas': 'itoupavas123', 'aguaverde': 'aguaverde123' };

const dbRef = database.ref('parques/' + currentLocal);

let court = { 1: null, 2: null };
let scores = { 1: 0, 2: 0 }; 
let queue = [];
let myPlayerName = null; 
let correctionCount = 0; 

// Elementos UI
const playerNameDisplay = document.getElementById("playerNameDisplay");
const identifyBtn = document.getElementById("identifyBtn");
const editIdentityBtn = document.getElementById("editIdentityBtn");
const addPlayerGroup = document.getElementById("addPlayerGroup");
const quickJoinBtn = document.getElementById("quickJoinBtn");

// ==========================================
// 3. ATUALIZAÇÃO INTELIGENTE DE INTERFACE
// ==========================================
function updateFrictionlessUI() {
    // Se o celular tem um dono definido E não for o Admin digitando pelos outros
    if (myPlayerName && !isAdmin) {
        addPlayerGroup.style.display = "none";
        quickJoinBtn.style.display = "block";
        quickJoinBtn.textContent = `👉 Entrar na Fila como ${myPlayerName}`;
    } else {
        addPlayerGroup.style.display = "flex";
        quickJoinBtn.style.display = "none";
    }
}

// ==========================================
// 4. FIREBASE E DADOS
// ==========================================
function startDatabaseListener() {
    if (!currentLocal) return; 

    const savedMyName = localStorage.getItem(`voleiMyName_${currentLocal}`);
    const savedCorrection = localStorage.getItem(`voleiCorrection_${currentLocal}`);
    if (savedCorrection) correctionCount = parseInt(savedCorrection, 10);

    if (savedMyName) {
        myPlayerName = savedMyName;
        playerNameDisplay.textContent = myPlayerName;
        identifyBtn.style.display = "none";
        editIdentityBtn.style.display = "inline-block"; 
    }

    updateFrictionlessUI();

    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            court = data.court || { 1: null, 2: null };
            scores = data.scores || { 1: 0, 2: 0 };
            queue = data.queue || [];
        } else {
            court = { 1: null, 2: null };
            scores = { 1: 0, 2: 0 };
            queue = [];
        }
        render(); 
    });
}

function saveData() {
    if (!currentLocal) return;
    dbRef.set({ court: court, scores: scores, queue: queue });
    if (myPlayerName) {
        localStorage.setItem(`voleiMyName_${currentLocal}`, myPlayerName);
        localStorage.setItem(`voleiCorrection_${currentLocal}`, correctionCount);
    }
}

// ==========================================
// 5. RENDERIZAÇÃO
// ==========================================
const courtList = document.getElementById("courtList");
const queueList = document.getElementById("queueList");
const inputElement = document.getElementById("newPlayer");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const loginBtn = document.getElementById("loginBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn"); 

function render() {
    courtList.innerHTML = "";
    queueList.innerHTML = "";
    
    if (queue.length > 0 && myPlayerName && queue[0].toLowerCase() === myPlayerName.toLowerCase() && !isAdmin) {
        document.body.classList.add("is-scorekeeper");
    } else {
        document.body.classList.remove("is-scorekeeper");
    }

    renderSlot(1);
    renderSlot(2);

    queue.forEach((player, index) => {
        const li = document.createElement("li");
        const nameSpan = document.createElement("span");
        const isMe = (myPlayerName && player.toLowerCase() === myPlayerName.toLowerCase()) ? " (Você)" : "";
        nameSpan.innerHTML = `<strong>${index + 1}º</strong> - ${player}${isMe}`;
        
        const btnGroup = document.createElement("div");
        btnGroup.className = "btn-group";
        
        const btnUp = document.createElement("button");
        btnUp.className = "btn-move admin-only";
        btnUp.innerHTML = "⬆️"; btnUp.onclick = () => moveUp(index);
        if (index === 0) btnUp.style.display = "none"; 

        const btnDown = document.createElement("button");
        btnDown.className = "btn-move admin-only";
        btnDown.innerHTML = "⬇️"; btnDown.onclick = () => moveDown(index);
        if (index === queue.length - 1) btnDown.style.display = "none"; 

        const actionSelect = document.createElement("select");
        actionSelect.className = "action-select admin-only";
        actionSelect.innerHTML = `
            <option value="" disabled selected>Ações...</option>
            <option value="v1">Ir p/ Vaga 1</option>
            <option value="v2">Ir p/ Vaga 2</option>
            <option value="sair">Sair da Fila</option>
        `;
        actionSelect.onchange = (e) => {
            if (e.target.value === "v1") forceEnter(index, 1);
            else if (e.target.value === "v2") forceEnter(index, 2);
            else if (e.target.value === "sair") removeManual(index);
        };

        btnGroup.appendChild(btnUp);
        btnGroup.appendChild(btnDown);
        btnGroup.appendChild(actionSelect); 
        li.appendChild(nameSpan);
        li.appendChild(btnGroup);
        queueList.appendChild(li);
    });
}

function renderSlot(slotNumber) {
    const li = document.createElement("li");
    const player = court[slotNumber];
    const currentScore = scores[slotNumber];

    if (player) {
        li.className = "court-item";
        const infoDiv = document.createElement("div");
        const isMe = (myPlayerName && player.toLowerCase() === myPlayerName.toLowerCase()) ? " (Você)" : "";
        infoDiv.innerHTML = `<span>🏐 <strong>Vaga ${slotNumber}:</strong> ${player}${isMe}</span>`;
        
        const scoreDiv = document.createElement("div");
        scoreDiv.className = "score-board";
        
        const btnMinus = document.createElement("button");
        btnMinus.className = "btn-score scorekeeper-only";
        btnMinus.textContent = "-"; btnMinus.onclick = () => updateScore(slotNumber, -1);

        const scoreDisplay = document.createElement("span");
        scoreDisplay.id = `score-display-${slotNumber}`;
        scoreDisplay.className = "score-value";
        scoreDisplay.textContent = currentScore;

        const btnPlus = document.createElement("button");
        btnPlus.className = "btn-score scorekeeper-only";
        btnPlus.textContent = "+"; btnPlus.onclick = () => updateScore(slotNumber, 1);

        scoreDiv.appendChild(btnMinus);
        scoreDiv.appendChild(scoreDisplay);
        scoreDiv.appendChild(btnPlus);

        const btnGroup = document.createElement("div");
        btnGroup.className = "btn-group";

        const btnLost = document.createElement("button");
        btnLost.className = "btn-action scorekeeper-only"; 
        btnLost.textContent = "Perdeu"; btnLost.onclick = () => playerLost(slotNumber);

        const btnExit = document.createElement("button");
        btnExit.className = "btn-remove scorekeeper-only"; 
        btnExit.textContent = "Sair"; btnExit.onclick = () => removeFromSlot(slotNumber);

        btnGroup.appendChild(btnLost);
        btnGroup.appendChild(btnExit);
        li.appendChild(infoDiv);
        li.appendChild(scoreDiv);
        li.appendChild(btnGroup);
    } else {
        li.className = "slot-empty";
        li.innerHTML = `<span>Vaga ${slotNumber}: Vazia</span>`;
    }
    courtList.appendChild(li);
}

// ==========================================
// 6. LÓGICA DE AÇÕES
// ==========================================
function updateScore(slot, change) {
    scores[slot] += change;
    if (scores[slot] < 0) scores[slot] = 0;
    if (scores[slot] > 25) scores[slot] = 25;
    saveData();
}

identifyBtn.addEventListener("click", () => {
    const nomeInput = prompt("Qual o seu nome na grade?");
    if (nomeInput && nomeInput.trim() !== "") {
        myPlayerName = nomeInput.trim();
        correctionCount = 0; 
        playerNameDisplay.textContent = myPlayerName;
        identifyBtn.style.display = "none";
        editIdentityBtn.style.display = "inline-block"; 
        updateFrictionlessUI();
        render();
        saveData();
    }
});

editIdentityBtn.addEventListener("click", () => {
    if (correctionCount === 0) {
        const novoNome = prompt(`Você tem 1 CORREÇÃO SEM PENALIDADE.\nCorrigir o nome "${myPlayerName}" para qual nome?`);
        if (novoNome && novoNome.trim() !== "" && novoNome.trim() !== myPlayerName) {
            const oldName = myPlayerName;
            myPlayerName = novoNome.trim();
            correctionCount++;

            if (court[1] && court[1].toLowerCase() === oldName.toLowerCase()) court[1] = myPlayerName;
            else if (court[2] && court[2].toLowerCase() === oldName.toLowerCase()) court[2] = myPlayerName;
            else {
                const qIndex = queue.findIndex(p => p.toLowerCase() === oldName.toLowerCase());
                if (qIndex !== -1) queue[qIndex] = myPlayerName;
            }
            playerNameDisplay.textContent = myPlayerName;
            updateFrictionlessUI();
            saveData();
            alert("Nome corrigido com sucesso!");
        }
    } else {
        if (confirm("⚠️ PENALIDADE: Se mudar o nome agora, irá para o FINAL DA FILA. Continuar?")) {
            const novoNome = prompt("Digite o novo nome:");
            if (novoNome && novoNome.trim() !== "" && novoNome.trim() !== myPlayerName) {
                const oldName = myPlayerName;
                myPlayerName = novoNome.trim();
                correctionCount++;

                let wasInCourt = false;
                if (court[1] && court[1].toLowerCase() === oldName.toLowerCase()) { court[1] = null; wasInCourt = true; }
                else if (court[2] && court[2].toLowerCase() === oldName.toLowerCase()) { court[2] = null; wasInCourt = true; }
                else {
                    const qIndex = queue.findIndex(p => p.toLowerCase() === oldName.toLowerCase());
                    if (qIndex !== -1) queue.splice(qIndex, 1); 
                }

                let innocentCount = queue.length;
                queue.push(myPlayerName);

                if (wasInCourt) {
                    scores = { 1: 0, 2: 0 };
                    if (!court[1] && innocentCount > 0) court[1] = queue.shift();
                    if (!court[2] && innocentCount > 0) court[2] = queue.shift();
                }
                playerNameDisplay.textContent = myPlayerName;
                updateFrictionlessUI();
                saveData();
                alert("Punição aplicada: Final da fila.");
            }
        }
    }
});

// Ação do novo botão de fricção zero
quickJoinBtn.addEventListener("click", () => {
    if (!myPlayerName) return;

    // Verifica se já está na quadra ou na fila para evitar duplicatas
    const lowerName = myPlayerName.toLowerCase();
    const inCourt = (court[1] && court[1].toLowerCase() === lowerName) || (court[2] && court[2].toLowerCase() === lowerName);
    const inQueue = queue.some(p => p.toLowerCase() === lowerName);

    if (inCourt || inQueue) {
        alert(`Você já está na grade! Aguarde a sua vez ou seu jogo acabar.`);
        return;
    }

    if (!court[1]) court[1] = myPlayerName;
    else if (!court[2]) court[2] = myPlayerName;
    else queue.push(myPlayerName);
    
    saveData();
});

function addPlayer() {
    const name = inputElement.value.trim();
    if (name) {
        if (!court[1]) court[1] = name;
        else if (!court[2]) court[2] = name;
        else queue.push(name);
        inputElement.value = "";
        
        if (!isAdmin) {
            myPlayerName = name;
            correctionCount = 0; 
            playerNameDisplay.textContent = myPlayerName;
            identifyBtn.style.display = "none"; 
            editIdentityBtn.style.display = "inline-block";
            updateFrictionlessUI();
        }
        saveData();
    }
}

function playerLost(slotNumber) {
    if (court[slotNumber]) {
        queue.push(court[slotNumber]); court[slotNumber] = null; scores = { 1: 0, 2: 0 }; 
        if (queue.length > 0) court[slotNumber] = queue.shift();
        saveData();
    }
}
function removeFromSlot(slotNumber) {
    if (court[slotNumber]) {
        queue.push(court[slotNumber]); court[slotNumber] = null; scores = { 1: 0, 2: 0 }; 
        saveData();
    }
}
function forceEnter(queueIndex, slotNumber) {
    const player = queue.splice(queueIndex, 1)[0]; 
    if (court[slotNumber]) queue.push(court[slotNumber]);
    court[slotNumber] = player; scores = { 1: 0, 2: 0 }; 
    saveData();
}
function removeManual(index) { queue.splice(index, 1); saveData(); }
function moveUp(index) { if (index > 0) { const temp = queue[index]; queue[index] = queue[index - 1]; queue[index - 1] = temp; saveData(); } }
function moveDown(index) { if (index < queue.length - 1) { const temp = queue[index]; queue[index] = queue[index + 1]; queue[index + 1] = temp; saveData(); } }

function resetAll() {
    if (confirm("Apagar grade DESTE PARQUE?")) {
        court = { 1: null, 2: null };
        scores = { 1: 0, 2: 0 };
        queue = [];
        
        // MUDANÇA AQUI: Removemos o código que apagava a sua identidade! 
        // O celular continua lembrando quem você é amanhã.
        
        saveData(); // Limpa a grade no Firebase
        alert("Grade zerada com sucesso!");
    }
}

addBtn.addEventListener("click", addPlayer);
inputElement.addEventListener("keypress", (e) => { if (e.key === "Enter") addPlayer(); });
resetBtn.addEventListener("click", resetAll);
if (resetScoreBtn) resetScoreBtn.addEventListener("click", () => { if (confirm("Zerar placares?")) { scores = { 1: 0, 2: 0 }; saveData(); } });

let isAdmin = false;
loginBtn.addEventListener("click", () => {
    if (isAdmin) {
        document.body.classList.remove("is-admin");
        isAdmin = false;
        loginBtn.textContent = "Área Admin";
        updateFrictionlessUI(); // Atualiza a UI se saiu do admin
        render();
    } else {
        const senha = prompt(`Senha para ${locaisNames[currentLocal]}:`);
        if (senha === locaisPasswords[currentLocal]) {
            document.body.classList.add("is-admin");
            isAdmin = true;
            loginBtn.textContent = "Sair do Admin";
            updateFrictionlessUI(); // Libera as caixas de texto pro admin
            render();
        } else {
            alert("Senha incorreta!");
        }
    }
});

function selectLocal(localId) { window.location.href = `?local=${localId}`; }
function backToLobby() { window.location.href = window.location.pathname; }

let isOnline = navigator.onLine; 
const statusIndicator = document.getElementById("connectionStatus");

function updateNetworkStatus() {
    if (isOnline) {
        statusIndicator.textContent = "🟢 Online"; statusIndicator.style.color = "#2ed573";
        addBtn.disabled = false; inputElement.disabled = false;
    } else {
        statusIndicator.textContent = "🔴 Offline"; statusIndicator.style.color = "#ff4757";
        addBtn.disabled = true; inputElement.disabled = true;
    }
}

window.addEventListener("online", () => { isOnline = true; updateNetworkStatus(); });
window.addEventListener("offline", () => { isOnline = false; updateNetworkStatus(); });

function initApp() {
    const lobbyContainer = document.getElementById("lobby-container");
    const appContainer = document.getElementById("app-container");
    const parkNameDisplay = document.getElementById("parkNameDisplay");

    if (currentLocal && locaisNames[currentLocal]) {
        lobbyContainer.style.display = "none";
        appContainer.style.display = "block";
        parkNameDisplay.textContent = locaisNames[currentLocal]; 
        startDatabaseListener();
        updateNetworkStatus();
    } else {
        lobbyContainer.style.display = "block";
        appContainer.style.display = "none";
    }
}

initApp();