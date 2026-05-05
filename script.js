const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('learned_words')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let isReviewingMastered = false;

// Theme Logic
function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

window.onload = () => {
    applyTheme();
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { lSel.add(new Option(n, c)); tSel.add(new Option(n, c)); });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
};

// Selection Logic
function handleSelection() {
    const sel = window.getSelection();
    const btn = document.getElementById('bold-tool');
    if (sel.toString().trim().length > 0) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
}

function makeBold() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4";
    range.surroundContents(span);
    window.getSelection().removeAllRanges();
    document.getElementById('bold-tool').classList.add('hidden');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = input.innerHTML;
    const words = tempDiv.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Select a word to highlight first!");
    
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        const target = w.innerText.trim();
        const sentence = tempDiv.innerText.trim();
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: target, sentence, id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Card saved!");
}

// Session Flow
function startRepeat(mode) {
    currentSessionCards = [];
    isReviewingMastered = (mode === 'mastered');
    
    if (isReviewingMastered) {
        currentSessionCards = [...learnedWords];
    } else {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        Object.values(notes).forEach(dayCards => {
            dayCards.forEach(card => {
                if(learnedWords.some(lw => lw.id === card.id)) return;
                const age = now - (card.timestamp || 0);
                if (mode === 'today' && age <= oneDay) currentSessionCards.push(card);
                else if (mode === 'week' && age <= oneWeek) currentSessionCards.push(card);
                else if (mode === 'all') currentSessionCards.push(card);
            });
        });
    }

    if (currentSessionCards.length === 0) return alert("No cards found!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    document.getElementById('mastered-btn').style.display = isReviewingMastered ? 'none' : 'block';
    showCard();
    showSection('repeat');
}

// Rendering Logic (FIX: Highlight word dictionary & flip prevention)
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;

    if (isFlipped) {
        const sentence = card.sentence;
        const safeWord = card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeWord})`, 'gi');
        
        const masked = sentence.replace(regex, "___MARK___$1___END___");
        const parts = masked.split(/\s+/);
        
        content.innerHTML = parts.map(p => {
            const cleanText = p.replace("___MARK___", "").replace("___END___", "");
            const dictionaryWord = cleanText.replace(/[.,!?।]/g, "");
            
            if (p.includes("___MARK___")) {
                // ADDED: onclick for Highlighted word to lookup without flipping
                return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 dark:text-white px-1 rounded font-bold italic cursor-pointer" onclick="lookup('${dictionaryWord}')">${cleanText}</mark>`;
            }
            return `<span class="cursor-pointer text-indigo-500 dark:text-indigo-400 hover:underline" onclick="lookup('${dictionaryWord}')">${p}</span>`;
        }).join(" ");
        
        content.className = "text-2xl font-semibold text-slate-700 dark:text-slate-300 leading-snug";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 dark:text-white tracking-tight uppercase";
    }
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("End of session!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function markAsLearned() {
    if(!confirm("Mastered?")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function deleteCurrentCard() {
    if (!confirm("Delete permanently?")) return;
    const cardId = currentSessionCards[currentIndex].id;
    for (let d in notes) notes[d] = notes[d].filter(c => c.id !== cardId);
    if (isReviewingMastered) learnedWords = learnedWords.filter(c => c.id !== cardId);
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex = 0; isFlipped = false; showCard(); }
}

// UI Controls
function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view, #settings-view').forEach(e => e.classList.add('hidden'));
    if(s==='learned') renderLearnedList();
    document.getElementById(s+'-view').classList.remove('hidden');
}

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400">List is empty.</p>' : '';
    [...learnedWords].reverse().forEach(lw => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm";
        div.innerHTML = `<p class="font-bold text-indigo-600 dark:text-indigo-400 text-lg">${lw.word}</p><p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${lw.sentence}</p>`;
        list.appendChild(div);
    });
}

async function lookup(word) {
    // CRITICAL: Stop propagation so flipCard() isn't triggered
    if (window.event) window.event.stopPropagation();
    
    const modal = document.getElementById('dict-modal');
    document.getElementById('dict-word').innerText = "Searching...";
    modal.classList.replace('hidden', 'flex');
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${document.getElementById('learn-lang').value}&tl=${document.getElementById('target-lang').value}&dt=t&q=${encodeURI(word)}`);
        const data = await res.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = data[0][0][0];
    } catch (e) { document.getElementById('dict-meaning').innerText = "Not found."; }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }
function toggleSettings() { document.getElementById('settings-view').classList.toggle('hidden'); }
function exportData() { const blob = new Blob([JSON.stringify({notes, learnedWords})], {type: "application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `VocabLog_Backup.json`; a.click(); }
function importData(e) { const f = e.target.files[0]; if(!f)return; const r = new FileReader(); r.onload = (ev) => { const d = JSON.parse(ev.target.result); localStorage.setItem('vocab_notes', JSON.stringify(d.notes)); localStorage.setItem('learned_words', JSON.stringify(d.learnedWords || [])); location.reload(); }; r.readAsText(f); }
