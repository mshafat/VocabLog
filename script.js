// ভার্সন কোড নেম: SentVoc v5.0 - Settings Fixed & Final Stable
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let iosAudioUnlocked = false;

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare();

    const unlockEvents = ['touchstart', 'click', 'keydown'];
    unlockEvents.forEach(event => {
        document.body.addEventListener(event, unlockIOSAudio, { once: true });
    });

    const inputArea = document.getElementById('note-input');
    if(inputArea) {
        inputArea.addEventListener('dblclick', handleSmartHighlight);
    }
};

// --- সেটিংস ইঞ্জিন (v5.0 ফিক্স) ---
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        const isHidden = modal.classList.contains('hidden');
        if (isHidden) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        } else {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }
    }
}

// --- অডিও ইঞ্জিন ---
function unlockIOSAudio() {
    if (iosAudioUnlocked) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    iosAudioUnlocked = true;
}

function speakText(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const card = currentSessionCards[currentIndex];
    if (!card) return;
    const textToSpeak = isFlipped ? card.sentence : card.word;
    const langCode = document.getElementById('learn-lang').value;

    window.speechSynthesis.cancel();
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${langCode}&total=1&idx=0&textlen=${textToSpeak.length}&client=tw-ob`;
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.play().catch(() => {
        const ut = new SpeechSynthesisUtterance(textToSpeak);
        ut.lang = langCode;
        window.speechSynthesis.speak(ut);
    });
}

// --- ডিকশনারি ও বাক্য অনুবাদ (টার্গেট ল্যাঙ্গুয়েজ সিঙ্ক) ---
async function lookup(word) {
    if (window.event) window.event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    
    document.getElementById('dict-word').innerText = word;
    document.getElementById('dict-meaning').innerText = "অনুবাদ হচ্ছে...";
    document.getElementById('sentence-meaning').innerText = "...";

    const sl = document.getElementById('learn-lang').value;
    const tl = document.getElementById('target-lang').value;[cite: 1]
    const card = currentSessionCards[currentIndex];

    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-meaning').innerText = wData[0][0][0];

        if(card && card.sentence) {
            const sRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(card.sentence)}`);[cite: 1]
            const sData = await sRes.json();
            document.getElementById('sentence-meaning').innerText = sData[0][0][0];
        }
    } catch (e) {
        document.getElementById('dict-meaning').innerText = "Error!";
    }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

// --- কার্ড ডিসপ্লে ও লজিক ---
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    if(!content) return;

    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
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

// --- ডাটা এবং নেভিগেশন ---
function markAsLearned() {
    if(!confirm("আয়ত্ত করেছেন? এটি মাস্টারড লিস্টে চলে যাবে।")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input'); 
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function startRepeat(mode) {
    currentSessionCards = [];
    if (mode === 'mastered') {
        currentSessionCards = [...learnedWords];
    } else {
        Object.values(notes).flat().forEach(c => {
            if(learnedWords.some(l => l.id === c.id)) return;
            const age = Date.now() - c.timestamp;
            if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
            else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
            else if (mode === 'all') currentSessionCards.push(c);
        });
    }
    if (currentSessionCards.length === 0) return alert("কোন কার্ড নেই!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    const mBtn = document.getElementById('mastered-btn');
    if(mBtn) mBtn.style.display = (mode === 'mastered') ? 'none' : 'block';
    showCard(); showSection('repeat');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("শব্দটি হাইলাইট করুন!");
    const date = new Date().toLocaleDateString();
    if (!notes[date]) notes[date] = [];
    words.forEach(w => {
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("সেভ হয়েছে!");
}

function exportData() {
    const data = JSON.stringify({notes, learnedWords});
    const isoDate = new Date().toISOString().split('T')[0];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], {type: "application/json"}));
    a.download = `SentVoc_Backup_${isoDate}.json`;
    a.click();
}

function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    if(!lSel || !tSel) return;
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
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
    const icon = document.getElementById('theme-icon');
    if(icon) icon.innerText = isDark ? '☀️' : '🌙';
}

function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    if(s === 'learned') renderLearnedList();
    document.getElementById(s+'-view').classList.remove('hidden');
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("সেশন শেষ!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400 opacity-50">Mastered list empty.</p>' : '';
    [...learnedWords].reverse().forEach(lw => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-3 border-l-4 border-green-500";
        div.innerHTML = `<p class="font-black text-indigo-600 dark:text-indigo-400 uppercase text-lg">${lw.word}</p><p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${lw.sentence}</p>`;
        list.appendChild(div);
    });
}
