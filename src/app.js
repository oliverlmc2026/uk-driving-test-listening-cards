import { cards, CATEGORIES, TOPICS, isSentence } from './cards.js';
import { createMastery } from './mastery.js';
import { createSession } from './session.js';
import { createSpeech } from './speech.js';
import { browserEngine } from './speech-engine.js';
import { audioEngine } from './audio-engine.js';
import { audioManifest } from './audio-manifest.js';
import { localStorageAdapter } from './storage.js';

const app = document.getElementById('app');

const PROGRESS_KEY = 'progress';
const SPEED_KEY = 'speed';

const speech = createSpeech({
  engine: audioEngine({ manifest: audioManifest, fallback: browserEngine() }),
  storage: localStorageAdapter(SPEED_KEY),
});
const mastery = createMastery({ cards, storage: localStorageAdapter(PROGRESS_KEY) });
// 今個練習環節（一輪或者模擬路試）。規則全部喺 session 入面，畫面只負責畫同發聲。
let session = null;

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// 一套線條圖示（24 格、粗細同圓角一致，顏色跟住文字），取代 emoji。
const ICONS = {
  speaker: ['M11 5 6 9H3v6h3l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'],
  bulb: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z'],
  check: ['M5 12.5 9.5 17 19 7.5'],
  cross: ['M6 6l12 12', 'M18 6 6 18'],
  back: ['M19 12H5', 'M11 6l-6 6 6 6'],
};

function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ICONS[name]) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

// 聲線提示：每個畫面畫一個 <p class="notice">，聲線載入完由下面嗰個訂閱更新晒畫面上嘅提示。
function paintNotice(node) {
  const text = speech.notice();
  node.textContent = text ?? '';
  node.hidden = !text;
}

function renderNotice() {
  const notice = el('p', { className: 'notice' });
  paintNotice(notice);
  return notice;
}

speech.subscribe(() => document.querySelectorAll('.notice').forEach(paintNotice));

// 讀出英文，讀緊嗰陣畀個掣加 speaking。normalSpeed：唔跟用家設定，一律正常語速。
function speak(text, playButton, { normalSpeed = false } = {}) {
  speech.say(text, {
    normalSpeed,
    onStart: () => playButton?.classList.add('speaking'),
    onEnd: () => playButton?.classList.remove('speaking'),
  });
}

// 首頁邊啲大類打開咗（只記喺今次開住嘅頁面）。
const openCategories = new Set();

// 畫面頂部彈出一句短訊息，幾秒後自動消失。
let toastTimer = null;
function showToast(message) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const toast = el('p', { className: 'toast' }, [icon('check'), el('span', { textContent: message })]);
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  toastTimer = setTimeout(() => toast.remove(), 3000);
}

// 兩截進度條：深色係已掌握，淺色係答啱咗一次。
function progressBar({ mastered, learning, total }) {
  const segment = (className, count) => {
    const node = el('span', { className });
    node.style.width = `${(count / total) * 100}%`;
    return node;
  };
  const bar = el('span', { className: 'bar' }, [segment('bar-mastered', mastered), segment('bar-learning', learning)]);
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', `${total} 張入面已掌握 ${mastered} 張，答啱一次 ${learning} 張`);
  return bar;
}

