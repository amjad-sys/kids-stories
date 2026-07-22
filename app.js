/**
 * 📚 Kids Story Time — Application Logic
 * Handles story listing, reading, audio playback, word translation, and navigation.
 */

(function () {
  'use strict';

  // ── Detect which page we're on ──
  const isReaderPage = document.body.classList.contains('reader-body');

  // ══════════════════════════════════════════
  //  INDEX PAGE — Story Grid
  // ══════════════════════════════════════════
  if (!isReaderPage) {
    const grid = document.getElementById('stories-grid');
    const spinner = document.getElementById('loading-spinner');
    const emptyState = document.getElementById('empty-state');

    async function loadStories() {
      try {
        const res = await fetch('stories.json');
        if (!res.ok) throw new Error('Failed to load stories');
        const data = await res.json();
        renderStories(data.stories);
      } catch (err) {
        console.error('Error loading stories:', err);
        spinner.style.display = 'none';
        emptyState.style.display = 'flex';
      }
    }

    function renderStories(stories) {
      spinner.style.display = 'none';

      if (!stories || stories.length === 0) {
        emptyState.style.display = 'flex';
        return;
      }

      grid.innerHTML = '';
      stories.forEach(function (story, index) {
        var card = document.createElement('a');
        card.href = 'reader.html?story=' + story.id;
        card.className = 'story-card';
        card.style.animationDelay = (index * 0.1) + 's';

        card.innerHTML =
          '<div class="card-image-wrapper">' +
            '<img class="card-image" src="' + story.cover + '" alt="' + story.title + '" loading="lazy">' +
            '<div class="card-badge">' + story.parts.length + ' parts</div>' +
            '<div class="card-shimmer"></div>' +
          '</div>' +
          '<div class="card-body">' +
            '<h3 class="card-title">' + story.title + '</h3>' +
            '<p class="card-subtitle">Tap to read & listen 🎧</p>' +
          '</div>';

        grid.appendChild(card);
      });
    }

    loadStories();
    return;
  }

  // ══════════════════════════════════════════
  //  READER PAGE — Story Reader
  // ══════════════════════════════════════════

  // ── DOM references ──
  const storyTitle = document.getElementById('story-title');
  const partCounter = document.getElementById('part-counter');
  const partImage = document.getElementById('part-image');
  const partText = document.getElementById('part-text');
  const partDisplay = document.getElementById('part-display');
  const progressFill = document.getElementById('progress-fill');
  const partDots = document.getElementById('part-dots');

  // Audio elements
  const audioElement = document.getElementById('audio-element');
  // Navigation
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  // Completion
  const completionScreen = document.getElementById('completion-screen');
  const confettiContainer = document.getElementById('confetti-container');

  // Intro Video
  const introVideoOverlay = document.getElementById('intro-video-overlay');
  const introVideoElement = document.getElementById('intro-video-element');
  const skipVideoBtn = document.getElementById('skip-video-btn');
  const playVideoBtn = document.getElementById('play-video-btn');
  const readerContainer = document.getElementById('reader-container');

  // ── State ──
  let currentStory = null;
  let currentPartIndex = 0;
  let isPlaying = false;
  let currentGlossary = {};

  // ══════════════════════════════════════════
  //  GRAMMAR FLASHCARD DATA
  // ══════════════════════════════════════════
  const FLASHCARD_DATA = {
    'story-5': {
      4: { // Part 5 (index 4) — simple: brave
        rows: [
          { pronoun: 'I', css: 'i', sentence: 'I <strong>am</strong> brave.', translation: 'أنا شُجاع' },
          { pronoun: 'You', css: 'you', sentence: 'You <strong>are</strong> brave.', translation: 'أنتَ/أنتِ شُجاع/ة' },
          { pronoun: 'He', css: 'he', sentence: 'He <strong>is</strong> brave.', translation: 'هو شُجاع' },
          { pronoun: 'She', css: 'she', sentence: 'She <strong>is</strong> brave.', translation: 'هي شُجاعة' },
          { pronoun: 'We', css: 'we', sentence: 'We <strong>are</strong> brave.', translation: 'نحن شُجعان' },
          { pronoun: 'They', css: 'they', sentence: 'They <strong>are</strong> brave.', translation: 'هم شُجعان' },
          { pronoun: 'It 🐶', css: 'it', sentence: 'It <strong>is</strong> brave.', translation: 'هو/هي شُجاع/ة (لغير العاقل)' }
        ]
      },
      5: { // Part 6 (index 5) — simple: hungry
        rows: [
          { pronoun: 'I', css: 'i', sentence: 'I <strong>am</strong> hungry.', translation: 'أنا جائع' },
          { pronoun: 'You', css: 'you', sentence: 'You <strong>are</strong> hungry.', translation: 'أنتَ/أنتِ جائع/ة' },
          { pronoun: 'He', css: 'he', sentence: 'He <strong>is</strong> hungry.', translation: 'هو جائع' },
          { pronoun: 'She', css: 'she', sentence: 'She <strong>is</strong> hungry.', translation: 'هي جائعة' },
          { pronoun: 'We', css: 'we', sentence: 'We <strong>are</strong> hungry.', translation: 'نحن جائعون' },
          { pronoun: 'They', css: 'they', sentence: 'They <strong>are</strong> hungry.', translation: 'هم جائعون' },
          { pronoun: 'It 🐱', css: 'it', sentence: 'It <strong>is</strong> hungry.', translation: 'هو/هي جائع/ة' }
        ]
      },
      6: { // Part 7 (index 6) — two adjectives
        rows: [
          { pronoun: 'I', css: 'i', sentence: 'I <strong>am</strong> happy and safe.', translation: 'أنا سعيد وآمن' },
          { pronoun: 'You', css: 'you', sentence: 'You <strong>are</strong> happy and safe.', translation: 'أنتَ/أنتِ سعيد/ة وآمن/ة' },
          { pronoun: 'He', css: 'he', sentence: 'He <strong>is</strong> happy and safe.', translation: 'هو سعيد وآمن' },
          { pronoun: 'She', css: 'she', sentence: 'She <strong>is</strong> happy and safe.', translation: 'هي سعيدة وآمنة' },
          { pronoun: 'We', css: 'we', sentence: 'We <strong>are</strong> happy and safe.', translation: 'نحن سعداء وآمنون' },
          { pronoun: 'They', css: 'they', sentence: 'They <strong>are</strong> happy and safe.', translation: 'هم سعداء وآمنون' },
          { pronoun: 'It 🐦', css: 'it', sentence: 'It <strong>is</strong> happy and safe.', translation: 'هو/هي سعيد/ة وآمن/ة' }
        ]
      },
      7: { // Part 8 (index 7) — adjective + place
        rows: [
          { pronoun: 'I', css: 'i', sentence: 'I <strong>am</strong> tired at home.', translation: 'أنا تعبان في البيت' },
          { pronoun: 'You', css: 'you', sentence: 'You <strong>are</strong> tired at home.', translation: 'أنتَ تعبان' },
          { pronoun: 'He', css: 'he', sentence: 'He <strong>is</strong> tired at home.', translation: 'هو تعبان في البيت' },
          { pronoun: 'She', css: 'she', sentence: 'She <strong>is</strong> tired at home.', translation: 'هي تعبانة في البيت' },
          { pronoun: 'We', css: 'we', sentence: 'We <strong>are</strong> tired at home.', translation: 'نحن تعبانين' },
          { pronoun: 'They', css: 'they', sentence: 'They <strong>are</strong> tired at home.', translation: 'هم تعبانين' },
          { pronoun: 'It 🐠', css: 'it', sentence: 'It <strong>is</strong> tired at home.', translation: 'هو/هي تعبان/ة' }
        ]
      },
      8: { // Part 9 (index 8) — verb + object
        rows: [
          { pronoun: 'I', css: 'i', sentence: 'I <strong>want</strong> to drink water.', translation: 'أنا أريد أن أشرب ماء' },
          { pronoun: 'You', css: 'you', sentence: 'You <strong>want</strong> to drink water.', translation: 'أنتَ تريد' },
          { pronoun: 'He', css: 'he', sentence: 'He <strong>wants</strong> to drink water.', translation: 'هو يريد أن يشرب ماء' },
          { pronoun: 'She', css: 'she', sentence: 'She <strong>wants</strong> to drink water.', translation: 'هي تريد أن تشرب ماء' },
          { pronoun: 'We', css: 'we', sentence: 'We <strong>want</strong> to drink water.', translation: 'نحن نريد' },
          { pronoun: 'They', css: 'they', sentence: 'They <strong>want</strong> to drink water.', translation: 'هم يريدون' },
          { pronoun: 'It 🐸', css: 'it', sentence: 'It <strong>wants</strong> to drink water.', translation: 'هو/هي يريد/تريد' }
        ]
      },
      9: { // Part 10 (index 9) — verb + place
        rows: [
          { pronoun: 'I', css: 'i', sentence: 'I <strong>like</strong> to go to the beach.', translation: 'أنا أحب الذهاب للشاطئ' },
          { pronoun: 'You', css: 'you', sentence: 'You <strong>like</strong> to go to the beach.', translation: 'أنتَ تحب' },
          { pronoun: 'He', css: 'he', sentence: 'He <strong>likes</strong> to go to the beach.', translation: 'هو يحب الذهاب للشاطئ' },
          { pronoun: 'She', css: 'she', sentence: 'She <strong>likes</strong> to go to the beach.', translation: 'هي تحب الذهاب' },
          { pronoun: 'We', css: 'we', sentence: 'We <strong>like</strong> to go to the beach.', translation: 'نحن نحب' },
          { pronoun: 'They', css: 'they', sentence: 'They <strong>like</strong> to go to the beach.', translation: 'هم يحبون' },
          { pronoun: 'It 🐵', css: 'it', sentence: 'It <strong>likes</strong> to go to the beach.', translation: 'هو/هي يحب/تحب' }
        ]
      }
    }
  };

  // ── Flashcard DOM ──
  const flashcardOverlay = document.getElementById('flashcard-overlay');
  const flashcardClose = document.getElementById('flashcard-close');
  const flashcardTitle = document.getElementById('flashcard-title');
  const flashcardRows = document.getElementById('flashcard-rows');

  if (flashcardClose) {
    flashcardClose.addEventListener('click', function() {
      flashcardOverlay.classList.add('hidden');
    });
  }
  // Also close if clicking outside the card
  if (flashcardOverlay) {
    flashcardOverlay.addEventListener('click', function(e) {
      if (e.target === flashcardOverlay) {
        flashcardOverlay.classList.add('hidden');
      }
    });
  }

  function showFlashcard(storyId, partIndex) {
    var storyCards = FLASHCARD_DATA[storyId];
    if (!storyCards) return false;
    var card = storyCards[partIndex];
    if (!card) return false;

    flashcardRows.innerHTML = '';
    card.rows.forEach(function(row) {
      var div = document.createElement('div');
      div.className = 'flashcard-row';
      div.innerHTML =
        '<span class="flashcard-pronoun flashcard-pronoun-' + row.css + '">' + row.pronoun + '</span>' +
        '<span class="flashcard-sentence">' + row.sentence + '</span>' +
        '<span class="flashcard-translation">' + row.translation + '</span>';
      flashcardRows.appendChild(div);
    });

    flashcardOverlay.classList.remove('hidden');
    return true;
  }

  // ── Get story ID from URL ──
  const urlParams = new URLSearchParams(window.location.search);
  const storyId = urlParams.get('story');

  if (!storyId) {
    window.location.href = 'home.html';
    return;
  }

  // ══════════════════════════════════════════
  //  WORD TRANSLATION TOOLTIP
  // ══════════════════════════════════════════

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'word-tooltip';
  tooltip.innerHTML = '<span class="tooltip-word"></span><button class="tooltip-speak-btn" type="button">🔊</button><span class="tooltip-meaning"></span>';
  document.body.appendChild(tooltip);

  // Speaker button re-speaks the word
  tooltip.querySelector('.tooltip-speak-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    var word = tooltip.querySelector('.tooltip-word').textContent;
    if (word) speakWord(word);
  });

  let tooltipTimeout = null;

  function showTooltip(wordEl, word, meaning) {
    var tooltipWord = tooltip.querySelector('.tooltip-word');
    var tooltipMeaning = tooltip.querySelector('.tooltip-meaning');

    tooltipWord.textContent = word;
    tooltipMeaning.textContent = meaning;

    // Speak the word in English
    speakWord(word);

    // Position tooltip above the word
    var rect = wordEl.getBoundingClientRect();
    var tooltipWidth = 200; // estimated
    var left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    var top = rect.top - 70;

    // Keep tooltip on screen
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10;
    if (top < 10) {
      top = rect.bottom + 10; // show below if no space above
      tooltip.classList.add('tooltip-below');
    } else {
      tooltip.classList.remove('tooltip-below');
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('visible');

    // Highlight the tapped word
    document.querySelectorAll('.word.highlighted').forEach(function (el) {
      el.classList.remove('highlighted');
    });
    wordEl.classList.add('highlighted');

    // Auto-hide after 3 seconds
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(function () {
      hideTooltip();
    }, 3000);
  }

  // ── Speak word using Web Speech API ──
  function speakWord(word) {
    if (!('speechSynthesis' in window)) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;  // slightly slower for kids
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a good English voice
    var voices = window.speechSynthesis.getVoices();
    var englishVoice = voices.find(function(v) {
      return v.lang.startsWith('en') && v.name.includes('Samantha');
    }) || voices.find(function(v) {
      return v.lang.startsWith('en-US');
    }) || voices.find(function(v) {
      return v.lang.startsWith('en');
    });

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // Preload voices (some browsers need this)
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function() {
      window.speechSynthesis.getVoices();
    };
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
    document.querySelectorAll('.word.highlighted').forEach(function (el) {
      el.classList.remove('highlighted');
    });
    clearTimeout(tooltipTimeout);
  }

  // Hide tooltip when tapping elsewhere
  document.addEventListener('click', function (e) {
    if (!e.target.classList.contains('word') && !tooltip.contains(e.target)) {
      hideTooltip();
    }
  });

  // ── Make words clickable ──
  function renderTextWithWords(text, glossary) {
    currentGlossary = glossary || {};

    var lines = text.split('\n');
    lines.forEach(function (line) {
      var p = document.createElement('p');
      p.className = 'story-line';

      // Split line into words and punctuation
      var tokens = line.split(/(\s+)/);
      tokens.forEach(function (token) {
        if (token.trim() === '') {
          p.appendChild(document.createTextNode(token));
          return;
        }

        // Clean the word for lookup (remove punctuation)
        var cleanWord = token.replace(/[.,!?;:'"()]/g, '').toLowerCase();
        var meaning = currentGlossary[cleanWord];

        var span = document.createElement('span');
        span.textContent = token;

        if (meaning) {
          span.className = 'word has-meaning';
          span.dataset.word = cleanWord;
          span.dataset.meaning = meaning;
          span.addEventListener('click', function (e) {
            e.stopPropagation();
            showTooltip(this, this.dataset.word, this.dataset.meaning);
          });
        } else {
          span.className = 'word';
        }

        p.appendChild(span);
      });

      partText.appendChild(p);
    });
  }

  // ── Load story data ──
  async function loadStory() {
    try {
      const res = await fetch('stories.json');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      currentStory = data.stories.find(function (s) { return s.id === storyId; });

      if (!currentStory) {
        window.location.href = 'home.html';
        return;
      }

      // Filter out hidden parts from Firebase.
      // ponytail: this mirrors filterVisibleParts() in visibility-core.js (the
      // property-tested source of truth for the "!== false means visible" rule).
      // Kept inline here because app.js is a classic IIFE (top-level returns),
      // not an ES module that can import the core.
      if (typeof db !== 'undefined') {
        try {
          const snapshot = await db.ref('settings/visibility').once('value');
          const visibility = snapshot.val() || {};
          currentStory.parts = currentStory.parts.filter(function (part, index) {
            var key = currentStory.id + '_part' + (index + 1);
            return visibility[key] !== false;
          });
        } catch (e) {
          console.log('Visibility check skipped:', e);
        }
      }

      if (currentStory.parts.length === 0) {
        window.location.href = 'home.html';
        return;
      }

      document.title = '📖 ' + currentStory.title + ' — Story Time';
      storyTitle.textContent = currentStory.title;

      buildDots();

      // Restore saved part index from sessionStorage
      var savedPart = sessionStorage.getItem('currentPart_' + storyId);
      var startIndex = savedPart ? parseInt(savedPart) : 0;
      if (startIndex >= currentStory.parts.length) startIndex = 0;
      
      if (currentStory.introVideo && !savedPart) {
        playIntroVideo(currentStory.introVideo, function() {
          readerContainer.classList.remove('hidden');
          showPart(startIndex, 'none');
        });
      } else {
        readerContainer.classList.remove('hidden');
        showPart(startIndex, 'none');
      }
    } catch (err) {
      console.error('Error loading story:', err);
      window.location.href = 'home.html';
    }
  }

  // ── Play Intro Video ──
  function playIntroVideo(videoSrc, onComplete) {
    introVideoOverlay.classList.remove('hidden');
    introVideoElement.src = videoSrc;
    
    let videoFinished = false;
    let fallbackTimeout;
    
    function finishVideo() {
      if (videoFinished) return;
      videoFinished = true;
      clearTimeout(fallbackTimeout);
      introVideoElement.pause();
      introVideoOverlay.classList.add('hidden');
      onComplete();
    }

    skipVideoBtn.addEventListener('click', finishVideo);
    introVideoElement.addEventListener('ended', finishVideo);
    
    // Play the video
    let playPromise = introVideoElement.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Autoplay started successfully
        // Set a fallback timeout for 10 seconds (in case 'ended' doesn't fire or user wants strict 10s)
        fallbackTimeout = setTimeout(finishVideo, 10000);
      }).catch(error => {
        // Autoplay was prevented
        playVideoBtn.classList.remove('hidden');
        playVideoBtn.addEventListener('click', function() {
          playVideoBtn.classList.add('hidden');
          introVideoElement.play();
          fallbackTimeout = setTimeout(finishVideo, 10000);
        });
      });
    } else {
      fallbackTimeout = setTimeout(finishVideo, 10000);
    }
  }

  // ── Build progress dots ──
  function buildDots() {
    partDots.innerHTML = '';
    for (var i = 0; i < currentStory.parts.length; i++) {
      var dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Part ' + (i + 1));
      dot.dataset.index = i;
      dot.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        var dir = idx > currentPartIndex ? 'right' : 'left';
        showPart(idx, dir);
      });
      partDots.appendChild(dot);
    }
  }

  // ── Show a specific part ──
  function showPart(index, direction) {
    if (!currentStory || index < 0 || index >= currentStory.parts.length) return;

    stopAudio();
    hideTooltip();

    var part = currentStory.parts[index];

    // Show grammar flashcard if available for this part
    showFlashcard(storyId, index);

    // If this part has a video, play it first
    if (part.video) {
      currentPartIndex = index;
      readerContainer.classList.add('hidden');
      playIntroVideo(part.video, function() {
        readerContainer.classList.remove('hidden');
        displayPartContent(part, index, 'none');
      });
      return;
    }

    displayPartContent(part, index, direction);
  }

  function displayPartContent(part, index, direction) {
    if (direction !== 'none') {
      var exitClass = direction === 'right' ? 'slide-out-left' : 'slide-out-right';
      var enterClass = direction === 'right' ? 'slide-in-right' : 'slide-in-left';

      partDisplay.classList.add(exitClass);

      setTimeout(function () {
        updatePartContent(part, index);
        partDisplay.classList.remove(exitClass);
        partDisplay.classList.add(enterClass);

        setTimeout(function () {
          partDisplay.classList.remove(enterClass);
        }, 400);
      }, 300);
    } else {
      partDisplay.classList.add('fade-in');
      updatePartContent(part, index);
      setTimeout(function () {
        partDisplay.classList.remove('fade-in');
      }, 500);
    }

    currentPartIndex = index;

    // Save current part to sessionStorage
    sessionStorage.setItem('currentPart_' + storyId, index);

    // Update navigation
    prevBtn.disabled = index === 0;
    if (index === currentStory.parts.length - 1) {
      nextBtn.innerHTML = '<span>Finish</span> <span style="font-size:1.2em">🎉</span>';
    } else {
      nextBtn.innerHTML = '<span>Next</span>' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>';
    }

    // Update progress
    var progress = ((index + 1) / currentStory.parts.length) * 100;
    progressFill.style.width = progress + '%';

    // Update dots
    var dots = partDots.querySelectorAll('.dot');
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === index);
      d.classList.toggle('completed', i < index);
    });
  }

  function updatePartContent(part, index) {
    partCounter.textContent = 'Part ' + (index + 1) + ' of ' + currentStory.parts.length;

    partImage.src = part.image;
    partImage.alt = currentStory.title + ' - Part ' + (index + 1);

    partText.innerHTML = ''; // clear previous content
    activeAudioPlayers = []; 
    currentActivePlayerIndex = -1;
    isPlaying = false;

    if (part.segments && part.segments.length > 0) {
      part.segments.forEach(function(segment) {
        renderTextWithWords(segment.text, part.glossary);
        if (segment.audio) {
          createAndAppendAudioPlayer(segment.audio, partText);
        }
      });
    } else {
      renderTextWithWords(part.text, part.glossary);
      if (part.audio) {
        createAndAppendAudioPlayer(part.audio, partText);
      }
    }
  }

  // ══════════════════════════════════════════
  //  AUDIO PLAYER
  // ══════════════════════════════════════════

  let activeAudioPlayers = [];
  let currentActivePlayerIndex = -1;

  function createAndAppendAudioPlayer(audioSrc, container) {
    var playerIdx = activeAudioPlayers.length;
    var playerDiv = document.createElement('div');
    playerDiv.className = 'audio-player dynamic-player';
    
    var playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.type = 'button';
    playBtn.innerHTML = `
      <svg class="play-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg class="pause-icon hidden" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;

    var wrapper = document.createElement('div');
    wrapper.className = 'audio-progress-wrapper';

    var bar = document.createElement('div');
    bar.className = 'audio-progress-bar';

    var fill = document.createElement('div');
    fill.className = 'audio-progress-fill';
    fill.style.width = '0%';
    
    var thumb = document.createElement('div');
    thumb.className = 'audio-progress-thumb';
    fill.appendChild(thumb);

    bar.appendChild(fill);

    var timeDiv = document.createElement('div');
    timeDiv.className = 'audio-time';
    var curTime = document.createElement('span');
    curTime.textContent = '0:00';
    var durTime = document.createElement('span');
    durTime.textContent = '0:00';
    timeDiv.appendChild(curTime);
    timeDiv.appendChild(durTime);

    wrapper.appendChild(bar);
    wrapper.appendChild(timeDiv);

    playerDiv.appendChild(playBtn);
    playerDiv.appendChild(wrapper);

    container.appendChild(playerDiv);

    var playerObj = {
      src: audioSrc,
      btn: playBtn,
      fill: fill,
      curTime: curTime,
      durTime: durTime,
      wrapper: wrapper,
      playIcon: playBtn.querySelector('.play-icon'),
      pauseIcon: playBtn.querySelector('.pause-icon')
    };

    activeAudioPlayers.push(playerObj);

    playBtn.addEventListener('click', function() {
      toggleDynamicPlay(playerIdx);
    });

    wrapper.addEventListener('click', function(e) {
      if (currentActivePlayerIndex === playerIdx && audioElement.duration) {
        var rect = this.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = Math.max(0, Math.min(1, pct)) * audioElement.duration;
      } else {
        toggleDynamicPlay(playerIdx);
      }
    });
  }

  function toggleDynamicPlay(idx) {
    var p = activeAudioPlayers[idx];
    
    if (currentActivePlayerIndex === idx) {
      if (isPlaying) {
        audioElement.pause();
        p.playIcon.classList.remove('hidden');
        p.pauseIcon.classList.add('hidden');
        p.btn.classList.remove('playing');
        isPlaying = false;
      } else {
        audioElement.play().catch(function(){});
        p.playIcon.classList.add('hidden');
        p.pauseIcon.classList.remove('hidden');
        p.btn.classList.add('playing');
        isPlaying = true;
      }
    } else {
      resetAllDynamicUI();
      audioElement.src = p.src;
      currentActivePlayerIndex = idx;
      
      audioElement.play().catch(function(){});
      p.playIcon.classList.add('hidden');
      p.pauseIcon.classList.remove('hidden');
      p.btn.classList.add('playing');
      isPlaying = true;
    }
  }

  function resetAllDynamicUI() {
    activeAudioPlayers.forEach(function(p, i) {
      p.playIcon.classList.remove('hidden');
      p.pauseIcon.classList.add('hidden');
      p.btn.classList.remove('playing');
      // Only reset progress if it's NOT the one we're pausing, 
      // but actually we want to reset all since we only have one audio element
      if (i !== currentActivePlayerIndex) {
        p.fill.style.width = '0%';
        p.curTime.textContent = '0:00';
      }
    });
    isPlaying = false;
  }

  function stopAudio() {
    audioElement.pause();
    audioElement.currentTime = 0;
    resetAllDynamicUI();
    currentActivePlayerIndex = -1;
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  audioElement.addEventListener('timeupdate', function () {
    if (audioElement.duration && currentActivePlayerIndex >= 0) {
      var p = activeAudioPlayers[currentActivePlayerIndex];
      var pct = (audioElement.currentTime / audioElement.duration) * 100;
      p.fill.style.width = pct + '%';
      p.curTime.textContent = formatTime(audioElement.currentTime);
    }
  });

  audioElement.addEventListener('loadedmetadata', function () {
    if (currentActivePlayerIndex >= 0) {
      var p = activeAudioPlayers[currentActivePlayerIndex];
      p.durTime.textContent = formatTime(audioElement.duration);
    }
  });

  audioElement.addEventListener('ended', function () {
    if (currentActivePlayerIndex >= 0) {
      var p = activeAudioPlayers[currentActivePlayerIndex];
      p.playIcon.classList.remove('hidden');
      p.pauseIcon.classList.add('hidden');
      p.btn.classList.remove('playing');
    }
    isPlaying = false;
  });

  // ══════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════

  prevBtn.addEventListener('click', function () {
    if (currentPartIndex > 0) {
      showPart(currentPartIndex - 1, 'left');
    }
  });

  nextBtn.addEventListener('click', function () {
    if (currentPartIndex < currentStory.parts.length - 1) {
      showPart(currentPartIndex + 1, 'right');
    } else {
      showCompletion();
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentPartIndex < currentStory.parts.length - 1) {
        showPart(currentPartIndex + 1, 'right');
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentPartIndex > 0) {
        showPart(currentPartIndex - 1, 'left');
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
  });

  // Touch swipe support (improved — ignores zoom, taps, and scrolling)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isSwiping = false;
  let swipeLocked = false;

  partDisplay.addEventListener('touchstart', function (e) {
    // Ignore multi-touch (pinch-to-zoom)
    if (e.touches.length > 1) {
      isSwiping = false;
      return;
    }
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    touchStartTime = Date.now();
    isSwiping = true;
  }, { passive: true });

  partDisplay.addEventListener('touchend', function (e) {
    // Skip if not a valid single-finger swipe or if locked
    if (!isSwiping || swipeLocked) return;

    var touchEndX = e.changedTouches[0].screenX;
    var touchEndY = e.changedTouches[0].screenY;
    var elapsed = Date.now() - touchStartTime;

    var diffX = touchStartX - touchEndX;
    var diffY = Math.abs(touchStartY - touchEndY);

    // Must be:
    // - Horizontal distance > 80px (avoid accidental taps)
    // - Horizontal distance > vertical (not scrolling)
    // - Done within 500ms (not a slow drag/zoom)
    if (Math.abs(diffX) < 80 || diffY > Math.abs(diffX) || elapsed > 500) return;

    // Lock swiping for 800ms to prevent rapid changes
    swipeLocked = true;
    setTimeout(function() { swipeLocked = false; }, 800);

    if (diffX > 0) {
      // Swipe left → next
      if (currentPartIndex < currentStory.parts.length - 1) {
        showPart(currentPartIndex + 1, 'right');
      }
    } else {
      // Swipe right → previous
      if (currentPartIndex > 0) {
        showPart(currentPartIndex - 1, 'left');
      }
    }

    isSwiping = false;
  }, { passive: true });

  // ══════════════════════════════════════════
  //  COMPLETION SCREEN
  // ══════════════════════════════════════════

  function showCompletion() {
    stopAudio();
    hideTooltip();
    completionScreen.classList.remove('hidden');
    createConfetti();
  }

  function createConfetti() {
    confettiContainer.innerHTML = '';
    var emojis = ['⭐', '🌟', '✨', '🎉', '🎊', '🥳', '👏', '💫'];

    for (var i = 0; i < 40; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      piece.style.left = Math.random() * 100 + '%';
      piece.style.animationDelay = Math.random() * 2 + 's';
      piece.style.animationDuration = (2 + Math.random() * 3) + 's';
      piece.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
      confettiContainer.appendChild(piece);
    }
  }

  // ── Start ──
  loadStory();
})();
