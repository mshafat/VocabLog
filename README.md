## 📝 Project Description (README.md)

### **VocabLog v2.0 - A Smart Vocabulary Learning Tool**

**VocabLog** is a lightweight, web-based flashcard application designed for language learners who want to capture new words from context. Unlike traditional flashcard apps, VocabLog allows users to input full sentences, highlight a specific target word, and automatically creates interactive study cards.

#### **Core Features:**
* **Contextual Learning:** Save words within the sentences you found them in.
* **Smart Highlighting:** Integrated "Highlight Tool" to mark target words without manual HTML coding.
* **Interactive Flashcards:** Tap to flip cards and view the word in context.
* **Contextual Dictionary:** Click on *any* word (including the highlighted one) in a sentence to get instant translations via Google Translate API.
* **Spaced Review System:** Organize study sessions based on "Today", "This Week", or "All Time".
* **Mastery Tracking:** Move words to a "Mastered List" once learned and review them later with a dedicated random shuffle mode.
* **Privacy Focused:** All data is stored locally in the browser's `localStorage`. No server or login required.
* **Modern UI:** Beautifully designed with Tailwind CSS, featuring a responsive interface and a dedicated Dark Mode.
* **Backup & Sync:** Export your entire vocabulary library as a JSON file and import it on any device.

---

## 🏗 Data Structure

VocabLog uses two primary objects stored in the browser's `localStorage`. Both use the **JSON** format.

### **1. `vocab_notes`**
This object stores all active vocabulary cards, grouped by the date they were added.

**Structure:**
```json
{
  "DD/MM/YYYY": [
    {
      "id": "Number (Unique ID)",
      "word": "String (The highlighted vocabulary)",
      "sentence": "String (The full sentence for context)",
      "timestamp": "Number (Unix epoch time in milliseconds)"
    }
  ]
}
```

### **2. `learned_words`**
This is an array of objects containing words that the user has marked as "Mastered".

**Structure:**
```json
[
  {
    "id": "Number",
    "word": "String",
    "sentence": "String",
    "timestamp": "Number"
  }
]
```

### **3. Global Configuration (App Settings)**
The app also tracks user preferences for a personalized experience:

| Key | Value Type | Description |
| :--- | :--- | :--- |
| `theme` | `String` | Stores 'dark' or 'light' preference. |
| `pref_learn` | `String` | ISO Language code for the language being learned (e.g., 'ur'). |
| `pref_target` | `String` | ISO Language code for the user's native language (e.g., 'bn'). |

---

## 🛠 Tech Stack
* **Frontend:** HTML5, Tailwind CSS
* **Logic:** Vanilla JavaScript (ES6+)
* **Storage:** LocalStorage API
* **API:** Google Translate (via gtx fetch)

---

এটি আপনার GitHub বা অন্য কোনো প্ল্যাটফর্মে প্রজেক্টের বর্ণনা হিসেবে ব্যবহার করতে পারেন। ওপেন সোর্স করার সময় একটি **LICENSE** ফাইল (যেমন: MIT License) যোগ করতে ভুলবেন না! 

আপনার কি আর কোনো নির্দিষ্ট সেকশন (যেমন: Installation Guide) এর প্রয়োজন আছে?
