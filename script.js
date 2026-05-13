// SentVoc v4.6 - Final Script (Compatible with your HTML)
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

window.onload = () => {
    applyTheme();
    setupLanguages();
    showSection('input');
};

// --- সেটিংস বাটন সচল করার লজিক ---
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

// --- ডিকশনারি ও বাক্য অনুবাদ (টার্গেট ল্যাঙ্গুয়েজ সিঙ্ক) ---
async function lookup(word) {
    if (window.event) window.event.stopPropagation();
    document.getElementById('dict-modal').classList.replace('hidden', 'flex');
    
    document.getElementById('dict-word').innerText = word;
    document.getElementById('dict-meaning').innerText = "Translating...";
    document.getElementById('sentence-meaning').innerText = "...";

    const sl = document.getElementById('learn-lang').value;
    const tl = document.getElementById('target-lang').value; // সেটিংস থেকে টার্গেট ভাষা[cite: 1]
    const card = currentSessionCards[currentIndex];

    try {
        // শব্দের অর্থ
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-meaning').innerText = wData[0][0][0];

        // পুরো বাক্যের অনুবাদ[cite: 1]
        if(card && card.sentence) {
            const sRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(card.sentence)}`);
            const sData = await sRes.json();
            document.getElementById('sentence-meaning').innerText = sData[0][0][0];
        }
    } catch (e) {
        document.getElementById('dict-meaning').innerText = "Error!";
    }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

// --- কার্ড ইঞ্জিন (নীল টেক্সট ডিজাইন অক্ষুণ্ণ) ---
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    
    if (isFlipped) {
        content.className = "text-2xl font-bold text-slate-700 dark:text-slate-300 leading-snug text-center p-2";
        const regex = new RegExp(`(${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, "___MARK___$1___END___").split(/\s+/).map(p => {
            const clean = p.replace("___MARK___", "").replace("___END___", "").replace(/[.,!?।]/g, "");
            if (p.includes("___MARK___")) return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded font-black italic cursor-pointer" onclick="lookup('${clean}')">${p.replace("___MARK___", "").replace("___END___", "")}</mark>`;
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
    } else {
        content.innerText = card.word;
        content.className = "text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center";
    }
}

// --- হাইলাইট ও সেভ লজিক ---
function handleSelection() {
    const sel = window.getSelection();
    const tool = document.getElementById('bold-tool');
    if (sel.toString().trim().length > 0) tool.classList.remove('hidden');
    else tool.classList.add('hidden');
}

function makeBold() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline decoration-2 underline-offset-4";
    span.innerText = sel.toString().trim();
    range.deleteContents();
    range.insertNode(span);
    document.getElementById('bold-tool').classList.add('hidden');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Highlight a word first!");
    const date = new Date().toLocaleDateString();
    if (!notes[date]) notes[date] = [];
    words.forEach(w => {
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Saved!");
}

// --- অন্যান্য ফাংশন (v4.4 এর মতো) ---
function showSection(s) {
    document.getElementById('input-view').classList.add('hidden');
    document.getElementById('repeat-view').classList.add('hidden');
    document.getElementById('learned-view').classList.add('hidden');
    document.getElementById(s + '-view').classList.remove('hidden');
    if(s === 'learned') renderLearnedList();
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("Done!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function markAsLearned() {
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.map(lw => `
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm border-l-4 border-green-500 mb-3">
            <p class="font-black text-indigo-600 dark:text-indigo-400 uppercase text-lg">${lw.word}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${lw.sentence}</p>
        </div>
    `).join('');
}

function startRepeat(mode) {
    currentSessionCards = [];
    const allNotes = Object.values(notes).flat();
    if (mode === 'mastered') {
        currentSessionCards = [...learnedWords];
    } else {
        allNotes.forEach(c => {
            if(learnedWords.some(l => l.id === c.id)) return;
            const age = Date.now() - c.timestamp;
            if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
            else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
            else if (mode === 'all') currentSessionCards.push(c);
        });
    }
    if (currentSessionCards.length === 0) return alert("No cards!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    document.getElementById('mastered-btn').style.display = (mode === 'mastered') ? 'none' : 'block';
    showCard(); showSection('repeat');
}

function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => {
        lSel.add(new Option(n, c)); tSel.add(new Option(n, c));
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
    lSel.onchange = () => localStorage.setItem('pref_learn', lSel.value);
    tSel.onchange = () => localStorage.setItem('pref_target', tSel.value);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

function applyTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

function exportData() {
    const data = JSON.stringify({notes, learnedWords});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], {type: "application/json"}));
    a.download = `SentVoc_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const data = JSON.parse(ev.target.result);
        localStorage.setItem('sentvoc_notes', JSON.stringify(data.notes));
        localStorage.setItem('sentvoc_learned', JSON.stringify(data.learnedWords));
        location.reload();
    };
    reader.readAsText(e.target.files[0]);
}

function deleteCurrentCard() {
    if(!confirm("Delete?")) return;
    const id = currentSessionCards[currentIndex].id;
    for(let d in notes) notes[d] = notes[d].filter(n => n.id !== id);
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function speakText(event) {
    event.stopPropagation();
    const ut = new SpeechSynthesisUtterance(isFlipped ? currentSessionCards[currentIndex].sentence : currentSessionCards[currentIndex].word);
    ut.lang = document.getElementById('learn-lang').value;
    window.speechSynthesis.speak(ut);
}
