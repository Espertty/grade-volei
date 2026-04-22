// --- SISTEMA DE ROTEAMENTO (MULTITENANCY) ---
const urlParams = new URLSearchParams(window.location.search);
const currentLocal = urlParams.get('local'); 

const locaisNames = {
    'ramiro': 'Parque Ramiro Ruediger',
    'artex': 'Artex (Garcia)',
    'itoupavas': 'Parque das Itoupavas',
    'aguaverde': 'Terminal Água Verde'
};

// NOVO: Dicionário de senhas exclusivas para cada parque
const locaisPasswords = {
    'ramiro': 'ramiro123',
    'artex': 'artex123',
    'itoupavas': 'itoupavas123',
    'aguaverde': 'aguaverde123'
};

// --- DADOS DA QUADRA ---
let court = { 1: null, 2: null };
let scores = { 1: 0, 2: 0 }; 
let queue = [];
let hasAddedName = false; 

function loadData() {
    if (!currentLocal) return; 
    const storageKey = `voleiData_${currentLocal}`; 
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
        const parsed = JSON.parse(savedData);
        court = parsed.court || court;
        scores = parsed.scores || scores;
        queue = parsed.queue || queue;
        hasAddedName = parsed.hasAddedName || false;
    }
}

function saveData() {
    if (!currentLocal) return;
    const storageKey = `voleiData_${currentLocal}`;
    const dataToSave = { court, scores, queue, hasAddedName };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave)); 
}

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
    renderSlot(1);
    renderSlot(2);

    queue.forEach((player, index) => {
        const li = document.createElement("li");
        const nameSpan = document.createElement("span");
        nameSpan.innerHTML = `<strong>${index + 1}º</strong> - ${player}`;
        
        const btnGroup = document.createElement("div");
        btnGroup.className = "btn-group";
        
        const btnUp = document.createElement("button");
        btnUp.className = "btn-move admin-only";
        btnUp.innerHTML = "⬆️"; 
        btnUp.onclick = () => moveUp(index);
        if (index === 0) btnUp.style.display = "none"; 

        const btnDown = document.createElement("button");
        btnDown.className = "btn-move admin-only";
        btnDown.innerHTML = "⬇️";
        btnDown.onclick = () => moveDown(index);
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
            const acaoEscolhida = e.target.value;
            if (acaoEscolhida === "v1") forceEnter(index, 1);
            else if (acaoEscolhida === "v2") forceEnter(index, 2);
            else if (acaoEscolhida === "sair") removeManual(index);
        };

        btnGroup.appendChild(btnUp);
        btnGroup.appendChild(btnDown);
        btnGroup.appendChild(actionSelect); 
        
        li.appendChild(nameSpan);
        li.appendChild(btnGroup);
        queueList.appendChild(li);
    });
    saveData();
}

