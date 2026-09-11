// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLl1CK7nLHcqnwMIF4wydUsEXfhKA82c4",
  authDomain: "gestor-de-notas-utfsm.firebaseapp.com",
  projectId: "gestor-de-notas-utfsm",
  storageBucket: "gestor-de-notas-utfsm.firebasestorage.app",
  messagingSenderId: "275919511835",
  appId: "1:275919511835:web:f2750b9b3a4adca3b7f3be"
};

// Inicializar Firebase (Versión 8 Compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const PASSING_GRADE = 55;
let appData = { subjects: {} };
let currentSubjectId = null;
let currentUser = null;

// TEMA OSCURO
const themeBtn = document.getElementById('theme-btn');
if (localStorage.getItem('theme') === 'dark') { document.body.classList.add('dark-mode'); themeBtn.textContent = '☀️'; }
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// AUTENTICACIÓN
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const emailInput = document.getElementById('email-input');
const passInput = document.getElementById('password-input');
const errorMsg = document.getElementById('auth-error');

document.getElementById('login-btn').addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passInput.value).catch(error => errorMsg.textContent = "Error: " + error.message);
});

document.getElementById('register-btn').addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passInput.value).catch(error => errorMsg.textContent = "Error: " + error.message);
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

// ESTADO DE SESIÓN Y CARGA DE DATOS DE LA NUBE
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-email').textContent = user.email;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        try {
            const docRef = db.collection('grades_data').doc(user.uid);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                appData = docSnap.data();
            } else {
                appData = { subjects: {} };
                await saveData(); 
            }
        } catch (error) {
            console.error("Error al cargar:", error);
            appData = { subjects: {} };
        }
        renderSidebar();
        document.getElementById('calculator-panel').classList.add('hidden');
        document.getElementById('subject-actions').classList.add('hidden');
        document.getElementById('current-subject-title').textContent = "Selecciona un ramo 🌸";
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        emailInput.value = "";
        passInput.value = "";
        errorMsg.textContent = "";
    }
});

async function saveData() { 
    if(currentUser) {
        try {
            await db.collection('grades_data').doc(currentUser.uid).set(appData);
        } catch(error) {
            console.error("Error al guardar en la nube: ", error);
        }
    }
}

// NAVEGACIÓN Y CRUD DE RAMOS
document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.remove('closed'));
document.getElementById('close-btn').addEventListener('click', () => document.getElementById('sidebar').classList.add('closed'));

document.getElementById('add-subject-btn').addEventListener('click', () => {
    const name = prompt("Nombre del ramo (Ej. MAT-071):");
    if (!name) return;
    const year = prompt("Año Académico (Ej. 2026):") || new Date().getFullYear().toString();
    const newId = Date.now().toString();
    appData.subjects[newId] = {
        id: newId, year, name, hasLab: false, labWeight: 20,
        theory: { certamenes: [{ id: Date.now(), name: "Certamen 1", grade: "", weight: 100 }], controlesWeight: 0, controles: [] },
        lab: { certamenes: [], controlesWeight: 100, controles: [] }
    };
    saveData(); renderSidebar(); loadSubject(newId);
});

document.getElementById('edit-subject-btn').addEventListener('click', () => {
    if(!currentSubjectId) return;
    const subject = appData.subjects[currentSubjectId];
    const newName = prompt("Editar nombre del ramo:", subject.name);
    if (newName !== null && newName.trim() !== "") subject.name = newName.trim();
    const newYear = prompt("Editar Año Académico:", subject.year);
    if (newYear !== null && newYear.trim() !== "") subject.year = newYear.trim();
    saveData(); renderSidebar(); document.getElementById('current-subject-title').textContent = subject.name;
});

document.getElementById('delete-subject-btn').addEventListener('click', () => {
    if(!currentSubjectId) return;
    const subject = appData.subjects[currentSubjectId];
    if(confirm(`¿Eliminar permanentemente el ramo "${subject.name}"?`)) {
        delete appData.subjects[currentSubjectId];
        currentSubjectId = null;
        saveData(); renderSidebar();
        document.getElementById('calculator-panel').classList.add('hidden');
        document.getElementById('subject-actions').classList.add('hidden');
        document.getElementById('current-subject-title').textContent = "Selecciona un ramo 🌸";
    }
});