function renderHome() {
  speech.stop();
  session = null;
  const { sentences, categories } = mastery.stats();

  // 首頁主角：總進度一眼睇到，撳落去就開始一輪。
  const mixed = el('button', { className: 'primary hero' }, [
    el('span', { className: 'hero-title', textContent: '全部句子混合' }),
    el('span', { className: 'hero-number' }, [
      el('strong', { textContent: String(sentences.mastered) }),
      el('span', { textContent: ` / ${sentences.total} 已掌握` }),
    ]),
    progressBar({ mastered: sentences.mastered, learning: 0, total: sentences.total }),
  ]);
  mixed.addEventListener('click', () => startSession('round'));

  // 每個大類預設收起，撳標題先打開；openCategories 記住邊啲打開咗，返首頁時保持。
  const groups = categories.map(({ category, mastered, total, topics }) => {
    const details = el('details', { className: 'category-group', open: openCategories.has(category) }, [
      el('summary', {}, [
        el('span', { textContent: CATEGORIES[category] }),
        el('span', { className: 'ratio', textContent: `${mastered} / ${total}` }),
        progressBar({ mastered, learning: topics.reduce((sum, t) => sum + t.learning, 0), total }),
      ]),
      el(
        'div',
        { className: 'options' },
        topics.map((s) => {
          const button = el('button', { className: 'choice' }, [
            el('span', { textContent: TOPICS[s.topic].label }),
            el('span', { className: 'ratio', textContent: `${s.mastered} / ${s.total}` }),
            progressBar(s),
            ...(s.learning > 0
              ? [el('span', { className: 'caption', textContent: `另有 ${s.learning} 張答啱咗一次，再啱一次就掌握` })]
              : []),
          ]);
          button.addEventListener('click', () => startSession('round', s.topic));
          return button;
        }),
      ),
    ]);
    details.addEventListener('toggle', () => {
      if (details.open) openCategories.add(category);
      else openCategories.delete(category);
      updateToggleAll();
    });
    return details;
  });

  const toggleAll = el('button', { className: 'small' });
  const allOpen = () => groups.every((g) => g.open);
  const updateToggleAll = () => {
    toggleAll.textContent = allOpen() ? '全部收起' : '全部打開';
  };
  toggleAll.addEventListener('click', () => {
    const open = !allOpen();
    for (const g of groups) g.open = open;
  });
  updateToggleAll();

  const reviewCount = mastery.toReview().length;
  const mockButton = el('button', { className: 'tile' }, [
    el('span', { className: 'tile-title', textContent: '模擬路試' }),
    el('span', { className: 'tile-sub', textContent: '按考試次序，冇提示' }),
  ]);
  mockButton.addEventListener('click', () => startSession('mock'));
  const reviewButton = el('button', { className: 'tile' }, [
    el('span', { className: 'tile-title', textContent: '錯題清單' }),
    el('span', { className: 'tile-sub', textContent: `${reviewCount} 張未掌握` }),
  ]);
  reviewButton.addEventListener('click', renderReviewList);

  // 唔用原生 confirm()：有啲內嵌瀏覽器唔顯示對話框，會直接當取消。
  const reset = el('div', { className: 'reset' });
  const showResetButton = () => {
    const button = el('button', { className: 'small danger', textContent: '重設進度' });
    button.addEventListener('click', showResetConfirm);
    reset.replaceChildren(button);
  };
  const showResetConfirm = () => {
    const yes = el('button', { className: 'small danger', textContent: '確定清除' });
    yes.addEventListener('click', () => {
      mastery.reset();
      renderHome();
      showToast('已清除所有進度');
    });
    const no = el('button', { className: 'small', textContent: '取消' });
    no.addEventListener('click', showResetButton);
    reset.replaceChildren(
      el('p', { className: 'muted', textContent: '確定要清除所有掌握記錄？呢個動作冇得還原。' }),
      el('div', { className: 'row' }, [no, yes]),
    );
    no.focus();
    reset.scrollIntoView({ block: 'nearest' });
  };
  showResetButton();

  app.replaceChildren(
    el('h1', { textContent: '路試英語聽力卡' }),
    el('p', { className: 'muted', textContent: '聽考官嘅英文指示，揀返啱嘅中文意思。每輪最多 10 張。' }),
    renderNotice(),
    mixed,
    el('div', { className: 'row' }, [mockButton, reviewButton]),
    el('details', { className: 'info' }, [
      el('summary', { textContent: '說明：數字同進度條點計？' }),
      el(
        'ul',
        {},
        [
          '一張卡要冇用提示連續答啱兩次先算「已掌握」，數字計嘅係呢個。',
          '進度條淺色係答啱咗一次，深色係已掌握；答錯或者用咗提示就由頭計。',
          '未掌握嘅卡之後會出多啲，亦會列喺「錯題清單」。',
          '「全部句子混合」同「模擬路試」只出考官成句指示，唔包「常用詞彙」。',
          '模擬路試冇提示、每句只可以重播一次，完咗先睇成績。',
        ].map((text) => el('li', { textContent: text })),
      ),
    ]),
    el('div', { className: 'topbar' }, [
      el('p', { className: 'muted', textContent: '或者揀一個類別：' }),
      toggleAll,
    ]),
    ...groups,
    reset,
  );
}