function renderSlot(slotNumber) {
    const li = document.createElement("li");
    const player = court[slotNumber];
    const currentScore = scores[slotNumber];

    if (player) {
        li.className = "court-item";
        
        const infoDiv = document.createElement("div");
        infoDiv.innerHTML = `<span>🏐 <strong>Vaga ${slotNumber}:</strong> ${player}</span>`;
        
        const scoreDiv = document.createElement("div");
        scoreDiv.className = "score-board";
        
        const btnMinus = document.createElement("button");
        btnMinus.className = "btn-score admin-only";
        btnMinus.textContent = "-";
        btnMinus.onclick = () => updateScore(slotNumber, -1);

        const scoreDisplay = document.createElement("span");
        scoreDisplay.id = `score-display-${slotNumber}`;
        scoreDisplay.className = "score-value";
        scoreDisplay.textContent = currentScore;

        const btnPlus = document.createElement("button");
        btnPlus.className = "btn-score admin-only";
        btnPlus.textContent = "+";
        btnPlus.onclick = () => updateScore(slotNumber, 1);

        scoreDiv.appendChild(btnMinus);
        scoreDiv.appendChild(scoreDisplay);
        scoreDiv.appendChild(btnPlus);

        const btnGroup = document.createElement("div");
        btnGroup.className = "btn-group";

        const btnLost = document.createElement("button");
        btnLost.className = "btn-action admin-only"; 
        btnLost.textContent = "Perdeu";
        btnLost.onclick = () => playerLost(slotNumber);

        const btnExit = document.createElement("button");
        btnExit.className = "btn-remove admin-only"; 
        btnExit.textContent = "Sair";
        btnExit.onclick = () => removeFromSlot(slotNumber);

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

function updateScore(slot, change) {
    scores[slot] += change;
    if (scores[slot] < 0) scores[slot] = 0;
    if (scores[slot] > 25) scores[slot] = 25;
    
    const display = document.getElementById(`score-display-${slot}`);
    if (display) {
        display.textContent = scores[slot];
    }
    saveData();
}

function addPlayer() {
    if (!isAdmin && hasAddedName) {
        alert("Você já adicionou um nome na fila. Aguarde sua vez!");
        return; 
    }

    const name = inputElement.value.trim();
    if (name) {
        if (!court[1]) court[1] = name;
        else if (!court[2]) court[2] = name;
        else queue.push(name);
        
        inputElement.value = "";
        if (!isAdmin) hasAddedName = true;
        render();
    }
}

function playerLost(slotNumber) {
    if (court[slotNumber]) {
        queue.push(court[slotNumber]); 
        court[slotNumber] = null;
        scores = { 1: 0, 2: 0 }; 
        if (queue.length > 0) court[slotNumber] = queue.shift();
        render();
    }
}

function removeFromSlot(slotNumber) {
    if (court[slotNumber]) {
        queue.push(court[slotNumber]);
        court[slotNumber] = null;
        scores = { 1: 0, 2: 0 }; 
        render();
    }
}

function forceEnter(queueIndex, slotNumber) {
    const player = queue.splice(queueIndex, 1)[0]; 
    if (court[slotNumber]) queue.push(court[slotNumber]);
    court[slotNumber] = player;
    scores = { 1: 0, 2: 0 }; 
    render();
}

function removeManual(index) {
    queue.splice(index, 1);
    render();
}

function moveUp(index) {
    if (index > 0) {
        const temp = queue[index];
        queue[index] = queue[index - 1];
        queue[index - 1] = temp;
        render();
    }
}

function moveDown(index) {
    if (index < queue.length - 1) {
        const temp = queue[index];
        queue[index] = queue[index + 1];
        queue[index + 1] = temp;
        render();
    }
}

function resetAll() {
    if (confirm("Tem certeza que deseja apagar a grade DESTE PARQUE?")) {
        court = { 1: null, 2: null };
        scores = { 1: 0, 2: 0 };
        queue = [];
        hasAddedName = false; 
        localStorage.removeItem(`voleiData_${currentLocal}`);
        render();
    }
}

addBtn.addEventListener("click", addPlayer);
inputElement.addEventListener("keypress", (e) => { if (e.key === "Enter") addPlayer(); });
resetBtn.addEventListener("click", resetAll);

if (resetScoreBtn) {
    resetScoreBtn.addEventListener("click", () => {
        if (confirm("Zerar o placar de ambas as vagas?")) {
            scores = { 1: 0, 2: 0 };
            render();
        }
    });
}

let isAdmin = false;
loginBtn.addEventListener("click", () => {
    if (isAdmin) {
        document.body.classList.remove("is-admin");
        isAdmin = false;
        loginBtn.textContent = "Área Admin";
    } else {
        if (!isOnline) {
            alert("Você precisa de internet para acessar o modo Admin.");
            return; 
        }
        
        // MUDANÇA AQUI: Mostra no prompt qual parque está pedindo a senha
        const nomeDoParqueAtual = locaisNames[currentLocal];
        const senha = prompt(`Digite a senha do administrador para o ${nomeDoParqueAtual}:`);
        
        // MUDANÇA AQUI: Checa a senha correta no dicionário usando o currentLocal
        const senhaCorretaDesteParque = locaisPasswords[currentLocal];

        if (senha === senhaCorretaDesteParque) {
            document.body.classList.add("is-admin");
            isAdmin = true;
            loginBtn.textContent = "Sair do Admin";
        } else {
            alert("Senha incorreta!");
        }
    }
});

// --- FUNÇÕES DO LOBBY ---
function selectLocal(localId) {
    window.location.href = `?local=${localId}`;
}

function backToLobby() {
    window.location.href = window.location.pathname; 
}

// --- SISTEMA HÍBRIDO: DETECÇÃO DE REDE ---
let isOnline = navigator.onLine; 
const statusIndicator = document.getElementById("connectionStatus");

function updateNetworkStatus() {
    if (isOnline) {
        statusIndicator.textContent = "🟢 Online";
        statusIndicator.style.color = "#2ed573";
        if (isAdmin) document.body.classList.add("is-admin");
        addBtn.disabled = false;
        inputElement.disabled = false;
        inputElement.placeholder = "Nome do jogador";
    } else {
        statusIndicator.textContent = "🔴 Offline";
        statusIndicator.style.color = "#ff4757";
        document.body.classList.remove("is-admin");
        addBtn.disabled = true;
        inputElement.disabled = true;
        inputElement.placeholder = "Sem conexão...";
    }
}

window.addEventListener("online", () => { isOnline = true; updateNetworkStatus(); });
window.addEventListener("offline", () => { isOnline = false; updateNetworkStatus(); });

// --- INICIALIZAÇÃO DO APP ---
function initApp() {
    const lobbyContainer = document.getElementById("lobby-container");
    const appContainer = document.getElementById("app-container");
    const parkNameDisplay = document.getElementById("parkNameDisplay");

    if (currentLocal && locaisNames[currentLocal]) {
        lobbyContainer.style.display = "none";
        appContainer.style.display = "block";
        parkNameDisplay.textContent = locaisNames[currentLocal]; 
        
        loadData();
        updateNetworkStatus();
        render();
    } else {
        lobbyContainer.style.display = "block";
        appContainer.style.display = "none";
    }
}

initApp();