function renderSidebar() {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    const years = {};
    Object.values(appData.subjects).forEach(sub => { if (!years[sub.year]) years[sub.year] = []; years[sub.year].push(sub); });
    const sortedYears = Object.keys(years).sort((a, b) => b.localeCompare(a));
    sortedYears.forEach(year => {
        const yearHeader = document.createElement('h3');
        yearHeader.textContent = `Año ${year}`;
        yearHeader.style.cssText = 'margin-top: 15px; font-size: 12px; color: var(--accent); text-transform: uppercase; font-weight: 700;';
        list.appendChild(yearHeader);
        years[year].forEach(sub => {
            const div = document.createElement('div');
            div.className = `subject-item ${sub.id === currentSubjectId ? 'active' : ''}`;
            div.textContent = sub.name;
            div.onclick = () => loadSubject(sub.id);
            list.appendChild(div);
        });
    });
}

function loadSubject(id) {
    currentSubjectId = id;
    const subject = appData.subjects[id];
    document.getElementById('current-subject-title').textContent = subject.name;
    document.getElementById('calculator-panel').classList.remove('hidden');
    document.getElementById('subject-actions').classList.remove('hidden');
    renderSidebar();

    const labToggle = document.getElementById('lab-toggle');
    labToggle.checked = subject.hasLab;
    document.getElementById('lab-weight-input').value = subject.labWeight;
    document.getElementById('theory-cert-count').value = subject.theory.certamenes.length;
    document.getElementById('theory-ctrl-count').value = subject.theory.controles.length;
    document.getElementById('theory-ctrl-weight').value = subject.theory.controlesWeight;
    document.getElementById('lab-cert-count').value = subject.lab.certamenes.length;
    document.getElementById('lab-ctrl-count').value = subject.lab.controles.length;
    document.getElementById('lab-ctrl-weight').value = subject.lab.controlesWeight;

    const toggleLabVisuals = () => {
        document.getElementById('lab-weight-container').classList.toggle('hidden', !subject.hasLab);
        document.getElementById('lab-module').classList.toggle('hidden', !subject.hasLab);
    };
    toggleLabVisuals();
    labToggle.onchange = (e) => { subject.hasLab = e.target.checked; toggleLabVisuals(); updateCalculations(); saveData(); };
    document.getElementById('lab-weight-input').onchange = (e) => { subject.labWeight = parseFloat(e.target.value) || 0; updateCalculations(); saveData(); };
    document.getElementById('theory-ctrl-weight').onchange = (e) => { subject.theory.controlesWeight = parseFloat(e.target.value) || 0; updateCalculations(); saveData(); };
    document.getElementById('lab-ctrl-weight').onchange = (e) => { subject.lab.controlesWeight = parseFloat(e.target.value) || 0; updateCalculations(); saveData(); };

    renderItemsList('theory', 'cert'); renderItemsList('theory', 'ctrl');
    renderItemsList('lab', 'cert'); renderItemsList('lab', 'ctrl');
    updateCalculations();
}

['theory', 'lab'].forEach(module => {
    ['cert', 'ctrl'].forEach(type => {
        document.getElementById(`${module}-${type}-count`).addEventListener('change', (e) => {
            const newCount = parseInt(e.target.value) || 0;
            const subject = appData.subjects[currentSubjectId];
            const listName = type === 'cert' ? 'certamenes' : 'controles';
            const list = subject[module][listName];
            while (list.length < newCount) list.push({ id: Date.now() + Math.random(), name: type === 'cert' ? `Certamen ${list.length + 1}` : `Control ${list.length + 1}`, grade: "", weight: type === 'cert' ? 0 : undefined });
            while (list.length > newCount) list.pop();
            renderItemsList(module, type); updateCalculations(); saveData();
        });
    });
});

function renderItemsList(module, type) {
    const subject = appData.subjects[currentSubjectId];
    const container = document.getElementById(`${module}-${type}-items`);
    const items = type === 'cert' ? subject[module].certamenes : subject[module].controles;
    container.innerHTML = '';
    items.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'evaluation-row';
        let gradeClass = item.grade !== "" ? (parseFloat(item.grade) >= PASSING_GRADE ? 'input-pass' : 'input-fail') : '';
        const weightInput = type === 'cert' ? `<input type="number" placeholder="%" value="${item.weight}" onchange="updateItem('${module}', '${type}', ${index}, 'weight', this.value)">` : '';
        row.innerHTML = `<input type="text" value="${item.name}" placeholder="Nombre" onchange="updateItem('${module}', '${type}', ${index}, 'name', this.value)"><input type="number" class="${gradeClass}" placeholder="Nota" value="${item.grade}" onchange="updateItem('${module}', '${type}', ${index}, 'grade', this.value)">${weightInput}`;
        container.appendChild(row);
    });
}

