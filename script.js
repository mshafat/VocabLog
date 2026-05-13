// ভার্সন কোড নেম: SentVoc v4.3 - Stable (Audio Fix + ISO Date Export)
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let isReviewingMastered = false;
let iosAudioUnlocked = false; // আইফোন অডিও ট্র্যাকার

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare();

    // আইফোন অডিও গেটওয়ে আনলক করা (v2.4 লজিক)
    const unlockEvents = ['touchstart', 'click', 'keydown'];
    unlockEvents.forEach(event => {
        document.body.addEventListener(event, unlockIOSAudio, { once: true });
    });

    const inputArea = document.getElementById('note-input');
    if(inputArea) {
        inputArea.addEventListener('dblclick', handleSmartHighlight);
    }
};

function unlockIOSAudio() {
    if (iosAudioUnlocked) return;
    window.speechSynthesis.cancel();
    const silent = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(silent);
    iosAudioUnlocked = true;
    console.log("Audio Engine Unlocked for Mobile");
}

// --- অডিও ইঞ্জিন (v2.4 Hybrid: Cloud + System TTS) ---
function speakText(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const card = currentSessionCards[currentIndex];
    if (!card) return;
    
    const textToSpeak = isFlipped ? card.sentence : card.word;
    const langCode = document.getElementById('learn-lang').value;

    window.speechSynthesis.cancel();

    // Google Cloud TTS (Primary)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${langCode}&total=1&idx=0&textlen=${textToSpeak.length}&client=tw-ob`;
    
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = "anonymous";

    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Cloud TTS failed, using System TTS");
            // System TTS (Fallback for iOS/Linux)
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = langCode;
            utterance.rate = 0.85; 
            window.speechSynthesis.speak(utterance);
        });
    }
}

// --- সেটিংস ও শেয়ার লজিক ---
function toggleSettings() {
    const m = document.getElementById('settings-modal');
    if (!m) return;
    m.classList.toggle('hidden');
    m.classList.toggle('flex');
}

function handleIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    
    if (sharedText || sharedTitle) {
        let rawContent = (sharedText || "") + " " + (sharedTitle || "");
        let cleanText = decodeURIComponent(rawContent)
            .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') 
            .replace(/["'“”]/g, '') 
            .replace(/\+/g, ' ')
            .trim();

        const words = cleanText.split(/\s+/);
        const mid = Math.floor(words.length / 2);
        if(words.slice(0, mid).join(" ") === words.slice(mid).join(" ")) {
            cleanText = words.slice(0, mid).join(" ");
        }

        setTimeout(() => {
            const inputArea = document.getElementById('note-input');
            if (inputArea) inputArea.innerText = cleanText;
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
}

// --- কার্ড ডিসপ্লে (v4.0 Bold Look) ---
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

// --- মাস্টারড ও সেশন লজিক (v2.4) ---
function markAsLearned() {
    if(!confirm("আয়ত্ত করেছেন? এটি মাস্টারড লিস্টে চলে যাবে।")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input'); 
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

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

function startRepeat(mode) {
    currentSessionCards = [];
    isReviewingMastered = (mode === 'mastered');
    if (isReviewingMastered) {
        currentSessionCards = [...learnedWords];
    } else {
        const now = Date.now();
        Object.values(notes).forEach(day => {
            day.forEach(c => {
                if(learnedWords.some(l => l.id === c.id)) return;
                const age = now - (c.timestamp || 0);
                if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
                else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
                else if (mode === 'all') currentSessionCards.push(c);
            });
        });
    }
    if (currentSessionCards.length === 0) return alert("কোন কার্ড নেই!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    document.getElementById('mastered-btn').style.display = isReviewingMastered ? 'none' : 'block';
    showCard(); showSection('repeat');
}

// --- এক্সপোর্ট (ISO Date Name Fix) ---
function exportData() {
    const data = JSON.stringify({notes, learnedWords});
    const isoDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const fileName = `SentVoc_Backup_${isoDate}.json`;
    
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
}

// --- অন্যান্য ফাংশন ---
function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    if(s === 'learned') renderLearnedList();
    document.getElementById(s+'-view').classList.remove('hidden');
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("সেশন শেষ!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("প্রথমে শব্দটি হাইলাইট করুন!");
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("সেভ সফল হয়েছে!");
}

function handleSmartHighlight() {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.toString().trim() === "") return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4";
    span.innerText = sel.toString().trim();
    range.deleteContents();
    range.insertNode(span);
}

async function lookup(word) {
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    const sl = document.getElementById('learn-lang').value;
    const tl = document.getElementById('target-lang').value;
    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = wData[0][0][0];
    } catch (e) { console.error(e); }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    if(!lSel) return;
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
}

function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

function importData(e) { 
    const f = e.target.files[0]; if(!f)return; 
    const r = new FileReader(); r.onload = (ev) => { 
        try {
            const d = JSON.parse(ev.target.result); 
            localStorage.setItem('sentvoc_notes', JSON.stringify(d.notes || {})); 
            localStorage.setItem('sentvoc_learned', JSON.stringify(d.learnedWords || [])); 
            location.reload(); 
        } catch(e) { alert("Invalid File!"); }
    }; r.readAsText(f); 
}