function startSession(kind, topic = null) {
  session = createSession({ kind, cards, mastery, topic });
  renderQuestion();
}

function homeButton() {
  const button = el('button', { className: 'small' }, [icon('back'), el('span', { textContent: '返首頁' })]);
  button.addEventListener('click', renderHome);
  return button;
}

// ── 錯題清單 ──

function renderReviewList() {
  speech.stop();
  const toReview = mastery.toReview();
  const parts = [
    el('div', { className: 'topbar' }, [
      homeButton(),
      el('p', { className: 'category', textContent: `${toReview.length} 張未掌握` }),
    ]),
    el('h1', { textContent: '錯題清單' }),
    renderNotice(),
  ];
  if (toReview.length === 0) {
    parts.push(el('p', { className: 'muted', textContent: '暫時冇錯題。做過但未連續答啱兩次嘅卡會喺呢度出現。' }));
  } else {
    parts.push(el('p', { className: 'muted', textContent: '撳一張嚟聽。' }));
    for (const category of Object.keys(CATEGORIES)) {
      const inCategory = toReview.filter((c) => c.category === category);
      if (inCategory.length === 0) continue;
      parts.push(
        el('h2', { className: 'group', textContent: `${CATEGORIES[category]}（${inCategory.length}）` }),
        el(
          'div',
          { className: 'options' },
          inCategory.map((card) => {
            const button = el('button', { className: 'listen' }, [
              el('span', { className: 'english', lang: 'en-GB', textContent: card.en }),
              el('span', { textContent: card.zh }),
              icon('speaker'),
            ]);
            button.addEventListener('click', () => speak(card.en, button));
            return button;
          }),
        ),
      );
    }
  }
  app.replaceChildren(...parts);
}

// ── 練習環節（一輪、模擬路試共用）──

function advance() {
  session.next();
  if (session.finished) renderSummary();
  else renderQuestion();
}

// 總結畫面嘅字眼同每行點顯示，按模式分。
const SUMMARY = {
  round: {
    title: '今輪小結',
    score: ({ score, total }) => `${score} / ${total} 淨靠聽答啱`,
    needsReview: (r) => !r.correct || r.usedHint,
    allGood: '全部答啱，冇用提示。',
    note: ({ results }) =>
      `今輪有 ${results.filter((r) => r.mastered).length} 張已掌握。每張卡要連續答啱兩次先算掌握，再嚟一輪就會加上去。`,
    listIntro: '呢啲之後會出多啲：',
    // 答錯係預設（左邊紅線表示），淨係「用咗提示」先需要寫標籤。
    rowClass: (r) => (r.correct ? 'hinted' : 'wrong'),
    row: (r) => [
      el('span', { className: 'english', lang: 'en-GB', textContent: r.card.en }),
      el('span', { textContent: r.card.zh }),
      ...(r.correct ? [el('span', { className: 'tag', textContent: '用咗提示' })] : []),
    ],
    again: '再嚟一輪',
  },
  mock: {
    title: '模擬路試成績',
    score: ({ score, total }) => `${score} / ${total} 聽得明`,
    needsReview: (r) => !r.correct,
    allGood: '全部聽得明。',
    listIntro: '聽錯嘅句子：',
    rowClass: () => 'wrong',
    row: (r) => [
      el('span', { className: 'english', lang: 'en-GB', textContent: r.card.en }),
      el('span', { className: 'tag', textContent: `你揀：${r.chosen}` }),
      el('span', { textContent: `正確：${r.card.zh}` }),
    ],
    again: '再考一次',
  },
};

