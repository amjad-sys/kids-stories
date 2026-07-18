const fs = require('fs');

const jsonPath = 'stories.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const story = data.stories.find(s => s.id === 'story-3');
if (story && story.parts) {
  // Check if part 11 already exists, remove it
  if (story.parts.length === 11 && story.parts[10].segments) {
    story.parts.pop();
  }

  const newPart = {
    segments: [],
    glossary: {}
  };

  story.parts.forEach(p => {
    // Only take the first 10 parts
    if (newPart.segments.length >= 10) return;

    newPart.segments.push({
      text: p.text,
      audio: p.audio
    });

    if (p.glossary) {
      Object.assign(newPart.glossary, p.glossary);
    }
  });

  story.parts.push(newPart);
  
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log("Added part 11 to story-3.");
} else {
  console.log("Could not find story-3.");
}
