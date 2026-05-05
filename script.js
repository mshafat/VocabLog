// ... (Existing variables: languages, notes, learnedWords, etc.) ...
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "fa": "Persian" };
let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('learned_words')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

window.onload = () => {
    const learnSelect = document.getElementById('learn-lang');
    const targetSelect = document.getElementById('target-lang');
    if(learnSelect && targetSelect) {
        Object.entries(languages).forEach(([code, name]) => {
            learnSelect.add(new Option(name, code));
            targetSelect.add(new Option(name, code));
        });
        learnSelect.value = localStorage.getItem('pref_learn') || "ur";
        targetSelect.value = localStorage.getItem('pref_target') || "bn";
    }
};

function handleSelection() {
    const input = document.getElementById('note-input');
    const boldTool = document.getElementById('bold-tool');
    const selectedText = input.value.substring(input.selectionStart, input.selectionEnd).trim();
    if (selectedText.length > 0) boldTool.classList.remove('hidden');
    else boldTool.classList.add('hidden');
}

function makeBold() {
    const input = document.getElementById('note-input');
    const start = input.selectionStart, end = input.selectionEnd, val = input.value;
    if (val.substring(start, end)) {
        input.value = val.substring(0, start) + `**${val.substring(start, end)}**` + val.substring(end);
        document.getElementById('bold-tool').classList.add('hidden');
    }
}

function showSection(s) {
    const sections = ['input-view', 'repeat-view', 'learned-view', 'settings-view'];
    sections.forEach(id => document.getElementById(id).classList.add('hidden'));
    if(s === 'learned') renderLearnedList();
    document.getElementById(s + '-view').classList.remove('hidden');
}

function toggleSettings() {
    const view = document.getElementById('settings-view');
    view.classList.toggle('hidden');
    localStorage.setItem('pref_learn', document.getElementById('learn-lang').value);
    localStorage.setItem('pref_target', document.getElementById('target-lang').value);
}

function saveNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) return;
    const regex = /\*\*(.*?)\*\*/g;
    let match, newEntries = [], date = new Date().toLocaleDateString();
    while ((match = regex.exec(text)) !== null) {
        newEntries.push({ word: match[1], sentence: text.replace(/\*\*/g, ""), date, id: Date.now() + Math.random() });
    }
    if (newEntries.length === 0) return alert("Bold a word first!");
    if (!notes[date]) notes[date] = [];
    notes[date].push(...newEntries);
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.value = "";
    document.getElementById('bold-tool').classList.add('hidden');
    alert("Saved!");
}

function startRepeat(range) {
    currentSessionCards = [];
    Object.values(notes).forEach(dayCards => {
        dayCards.forEach(card => {
            if(!learnedWords.some(lw => lw.id === card.id)) currentSessionCards.push(card);
        });
    });
    if (currentSessionCards.length === 0) return alert("No cards available!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    isFlipped = false;
    showCard();
    showSection('repeat');
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;

    if (isFlipped) {
        const words = card.sentence.split(/\s+/);
        content.innerHTML = words.map(w => `<span class="cursor-pointer text-indigo-500 px-0.5" onclick="lookup('${w.replace(/[.,!?]/g, "")}')">${w}</span>`).join(" ");
        content.className = "text-2xl font-semibold text-slate-700 leading-snug";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 tracking-tight uppercase";
    }
}

function flipCard() { isFlipped = !isFlipped; showCard(); }

function nextCard() {
    if (currentIndex < currentSessionCards.length - 1) {
        currentIndex++; isFlipped = false; showCard();
    } else {
        alert("Session Complete!"); showSection('input');
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--; isFlipped = false; showCard();
    }
}

function markAsLearned() {
    if(!confirm("Mark this word as mastered?")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function deleteCurrentCard() {
    if (!confirm("Delete this card permanently?")) return;
    const cardId = currentSessionCards[currentIndex].id;
    for (let d in notes) {
        notes[d] = notes[d].filter(c => c.id !== cardId);
        if (notes[d].length === 0) delete notes[d];
    }
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex = 0; isFlipped = false; showCard(); }
}

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400">Mastered list is empty.</p>' : '';
    learnedWords.forEach(lw => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-2xl border border-slate-100 shadow-sm";
        div.innerHTML = `<p class="font-bold text-indigo-600">${lw.word}</p><p class="text-xs text-slate-400 mt-1">${lw.sentence}</p>`;
        list.appendChild(div);
    });
}

async function lookup(word) {
    event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    document.getElementById('dict-word').innerText = "Searching...";
    document.getElementById('dict-meaning').innerText = "";
    modal.classList.replace('hidden', 'flex');
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${document.getElementById('learn-lang').value}&tl=${document.getElementById('target-lang').value}&dt=t&q=${encodeURI(word)}`);
        const data = await res.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = data[0][0][0];
    } catch (e) { document.getElementById('dict-meaning').innerText = "Error loading meaning."; }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

function exportData() {
    const data = { notes, learnedWords };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `VocabLog_Backup.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        if (data.notes && data.learnedWords) {
            localStorage.setItem('vocab_notes', JSON.stringify(data.notes));
            localStorage.setItem('learned_words', JSON.stringify(data.learnedWords));
            location.reload();
        }
    };
    reader.readAsText(file);
}
