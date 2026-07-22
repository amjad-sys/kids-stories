const fs = require('fs');

const data = JSON.parse(fs.readFileSync('stories.json', 'utf8'));
const story = data.stories.find(s => s.id === 'story-3');

const uniqueWords = new Set();
let totalWords = 0;
const combinedGlossary = new Set();

story.parts.forEach((part, idx) => {
  if (idx === 10) return; // skip part 11 since it's a compilation
  
  // Extract words from text
  const text = part.text || '';
  const words = text.toLowerCase().replace(/[.,!?;:'"()]/g, '').split(/\s+/).filter(w => w.length > 0);
  
  words.forEach(w => {
    uniqueWords.add(w);
    totalWords++;
  });
  
  if (part.glossary) {
    Object.keys(part.glossary).forEach(k => combinedGlossary.add(k.toLowerCase()));
  }
});

console.log(`Total words in story: ${totalWords}`);
console.log(`Unique words in text: ${uniqueWords.size}`);
console.log(`Unique words in glossary: ${combinedGlossary.size}`);
