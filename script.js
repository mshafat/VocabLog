// ভার্সন কোড নেম: SentVoc v3.1 - Maximum Real Estate & Intelligent Scaling
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

window.onload = () => {
    applyTheme();
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
    
    const inputArea = document.getElementById('note-input');
    if(inputArea) inputArea.addEventListener('dblclick', handleSmartHighlight);
};

// --- উন্নত ডাইনামিক স্কেলিং লজিক (v3.1) ---
function getDynamicFontSize(text, type) {
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    
    if (type === 'word') {
        const isLatin = /^[A-Za-z0-9\s!@#$%^&*(),.?":{}|<>]+$/.test(text);
        let size = isLatin ? 2.5 : 3.5;
        if (charCount > 15) size *= 0.65;
        else if (charCount > 10) size *= 0.85;
        return size + "rem";
    } else {
        // বাক্যের জন্য নতুন স্কেলিং (v3.1 - বড় ফন্ট ধরে রাখার চেষ্টা)
        let size = 1.6; 
        let lineHeight = 1.4;

        if (wordCount > 60) {
            size = 1.0;
            lineHeight = 1.2;
        } else if (wordCount > 40) {
            size = 1.2;
            lineHeight = 1.3;
        } else if (wordCount > 25) {
            size = 1.4;
            lineHeight = 1.35;
        }
        return { size: size + "rem", lh: lineHeight };
    }
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
    // কার্ডের কন্টেইনার স্টাইল অ্যাডজাস্টমেন্ট (v3.1)
    content.style.wordBreak = "break-word";
    content.style.overflowWrap = "anywhere";
    content.style.width = "100%";
    content.style.padding = "0.5rem"; // চারপাশের প্যাডিং কমিয়ে জায়গা বাড়ানো হয়েছে

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
        
        // v3.1: কার্ডের উচ্চতা অনুযায়ী টেক্সট এলাইনমেন্ট
        content.className = "font-semibold text-slate-700 dark:text-slate-300 text-center flex items-center justify-center min-h-[250px] overflow-y-auto";
    } else {
        content.innerText = card.word;
        content.className = "font-black text-slate-800 dark:text-white uppercase text-center tracking-tight flex items-center justify-center min-h-[250px]";
        content.style.fontSize = getDynamicFontSize(card.word, 'word');
        content.style.lineHeight = "normal";
    }
}

// --- স্মার্ট হাইলাইট ---
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

// --- থিম ও সেটিংস ---
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
    applyTheme();
}

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    if(m) m.classList.toggle('hidden', !m.classList.contains('hidden')), m.classList.toggle('flex', m.classList.contains('hidden'));
}

// --- অডিও ইঞ্জিন ---
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

// --- বাকি কোর ফাংশন ---
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