window.updateItem = (module, type, index, field, value) => {
    const items = type === 'cert' ? appData.subjects[currentSubjectId][module].certamenes : appData.subjects[currentSubjectId][module].controles;
    items[index][field] = field === 'name' ? value : (value === "" ? "" : parseFloat(value));
    updateCalculations(); renderItemsList(module, type); saveData();
};

function setColoredText(elementId, value, isNeeded = false) {
    const el = document.getElementById(elementId);
    if (value === '--' || isNaN(value)) { el.textContent = '--'; el.className = ''; return; }
    if (isNeeded) {
        if (value <= 0) { el.textContent = "¡Aprobado! 🎉"; el.className = 'text-pass'; }
        else if (value > 100) { el.textContent = "Imposible (" + value.toFixed(1) + ")"; el.className = 'text-fail'; }
        else { el.textContent = value.toFixed(1); el.className = 'text-fail'; }
    } else {
        el.textContent = value.toFixed(1); el.className = value >= PASSING_GRADE ? 'text-pass' : 'text-fail';
    }
}

function calculateModuleStats(moduleData) {
    let pointsEarned = 0, totalWeight = 0, missingWeight = 0;
    moduleData.certamenes.forEach(c => {
        const w = parseFloat(c.weight) || 0; totalWeight += w;
        if (c.grade !== "") pointsEarned += (parseFloat(c.grade) * (w / 100)); else missingWeight += w; 
    });
    const numCtrls = moduleData.controles.length;
    const ctrlTotalWeight = parseFloat(moduleData.controlesWeight) || 0;
    let ctrlSum = 0, missingCtrls = 0;
    moduleData.controles.forEach(c => { if (c.grade !== "") ctrlSum += parseFloat(c.grade); else missingCtrls++; });
    let ctrlAvg = 0;
    if (numCtrls > 0) {
        ctrlAvg = ctrlSum / numCtrls; totalWeight += ctrlTotalWeight;
        pointsEarned += ctrlAvg * (ctrlTotalWeight / 100);
        missingWeight += (missingCtrls / numCtrls) * ctrlTotalWeight;
    }
    const currentAvg = totalWeight > 0 ? (pointsEarned / (totalWeight / 100)) : 0;
    return { pointsEarned, totalWeight, missingWeight, ctrlAvg, currentAvg };
}

function updateCalculations() {
    if (!currentSubjectId) return;
    const subject = appData.subjects[currentSubjectId];
    
    const theoryStats = calculateModuleStats(subject.theory);
    setColoredText('theory-ctrl-avg', subject.theory.controles.length > 0 ? theoryStats.ctrlAvg : '--');
    
    const labStats = calculateModuleStats(subject.lab);
    if(subject.hasLab){
        setColoredText('lab-ctrl-avg', subject.lab.controles.length > 0 ? labStats.ctrlAvg : '--');
        setColoredText('lab-current-avg', labStats.totalWeight > 0 ? labStats.currentAvg : '--');
    }
    
    const theoryMultiplier = subject.hasLab ? (100 - subject.labWeight) / 100 : 1;
    const labMultiplier = subject.hasLab ? (subject.labWeight) / 100 : 0;
    
    const globalWeightTotal = (theoryStats.totalWeight * theoryMultiplier) + (subject.hasLab ? labStats.totalWeight * labMultiplier : 0);
    const globalPointsAcc = (theoryStats.pointsEarned * theoryMultiplier) + (subject.hasLab ? labStats.pointsEarned * labMultiplier : 0);
    
    const currentGlobalAvg = globalWeightTotal > 0 ? globalPointsAcc / (globalWeightTotal / 100) : 0;
    setColoredText('current-avg', globalWeightTotal > 0 ? currentGlobalAvg : '--');
    
    const missingGlobalWeight = (theoryStats.missingWeight * theoryMultiplier) + (subject.hasLab ? labStats.missingWeight * labMultiplier : 0);
    if (missingGlobalWeight > 0) {
        const puntosFaltantes = PASSING_GRADE - globalPointsAcc;
        const notaNecesaria = puntosFaltantes / (missingGlobalWeight / 100);
        setColoredText('needed-grade', notaNecesaria, true);
    } else {
        const elNeeded = document.getElementById('needed-grade');
        elNeeded.textContent = currentGlobalAvg >= PASSING_GRADE ? "¡Aprobado! 🎉" : "Reprobado 😿";
        elNeeded.className = currentGlobalAvg >= PASSING_GRADE ? "text-pass" : "text-fail";
    }
}
