// ভার্সন কোড নেম: SentVoc v4.0 - Import Fix & Double Text Cleaner
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

// সার্ভিস ওয়ার্কার রেজিস্ট্রেশন
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare();

    const inputArea = document.getElementById('note-input');
    if(inputArea) inputArea.addEventListener('dblclick', handleSmartHighlight);
};

// --- ডাবল টেক্সট, কোটেশন এবং URL ক্লিনার ---
function handleIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    
    if (sharedText || sharedTitle) {
        // যদি টাইটেল এবং টেক্সট একই হয় তবে একটা নিবে, নাহলে যোগ করবে
        let fullContent = (sharedTitle && sharedText && sharedTitle !== sharedText) 
            ? `${sharedTitle} ${sharedText}` 
            : (sharedText || sharedTitle);

        // ১. URL মোছা, ২. দুই পাশের কোটেশন (") মোছা, ৩. বাড়তি স্পেস মোছা
        let cleanText = decodeURIComponent(fullContent)
            .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') 
            .replace(/^["']|["']$/g, '') 
            .replace(/\+/g, ' ')
            .trim();
        
        setTimeout(() => {
            const inputArea = document.getElementById('note-input');
            if (inputArea) {
                inputArea.innerText = cleanText;
                // URL ক্লিন করা যাতে রিফ্রেশে বারবার না আসে
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
    }
}

// --- ডাটা ইমপোর্ট ফাংশন (Fix: এটি কাজ করছিল না) ---
function importData(e) { 
    const file = e.target.files[0]; 
    if(!file) return; 
    
    const reader = new FileReader(); 
    reader.onload = (event) => { 
        try {
            const data = JSON.parse(event.target.result); 
            // ডাটা ভ্যালিডেশন
            if(data.notes) {
                notes = data.notes;
                localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
            }
            if(data.learnedWords) {
                learnedWords = data.learnedWords;
                localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
            }
            alert("Data Imported Successfully!");
            location.reload(); 
        } catch (err) {
            alert("Invalid JSON file!");
        }
    }; 
    reader.readAsText(file); 
}

// --- এক্সপোর্ট ফাংশন (শেয়ার অপশন সহ) ---
async function exportData() {
    const data = JSON.stringify({notes, learnedWords}, null, 2);
    const fileName = `SentVoc_Backup_${new Date().toISOString().slice(0,10)}.json`;

    try {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'SentVoc Backup',
                files: [file]
            });
        } else {
            downloadFile(data, fileName);
        }
    } catch (err) {
        downloadFile(data, fileName);
    }
}

function downloadFile(content, name) {
    const blob = new Blob([content], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- মাস্টারড (Learned) লজিক ---
function markAsLearned() {
    const card = currentSessionCards[currentIndex];
    if (!learnedWords.some(w => w.id === card.id)) {
        learnedWords.push(card);
        localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
        alert("Mastered!");
        nextCard();
    }
}

// --- কার্ড ডিসপ্লে (v3.3 ম্যাক্সিমাম স্পেস) ---
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    if(!content) return;

    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
    content.style.padding = "2px 5px"; 
    content.style.wordBreak = "normal"; 
    content.style.overflowWrap = "break-word";

    if (isFlipped) {
        const style = getDynamicFontSize(card.sentence, 'sentence');
        content.style.fontSize = style.size;
        content.style.lineHeight = style.lh;

        const regex = new RegExp(`(${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, "___MARK___$1___END___").split(/\s+/).map(p => {
            const clean = p.replace("___MARK___", "").replace("___END___", "").replace(/[.,!?।]/g, "");
            if (p.includes("___MARK___")) return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded font-bold italic cursor-pointer" onclick="lookup('${clean}')">${p.replace("___MARK___", "").replace("___END___", "")}</mark>`;
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
        content.className = "font-semibold text-slate-700 dark:text-slate-300 text-center";
    } else {
        content.innerText = card.word;
        content.style.fontSize = getDynamicFontSize(card.word, 'word');
        content.className = "font-black text-slate-800 dark:text-white uppercase text-center tracking-tight pt-4";
    }
}

// --- ফন্ট সাইজ কন্ট্রোল ---
function getDynamicFontSize(text, type) {
    const wordCount = text.split(/\s+/).length;
    if (type === 'word') {
        const isLatin = /^[A-Za-z0-9\s!@#$%^&*(),.?":{}|<>]+$/.test(text);
        let size = isLatin ? 2.3 : 3.2; 
        if (text.length > 12) size *= 0.75;
        return size + "rem";
    } else {
        let size = 1.55; 
        let lineHeight = 1.45;
        if (wordCount > 55) { size = 1.05; lineHeight = 1.25; }
        else if (wordCount > 35) { size = 1.25; lineHeight = 1.35; }
        return { size: size + "rem", lh: lineHeight };
    }
}

// --- অন্যান্য সেটিংস ---
function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Double tap to highlight a word!");
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Saved!");
}

function startRepeat(mode) {
    currentSessionCards = [];
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
    if (currentSessionCards.length === 0) return alert("No cards!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    showCard(); showSection('repeat');
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    document.getElementById(s+'-view').classList.remove('hidden');
}

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

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    if(m) m.classList.toggle('hidden');
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme();
}

function handleSmartHighlight(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim() === "") return;
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) parent = parent.parentNode;

    if (parent.classList.contains('vocab-word')) {
        const textNode = document.createTextNode(parent.innerText);
        parent.parentNode.replaceChild(textNode, parent);
    } else {
        const span = document.createElement('span');
        span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4";
        span.innerText = selectedText;
        range.deleteContents();
        range.insertNode(span);
    }
    window.getSelection().removeAllRanges();
}

async function lookup(word) {
    if (window.event) window.event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    const sl = document.getElementById('learn-lang').value, tl = document.getElementById('target-lang').value;
    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = wData[0][0][0];
    } catch (e) { console.error(e); }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

function speakText(event) {
    if (event) event.stopPropagation();
    const card = currentSessionCards[currentIndex];
    const textToSpeak = isFlipped ? card.sentence : card.word;
    const langCode = document.getElementById('learn-lang').value;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
}