function renderSummary() {
  speech.stop();
  const summary = session.summary();
  const text = SUMMARY[session.kind];
  const review = summary.results.filter(text.needsReview);

  const again = el('button', { className: 'primary', textContent: text.again });
  const { kind, topic } = session;
  again.addEventListener('click', () => startSession(kind, topic));

  const parts = [
    el('h1', { textContent: text.title }),
    el('p', { className: 'score', textContent: text.score(summary) }),
  ];
  if (review.length === 0) parts.push(el('p', { className: 'muted', textContent: text.allGood }));
  if (text.note) parts.push(el('p', { className: 'muted', textContent: text.note(summary) }));
  if (review.length > 0) {
    parts.push(
      el('p', { className: 'muted', textContent: text.listIntro }),
      el(
        'ul',
        { className: 'review' },
        review.map((r) => el('li', { className: text.rowClass(r) }, text.row(r))),
      ),
    );
  }
  parts.push(again, homeButton());
  app.replaceChildren(...parts);
  // 新畫面一定由頂部開始，等分數先見到；focus 唔好帶住頁面捲去個掣。
  window.scrollTo(0, 0);
  again.focus({ preventScroll: true });
}

function renderQuestion() {
  const { rules } = session;
  const { card, options } = session.question;
  const limitedReplay = rules.replays !== Infinity;
  // 唔可以轉語速嘅環節（模擬路試）一律正常語速。
  const normalSpeed = !rules.chooseSpeed;

  const playLabel = el('span', { textContent: limitedReplay ? '重播（只限一次）' : '再聽一次' });
  const play = el('button', { className: 'play' }, [icon('speaker'), playLabel]);
  play.addEventListener('click', () => {
    if (!session.replay()) return;
    if (limitedReplay) {
      play.disabled = true;
      playLabel.textContent = '已經重播過';
    }
    speak(card.en, play, { normalSpeed });
  });

  const controls = [];
  if (rules.chooseSpeed) {
    const isSlow = () => speech.speed() === 'slow';
    const speedLabel = () => (isSlow() ? '語速：慢速' : '語速：正常');
    const speedButton = el('button', { className: 'small', textContent: speedLabel() });
    speedButton.setAttribute('aria-pressed', String(isSlow()));
    speedButton.addEventListener('click', () => {
      speech.toggleSpeed();
      speedButton.textContent = speedLabel();
      speedButton.setAttribute('aria-pressed', String(isSlow()));
      speak(card.en, play);
    });
    controls.push(speedButton);
  }

  const hintText = el('p', { className: 'english hint-text', lang: 'en-GB', hidden: true });
  let hintButton = null;
  if (rules.hint) {
    hintButton = el('button', { className: 'small' }, [icon('bulb'), el('span', { textContent: '提示：睇英文' })]);
    hintButton.addEventListener('click', () => {
      session.useHint();
      hintText.textContent = card.en;
      hintText.hidden = false;
      hintButton.disabled = true;
    });
    controls.push(hintButton);
  }

  const feedback = el('div');
  const optionButtons = options.map((text) => {
    const button = el('button', { className: 'option', textContent: text });
    button.addEventListener('click', () => {
      if (hintButton) hintButton.disabled = true;
      hintText.hidden = true;
      const outcome = session.answer(text);
      if (outcome) reveal(card, text, optionButtons, feedback, outcome);
      else advance();
    });
    return button;
  });

  window.scrollTo(0, 0);
  const unit = session.kind === 'mock' ? '句' : '張';
  const segments = Array.from({ length: session.total }, (_, i) =>
    el('span', { className: i < session.number ? 'seg done' : 'seg' }),
  );
  const progress = el('div', { className: 'progress' }, segments);
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-label', `第 ${session.number} ${unit}，共 ${session.total} ${unit}`);
  progress.setAttribute('aria-valuemin', '1');
  progress.setAttribute('aria-valuemax', String(session.total));
  progress.setAttribute('aria-valuenow', String(session.number));
  app.replaceChildren(
    el('div', { className: 'topbar' }, [
      homeButton(),
      el('p', { className: 'position', textContent: `${session.number} / ${session.total}` }),
    ]),
    progress,
    el('p', {
      className: 'category',
      textContent: session.kind === 'mock' ? '模擬路試' : TOPICS[card.topic].label,
    }),
    renderNotice(),
    play,
    ...(controls.length > 0 ? [el('div', { className: 'row' }, controls)] : []),
    el('h2', { className: 'prompt', textContent: '考官講緊咩？' }),
    el('div', { className: 'options' }, optionButtons),
    ...(rules.reveals ? [feedback] : []),
    hintText,
  );
  speak(card.en, limitedReplay ? null : play, { normalSpeed });
}

