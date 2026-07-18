const fs = require('fs');

const mdPath = 'assets/stories/story-5/gemini-code-1784351326024.md';
const mdContent = fs.readFileSync(mdPath, 'utf8');

const newStory = {
  id: "story-5",
  title: "The Fishing Trip",
  cover: "assets/stories/story-5/fishing_part1.jpeg",
  parts: []
};

const parts = mdContent.split(/## Part \d+/).slice(1); // the first element is title

parts.forEach((partText, index) => {
  const i = index + 1;
  const lines = partText.split('\n').map(l => l.trim()).filter(l => l);
  
  let englishLines = [];
  let arabicLines = [];
  let isArabic = false;

  for (let line of lines) {
    if (line.includes('**الترجمة:**') || line.includes('الترجمة:')) {
      isArabic = true;
      continue;
    }
    if (line === '---') continue;
    
    if (isArabic) {
      arabicLines.push(line);
    } else {
      englishLines.push(line);
    }
  }

  // Extract glossary from bold words
  const glossary = {};
  const enBolds = [];
  const arBolds = [];

  const enText = englishLines.join('\n');
  const arText = arabicLines.join('\n');

  // Regex to match **word**
  const boldRegex = /\*\*([^\*]+)\*\*/g;
  let match;
  while ((match = boldRegex.exec(enText)) !== null) {
    enBolds.push(match[1]);
  }
  while ((match = boldRegex.exec(arText)) !== null) {
    arBolds.push(match[1]);
  }

  // Map them sequentially if they match in length, but there could be parts without bold words
  for (let j = 0; j < Math.min(enBolds.length, arBolds.length); j++) {
    glossary[enBolds[j].toLowerCase()] = arBolds[j];
  }

  // Clean bold tags from text
  const cleanEnText = enText.replace(/\*\*/g, '');

  const partData = {
    image: `assets/stories/story-5/fishing_part${i}.jpeg`,
    text: cleanEnText,
    audio: `assets/stories/story-5/fishing_part${i}.wav`,
    glossary: Object.keys(glossary).length > 0 ? glossary : { "fishing": "صيد" } // fallback if empty
  };

  newStory.parts.push(partData);
});

const jsonPath = 'stories.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// remove story-5 if it already exists
data.stories = data.stories.filter(s => s.id !== 'story-5');
data.stories.push(newStory);

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
console.log("Added story-5 successfully.");
