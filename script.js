const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('learned_words')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let isReviewingMastered = false;

// Theme Initialization & Logic
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

// Highlighting Logic
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
    if (words.length === 0) return alert("Select a word to highlight!");
    
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        const target = w.innerText.trim();
        const sentence = tempDiv.innerText.trim();
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: target, sentence, id: Date.now() + Math.random() });
    });
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Saved!");
}

// Session Management
function startRepeat(mode) {
    currentSessionCards = [];
    isReviewingMastered = (mode === 'mastered');
    
    if (isReviewingMastered) {
        currentSessionCards = [...learnedWords];
    } else {
        Object.values(notes).forEach(dayCards => {
            dayCards.forEach(card => {
                if(!learnedWords.some(lw => lw.id === card.id)) currentSessionCards.push(card);
            });
        });
    }

    if (currentSessionCards.length === 0) return alert("No cards found!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    
    // Hide 'Mastered' button if we are already reviewing mastered cards
    document.getElementById('mastered-btn').style.display = isReviewingMastered ? 'none' : 'block';
    
    showCard();
    showSection('repeat');
}

// Rendering Logic (FIX: Resolves issues in Screenshot_20260506_001333.png)
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;

    if (isFlipped) {
        const sentence = card.sentence;
        const safeWord = card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeWord})`, 'gi');
        
        // Use unique markers to prevent HTML injection during split
        const maskedText = sentence.replace(regex, "___MARKER___$1___ENDMARKER___");
        const parts = maskedText.split(/\s+/);
        
        content.innerHTML = parts.map(p => {
            if (p.includes("___MARKER___")) {
                const wordOnly = p.replace("___MARKER___", "").replace("___ENDMARKER___", "");
                return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 dark:text-white px-1 rounded font-bold italic">${wordOnly}</mark>`;
            }
            const clean = p.replace(/[.,!?।]/g, "");
            return `<span class="cursor-pointer text-indigo-500 dark:text-indigo-400 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
        
        content.className = "text-2xl font-semibold text-slate-700 dark:text-slate-300 leading-snug";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 dark:text-white tracking-tight uppercase";
    }
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("Session complete!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function markAsLearned() {
    if(!confirm("Mark as mastered?")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function deleteCurrentCard() {
    if (!confirm("Delete this card permanently?")) return;
    const cardId = currentSessionCards[currentIndex].id;
    for (let d in notes) notes[d] = notes[d].filter(c => c.id !== cardId);
    if (isReviewingMastered) learnedWords = learnedWords.filter(c => c.id !== cardId);
    
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex = 0; isFlipped = false; showCard(); }
}

// Section Control
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

// API & Dictionary
async function lookup(word) {
    event.stopPropagation();
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
