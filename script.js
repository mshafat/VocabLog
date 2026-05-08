const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let isReviewingMastered = false;

function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    const icon = document.getElementById('theme-icon');
    if(icon) icon.innerText = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

window.onload = () => {
    applyTheme();
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
    lSel.onchange = () => localStorage.setItem('pref_learn', lSel.value);
    tSel.onchange = () => localStorage.setItem('pref_target', tSel.value);
};

// --- উন্নত অডিও ফাংশন (লিনাক্স ও আইফোন ফিক্স) ---
function speakText(event) {
    if (event) event.stopPropagation(); 
    
    const card = currentSessionCards[currentIndex];
    const textToSpeak = isFlipped ? card.sentence : card.word;
    const langCode = document.getElementById('learn-lang').value;

    // ১. আগের সব সাউন্ড প্রসেস থামিয়ে দেওয়া
    window.speechSynthesis.cancel();

    // ২. গুগল টিটিএস এর সরাসরি অডিও ফাইল (গুগল ট্রান্সলেশন মেথড)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${langCode}&total=1&idx=0&textlen=${textToSpeak.length}&client=tw-ob`;
    
    const audio = new Audio();
    audio.src = url;
    // লিনাক্সে সিকিউরিটি এরর এড়াতে ক্রস অরিজিন এননিম্যাস করা হয়েছে
    audio.crossOrigin = "anonymous"; 

    // ৩. প্লে করার কমান্ড
    audio.play().then(() => {
        console.log("সাউন্ড বাজছে...");
    }).catch(err => {
        console.warn("গুগল টিটিএস ব্লক হয়েছে, সিস্টেম ভয়েস ট্রাই করছি...");
        // ৪. গুগল ব্লক করলে সিস্টেমের নিজস্ব ভয়েস দিয়ে চেষ্টা
        const ut = new SpeechSynthesisUtterance(textToSpeak);
        ut.lang = langCode;
        ut.rate = 0.9;
        window.speechSynthesis.speak(ut);
    });
}

// --- বাকি সব ফাংশন ---
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
    const temp = document.createElement('div');
    temp.innerHTML = input.innerHTML;
    const words = temp.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("প্রথমে শব্দটি হাইলাইট করুন!");
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: temp.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("সেভ করা হয়েছে!");
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
    if (currentSessionCards.length === 0) return alert("কোন কার্ড পাওয়া যায়নি!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    document.getElementById('mastered-btn').style.display = isReviewingMastered ? 'none' : 'block';
    showCard(); showSection('repeat');
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    if (isFlipped) {
        const regex = new RegExp(`(${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, "___MARK___$1___END___").split(/\s+/).map(p => {
            const clean = p.replace("___MARK___", "").replace("___END___", "").replace(/[.,!?।]/g, "");
            if (p.includes("___MARK___")) return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded font-bold italic cursor-pointer" onclick="lookup('${clean}')">${p.replace("___MARK___", "").replace("___END___", "")}</mark>`;
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
        content.className = "text-2xl font-semibold text-slate-700 dark:text-slate-300";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 dark:text-white uppercase";
    }
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("সেশন শেষ!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function markAsLearned() {
    if(!confirm("আয়ত্ত করা হয়েছে?")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input'); else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function deleteCurrentCard() {
    if (!confirm("মুছে ফেলবেন?")) return;
    const id = currentSessionCards[currentIndex].id;
    for (let d in notes) notes[d] = notes[d].filter(c => c.id !== id);
    learnedWords = learnedWords.filter(c => c.id !== id);
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input'); else { if(currentIndex >= currentSessionCards.length) currentIndex = 0; isFlipped = false; showCard(); }
}

function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    if(s==='learned') renderLearnedList();
    document.getElementById(s+'-view').classList.remove('hidden');
}

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400">এখনও কিছু শেখা হয়নি।</p>' : '';
    [...learnedWords].reverse().forEach(lw => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 shadow-sm mb-3";
        div.innerHTML = `<p class="font-bold text-indigo-600">${lw.word}</p><p class="text-sm text-slate-500">${lw.sentence}</p>`;
        list.appendChild(div);
    });
}

async function lookup(word) {
    if (window.event) window.event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    document.getElementById('dict-word').innerText = "অনুবাদ হচ্ছে...";
    modal.classList.replace('hidden', 'flex');
    const sl = document.getElementById('learn-lang').value;
    const tl = document.getElementById('target-lang').value;
    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        const sRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(currentSessionCards[currentIndex].sentence)}`);
        const sData = await sRes.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = wData[0][0][0];
        document.getElementById('sentence-meaning').innerText = sData[0][0][0];
    } catch (e) { document.getElementById('dict-meaning').innerText = "ত্রুটি"; }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    m.classList.contains('hidden') ? m.classList.replace('hidden', 'flex') : m.classList.replace('flex', 'hidden');
}

function exportData() { 
    const blob = new Blob([JSON.stringify({notes, learnedWords})], {type: "application/json"}); 
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); 
    a.download = `SentVoc_Backup.json`; a.click(); 
}

function importData(e) { 
    const f = e.target.files[0]; if(!f)return; 
    const r = new FileReader(); r.onload = (ev) => { 
        const d = JSON.parse(ev.target.result); 
        localStorage.setItem('sentvoc_notes', JSON.stringify(d.notes)); 
        localStorage.setItem('sentvoc_learned', JSON.stringify(d.learnedWords || [])); 
        location.reload(); 
    }; r.readAsText(f); 
}
