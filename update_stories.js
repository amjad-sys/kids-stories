const fs = require('fs');

const partsData = [
  {
    image: "assets/stories/story-1/part3.jpeg",
    audio: "assets/stories/story-1/part3.mp3",
    text: "A few moments later, the ground beneath them began to shake slightly.\nThe red apples rolled off the picnic blanket and into the dirt.\nRand and Hammoudah stood up quickly, looking around in surprise.",
    glossary: {
      "ground": "أرض",
      "shake": "يَهتَز",
      "slightly": "قَليلاً",
      "rolled": "تَدَحرَج",
      "blanket": "بِطانيّة",
      "dirt": "تُراب",
      "stood": "وَقَف",
      "quickly": "بِسُرعَة",
      "surprise": "مُفاجَأَة"
    }
  },
  {
    image: "assets/stories/story-1/part4.jpeg",
    audio: "assets/stories/story-1/part4.mp3",
    text: "The friends looked up at the bright blue sky above the hills.\nA huge cloud of dark black smoke was slowly covering the sun.\nThe shadow of the smoke made the village look cold and scary.",
    glossary: {
      "bright": "ساطِع",
      "sky": "سَماء",
      "hills": "تِلال",
      "huge": "ضَخم",
      "cloud": "سَحابَة",
      "smoke": "دُخان",
      "covering": "يُغَطّي",
      "sun": "شَمس",
      "shadow": "ظِل",
      "cold": "بارِد",
      "scary": "مُخيف"
    }
  },
  {
    image: "assets/stories/story-1/part5.jpeg",
    audio: "assets/stories/story-1/part5.mp3",
    text: "Out of the thick smoke, giant metal robots slowly appeared.\nThey had glowing blue eyes and made loud mechanical noises.\nTheir heavy metal feet took big steps toward the peaceful village.",
    glossary: {
      "thick": "كَثيف",
      "giant": "عِملاق",
      "metal": "مَعدِن",
      "robots": "روبوتات",
      "appeared": "ظَهَرَ",
      "glowing": "مُتَوَهِّج",
      "eyes": "عُيون",
      "loud": "عالٍ",
      "noises": "أَصوات",
      "heavy": "ثَقيل",
      "feet": "أَقدام",
      "steps": "خَطَوات",
      "peaceful": "هادِئ"
    }
  },
  {
    image: "assets/stories/story-1/part6.jpeg",
    audio: "assets/stories/story-1/part6.mp3",
    text: "One angry robot walked close to the wooden village gate.\nIt slowly raised its big, heavy metal arm high in the air.\nThe machine wanted to smash the wooden fence into small pieces.",
    glossary: {
      "angry": "غاضِب",
      "walked": "مَشى",
      "close": "قَريب",
      "wooden": "خَشَبي",
      "gate": "بَوّابَة",
      "raised": "رَفَعَ",
      "arm": "ذِراع",
      "high": "عالِياً",
      "air": "هَواء",
      "machine": "آلَة",
      "wanted": "أَرادَ",
      "smash": "يُحَطِّم",
      "fence": "سِياج",
      "pieces": "قِطَع"
    }
  },
  {
    image: "assets/stories/story-1/part7.jpeg",
    audio: "assets/stories/story-1/part7.mp3",
    text: "Panda quickly jumped in front of the kids to protect them.\nHe stood tall and strong, ready to push the robot away.\nBeside him, Hammoudah bravely picked up a thick wooden stick from the ground.",
    glossary: {
      "jumped": "قَفَزَ",
      "front": "أَمام",
      "protect": "يَحمِي",
      "tall": "طَويل",
      "strong": "قَوِيّ",
      "ready": "مُستَعِدّ",
      "push": "يَدفَع",
      "beside": "بِجانِب",
      "bravely": "بِشَجاعَة",
      "picked": "التَقَطَ",
      "thick": "سَميك",
      "stick": "عَصا"
    }
  },
  {
    image: "assets/stories/story-1/part8.jpeg",
    audio: "assets/stories/story-1/part8.mp3",
    text: "Rand looked at the heavy robots and got a very smart idea.\nShe pointed her finger toward the wet, muddy swamp near the river.\n\"Let's make them walk into the deep mud!\" she shouted.",
    glossary: {
      "smart": "ذَكِيّ",
      "idea": "فِكرَة",
      "pointed": "أَشارَت",
      "finger": "إِصبَع",
      "toward": "نَحوَ",
      "wet": "مُبَلَّل",
      "muddy": "مُوحِل",
      "swamp": "مُستَنقَع",
      "near": "بِالقُربِ مِن",
      "river": "نَهر",
      "walk": "يَمشي",
      "deep": "عَميق",
      "mud": "طين",
      "shouted": "صَرَخَت"
    }
  },
  {
    image: "assets/stories/story-1/part9.jpeg",
    audio: "assets/stories/story-1/part9.mp3",
    text: "The silly seagull understood the plan and flew high into the air.\nIt stopped right in front of the giant robots' glowing blue eyes.\nThe brave bird flapped its wings and squawked as loudly as possible.",
    glossary: {
      "understood": "فَهِمَ",
      "plan": "خُطَّة",
      "flew": "طارَ",
      "stopped": "تَوَقَّفَ",
      "right": "مُباشَرَة",
      "brave": "شُجاع",
      "bird": "طائِر",
      "flapped": "رَفرَفَ",
      "wings": "أَجنِحَة",
      "squawked": "صاحَ",
      "possible": "مُمكِن"
    }
  },
  {
    image: "assets/stories/story-1/part10.jpeg",
    audio: "assets/stories/story-1/part10.mp3",
    text: "The giant robots became very angry at the noisy little bird.\nThey forgot about the village and started chasing the flying seagull.\nThey walked blindly, following the bird straight toward the wet swamp.",
    glossary: {
      "became": "أَصبَحوا",
      "noisy": "مُزعِج",
      "little": "صَغير",
      "forgot": "نَسوا",
      "about": "عَن",
      "chasing": "يُطارِدون",
      "flying": "طائِر",
      "blindly": "بِشَكلٍ أَعمى",
      "following": "يَتبَعونَ",
      "straight": "مُباشَرَة"
    }
  },
  {
    image: "assets/stories/story-1/part11.jpeg",
    audio: "assets/stories/story-1/part11.mp3",
    text: "Splash! The robots stepped directly into the deep, sticky mud.\nTheir heavy metal legs sank down quickly, right up to their knees.\nThe dirty mud entered their gears, making loud grinding sounds.",
    glossary: {
      "Splash": "طَرطَشَة",
      "stepped": "خَطَوا",
      "directly": "مُباشَرَة",
      "sticky": "لَزِج",
      "legs": "ساقان",
      "sank": "غاصَت",
      "knees": "رُكَب",
      "dirty": "مُتَّسِخ",
      "entered": "دَخَلَ",
      "gears": "تُروس",
      "making": "يُصدِر",
      "grinding": "طَحن",
      "sounds": "أَصوات"
    }
  },
  {
    image: "assets/stories/story-1/part12.jpeg",
    audio: "assets/stories/story-1/part12.mp3",
    text: "The machines completely stopped moving, trapped in the wet ground.\nThe village was finally safe from the scary metal monsters.\nRand, Hammoudah, Panda, and Bobby cheered happily together in the sun.",
    glossary: {
      "completely": "تَماماً",
      "stopped": "تَوَقَّفَت",
      "moving": "حَرَكَة",
      "trapped": "عالِقون",
      "finally": "أَخيراً",
      "safe": "آمِن",
      "monsters": "وُحوش",
      "cheered": "هَتَفوا",
      "happily": "بِسَعادَة",
      "together": "مَعاً"
    }
  }
];

const filePath = 'stories.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Assuming story-1 is the first one
const story = data.stories[0];
story.parts.push(...partsData);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log("Updated stories.json with new parts.");