// 一輪：答完即時顯示啱錯同解釋，撳「下一張」先繼續。
function reveal(card, chosen, optionButtons, feedback, outcome) {
  for (const button of optionButtons) {
    button.disabled = true;
    if (button.textContent === outcome.correctAnswer) button.classList.add('correct');
    else if (button.textContent === chosen) button.classList.add('chosen-wrong');
  }

  const isLast = session.number === session.total;
  const next = el('button', { className: 'primary', textContent: isLast ? '睇小結' : '下一張' });
  next.addEventListener('click', advance);

  // 結果同「下一張」釘喺畫面底部：回饋再長，都即刻見到啱錯，亦唔使捲到底先撳到下一張。
  const verdict = el('p', { className: `verdict ${outcome.correct ? 'right' : 'wrong'}` }, [
    icon(outcome.correct ? 'check' : 'cross'),
    el('span', { textContent: outcome.correct ? (outcome.usedHint ? '啱（用咗提示）' : '啱') : '唔啱' }),
  ]);
  verdict.setAttribute('role', 'status');
  const bar = el('div', { className: 'answer-bar' }, [verdict, next]);

  feedback.replaceChildren(renderFeedback(card), bar);
  feedback.className = 'options';
  next.focus({ preventScroll: true });
}

function section(title, content) {
  return el('div', {}, [el('h2', { textContent: title }), content]);
}

// 回饋卡由重要到次要：中文意思（最大）→ 英文原文 → 應該做咩 → 參考答案 → 詞彙同例句（收埋）。
function renderFeedback(card) {
  const parts = [
    section('中文意思', el('p', { className: 'meaning', textContent: card.zh })),
    section('英文原文', el('p', { className: 'english quote', lang: 'en-GB', textContent: card.en })),
    section(isSentence(card) ? '應該做咩' : '解釋', el('p', { textContent: card.action })),
  ];
  if (card.answerEn) {
    parts.push(
      section('參考答案', el('p', { className: 'english quote', lang: 'en-GB', textContent: card.answerEn })),
    );
  }
  if (card.answerZh) {
    parts.push(section('答案解釋', el('p', { textContent: card.answerZh })));
  }

  const more = [];
  if (card.vocab.length > 0) {
    more.push(
      section(
        '重點詞彙',
        el(
          'ul',
          {},
          card.vocab.map((v) => el('li', { textContent: `${v.en} = ${v.zh}` })),
        ),
      ),
    );
  }
  if (card.example) {
    more.push(section('考官會咁講', el('p', { className: 'english quote', lang: 'en-GB', textContent: card.example })));
  }
  if (more.length > 0) {
    parts.push(el('details', { className: 'more' }, [el('summary', { textContent: '詞彙同例句' }), ...more]));
  }
  return el('div', { className: 'feedback' }, parts);
}

renderHome();
