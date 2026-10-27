/* StraightTalk – shared behaviour. No backend; scores live in localStorage. */
(function () {
  'use strict';

  /* ---------- safe storage ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var themeBtn = document.getElementById('themeBtn');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
      themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
    }
  }
  var theme = store.get('st_theme', null);
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(theme);
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      store.set('st_theme', theme);
    });
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- best score badges ---------- */
  function showBest() {
    var best = store.get('st_best', null);
    document.querySelectorAll('[data-best]').forEach(function (el) {
      el.textContent = best === null ? 'No quiz score yet' : 'Best quiz score: ' + best.score + '/' + best.total;
    });
  }
  showBest();

  /* ---------- myth cards ---------- */
  document.querySelectorAll('.flip').forEach(function (card) {
    card.setAttribute('aria-expanded', 'false');
    card.addEventListener('click', function () {
      var on = card.classList.toggle('revealed');
      card.setAttribute('aria-expanded', String(on));
    });
  });

  /* ---------- fact-file filters ---------- */
  var filters = document.querySelectorAll('.filter');
  if (filters.length) {
    var facts = document.querySelectorAll('.fact[data-cat]');
    var status = document.getElementById('filterStatus');
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filter');
        filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        var shown = 0;
        facts.forEach(function (f) {
          var match = cat === 'all' || f.getAttribute('data-cat') === cat;
          f.hidden = !match;
          if (match) { shown += 1; }
        });
        if (status) { status.textContent = 'Showing ' + shown + ' fact file' + (shown === 1 ? '' : 's') + '.'; }
      });
    });
  }

  /* ---------- peer-pressure simulator ---------- */
  var simRoot = document.getElementById('sim');
  if (simRoot) {
    var SCENES = [
      {
        scene: 'You are at a classmate\'s birthday party. Someone you like hands you a vape and says, "Just try it. One puff won\'t hurt."',
        choices: [
          { t: 'Take it so you do not look uncool.', r: 'risky', f: 'Nicotine is highly addictive and vapes are not harmless. Going along just to fit in is exactly how peer pressure works.' },
          { t: 'Say "No thanks, I\'m good," grab a drink or snack, and change the topic.', r: 'best', f: 'Short, calm and confident. You do not owe anyone a long explanation, and changing the subject makes it easy to move on.' },
          { t: 'Make up an excuse and hide in the bathroom for a while.', r: 'ok', f: 'It avoids the moment, but it does not help next time. A simple "no thanks" is easier and keeps you in the fun.' }
        ]
      },
      {
        scene: 'At a hangout, a friend holds out some pills and says, "Everyone does it. Don\'t be a baby."',
        choices: [
          { t: 'Stay and watch quietly without saying anything.', r: 'ok', f: 'You did not take any, but staying in a pressured situation makes it harder to say no later. You can leave.' },
          { t: 'Say "That\'s not for me, I\'m heading out. Want to come with me?" and go.', r: 'best', f: 'Firm, offers an alternative, and gets you out. Unknown pills can contain anything, so you can never be sure what they are.' },
          { t: 'Take one because you trust your friend.', r: 'risky', f: 'Even a trusted friend may not know what is in a pill. Pills sold or passed around can contain unexpected and dangerous substances.' }
        ]
      },
      {
        scene: 'A message from an older acquaintance online says: "Stressed about exams? I have something that will help you focus. Message me."',
        choices: [
          { t: 'Decline, block the account, and tell a trusted adult or your counselor about the offer.', r: 'best', f: 'Correct. Reporting protects you and others, and your counselor can also help with the exam stress itself.' },
          { t: 'Ask what it is and meet up just to see.', r: 'risky', f: 'Meeting unknown sellers puts your safety and future at risk. Curiosity is how many people get pulled in.' },
          { t: 'Ignore it and say nothing to anyone.', r: 'ok', f: 'Ignoring is better than replying, but telling a trusted adult helps keep you and your classmates safe.' }
        ]
      },
      {
        scene: 'You notice a close friend has been using something regularly. They skip class, hide their phone, and seem different lately.',
        choices: [
          { t: 'Tell the rest of the group chat so everyone knows.', r: 'risky', f: 'Gossip can shame and isolate your friend, which makes it harder for them to accept help.' },
          { t: 'Do nothing and hope it passes.', r: 'ok', f: 'It is natural to feel unsure, but problems rarely fix themselves. A caring conversation matters.' },
          { t: 'Pull them aside privately, say you care, listen, and encourage them to talk to a counselor or trusted adult. Offer to go along.', r: 'best', f: 'Private, kind and focused on support. You are not responsible for fixing it, but you can be the first step toward help.' }
        ]
      }
    ];

    var si = 0;
    var smart = 0;
    var picked = false;
    var LABEL = { best: 'Smart choice', ok: 'Not bad, but there is a better move', risky: 'Risky choice' };

    var renderScene = function () {
      var sc = SCENES[si];
      picked = false;
      simRoot.innerHTML =
        '<div class="sim-top"><span>Scenario ' + (si + 1) + ' of ' + SCENES.length + '</span><span>Smart choices: ' + smart + '</span></div>' +
        '<p class="sim-scene" id="scene"></p>' +
        '<div class="choice-list" id="choices"></div>' +
        '<div class="feedback" id="feedback" role="status" aria-live="polite"></div>' +
        '<p style="margin-top:18px"><button class="btn" id="simNext" disabled>' + (si === SCENES.length - 1 ? 'See my results' : 'Next scenario') + '</button></p>';
      document.getElementById('scene').textContent = sc.scene;
      var list = document.getElementById('choices');
      sc.choices.forEach(function (c, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.textContent = c.t;
        b.addEventListener('click', function () { pick(i); });
        list.appendChild(b);
      });
      document.getElementById('simNext').addEventListener('click', function () {
        si += 1;
        if (si < SCENES.length) { renderScene(); } else { renderSimResult(); }
      });
    };

    var pick = function (i) {
      if (picked) { return; }
      picked = true;
      var sc = SCENES[si];
      var buttons = document.querySelectorAll('#choices .choice');
      buttons.forEach(function (b, n) {
        b.disabled = true;
        if (n === i) { b.classList.add(sc.choices[n].r); }
        else if (sc.choices[n].r === 'best') { b.classList.add('best'); }
      });
      if (sc.choices[i].r === 'best') { smart += 1; }
      var fb = document.getElementById('feedback');
      fb.textContent = LABEL[sc.choices[i].r] + '. ' + sc.choices[i].f;
      fb.classList.add('show');
      var nx = document.getElementById('simNext');
      nx.disabled = false;
      nx.focus();
    };

    var renderSimResult = function () {
      var msg = smart === SCENES.length
        ? 'Perfect. You know how to protect yourself and look out for friends.'
        : smart >= 2
          ? 'Good instincts! Replay to try the other options and see how each one plays out.'
          : 'Everyone is learning. Read the Choices tips again and replay. Practicing what to say really helps.';
      simRoot.innerHTML =
        '<div class="result"><h3>Scenarios complete</h3><div class="score">' + smart + '/' + SCENES.length + '</div>' +
        '<p>' + msg + '</p><p><button class="btn" id="simAgain">Play again</button> <a class="btn btn-white" href="quiz.html">Take the quiz</a></p></div>';
      document.getElementById('simAgain').addEventListener('click', function () { si = 0; smart = 0; renderScene(); });
    };

    renderScene();
  }

  /* ---------- quiz ---------- */
  var quizRoot = document.getElementById('quiz');
  if (quizRoot) {
    var QUESTIONS = [
      {
        q: 'Which part of the brain do drugs mainly affect to create strong cravings?',
        o: ['The reward system', 'The hearing center', 'The sense of balance', 'The sense of smell'],
        a: 0,
        e: 'Drugs flood the brain\'s reward system with chemicals such as dopamine. The brain starts to treat the drug as something it needs.'
      },
      {
        q: 'Why are teenagers more at risk from drugs?',
        o: ['Their bodies are fully developed', 'Their brains are still developing', 'They never feel stress', 'Drugs do not affect young people'],
        a: 1,
        e: 'The brain keeps developing until the mid-20s, and drugs can interfere with learning, memory and decision-making during that time.'
      },
      {
        q: 'Addiction is best described as…',
        o: ['A lack of willpower', 'A treatable health condition', 'Something that only happens to bad people', 'A phase that always disappears on its own'],
        a: 1,
        e: 'Addiction is a health condition that changes how the brain works. It is treatable, and people do recover with the right support.'
      },
      {
        q: 'Which statement about vapes is TRUE?',
        o: ['They are just water vapor', 'Many contain nicotine, which is highly addictive', 'They cannot harm your lungs', 'They are safe for teens'],
        a: 1,
        e: 'Many vapes contain nicotine, and the aerosol can irritate the lungs. "Safer than cigarettes" does not mean safe.'
      },
      {
        q: 'Inhalants (household products breathed in on purpose) can…',
        o: ['Only cause harm after years of use', 'Be harmless if used once', 'Cause serious harm or death, even the first time', 'Improve concentration'],
        a: 2,
        e: 'Inhaling these products can cause sudden heart problems or stop breathing, even on the first try, and can damage the brain over time.'
      },
      {
        q: 'Why is mixing alcohol with other drugs or medicines dangerous?',
        o: ['It cancels out the effects', 'It can multiply risks, including slowed breathing and blackouts', 'It makes people more alert', 'It is only risky for adults'],
        a: 1,
        e: 'Combinations are unpredictable and can be far more dangerous than either alone. Medicines should only be used as directed by a doctor.'
      },
      {
        q: 'What is a good way to say no to peer pressure?',
        o: ['A long, nervous explanation', 'Say yes just this once', 'A short, firm "No thanks," then suggest something else or leave', 'Pretend you did not hear'],
        a: 2,
        e: 'Keep it short and calm, offer an alternative, and leave if you need to. You do not owe anyone a reason.'
      },
      {
        q: 'A person has taken something, is hard to wake up and is breathing very slowly. What should you do?',
        o: ['Let them sleep it off', 'Give them coffee', 'Call 911 right away and stay with them if it is safe', 'Post about it online'],
        a: 2,
        e: 'This is a medical emergency. Call for emergency help immediately. Never leave the person alone, and do not wait to see if it passes.'
      },
      {
        q: 'What is Republic Act 9165?',
        o: ['The Comprehensive Dangerous Drugs Act of 2002', 'The Mental Health Act', 'The Anti-Bullying Act', 'The Data Privacy Act'],
        a: 0,
        e: 'RA 9165, signed in 2002, is the Philippines\' main law on dangerous drugs. The Dangerous Drugs Board sets policy and the PDEA enforces it.'
      },
      {
        q: 'You are worried about your own or a friend\'s drug use. Who can you talk to?',
        o: ['No one, it is a secret', 'A guidance counselor, a trusted adult, a doctor, or a helpline such as the DOH Substance Abuse Helpline', 'Only the person who offered the drug', 'Strangers in an online group'],
        a: 1,
        e: 'Reaching out early works best. Counselors, trusted adults, doctors and helplines are there to help without judging.'
      }
    ];

    var idx = 0;
    var score = 0;
    var answered = false;

    var renderQ = function () {
      var item = QUESTIONS[idx];
      answered = false;
      quizRoot.innerHTML =
        '<div class="sim-top"><span>Question ' + (idx + 1) + ' of ' + QUESTIONS.length + '</span><span>Score: ' + score + '</span></div>' +
        '<div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:' + (idx / QUESTIONS.length * 100) + '%"></div></div>' +
        '<p class="q-text" id="qText"></p>' +
        '<div class="choice-list" id="options"></div>' +
        '<div class="feedback" id="explain" role="status" aria-live="polite"></div>' +
        '<p style="margin-top:18px"><button class="btn" id="nextBtn" disabled>' + (idx === QUESTIONS.length - 1 ? 'See results' : 'Next question') + '</button></p>';
      document.getElementById('qText').textContent = item.q;
      var box = document.getElementById('options');
      item.o.forEach(function (text, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.textContent = text;
        b.addEventListener('click', function () { choose(i); });
        box.appendChild(b);
      });
      document.getElementById('nextBtn').addEventListener('click', function () {
        idx += 1;
        if (idx < QUESTIONS.length) { renderQ(); } else { renderResult(); }
      });
    };

    var choose = function (i) {
      if (answered) { return; }
      answered = true;
      var item = QUESTIONS[idx];
      document.querySelectorAll('#options .choice').forEach(function (b, n) {
        b.disabled = true;
        if (n === item.a) { b.classList.add('best'); }
        if (n === i && i !== item.a) { b.classList.add('risky'); }
      });
      if (i === item.a) { score += 1; }
      var ex = document.getElementById('explain');
      ex.textContent = (i === item.a ? 'Correct! ' : 'Not quite. ') + item.e;
      ex.classList.add('show');
      var nx = document.getElementById('nextBtn');
      nx.disabled = false;
      nx.focus();
    };

    var renderResult = function () {
      var total = QUESTIONS.length;
      var pct = Math.round(score / total * 100);
      var msg = pct >= 80
        ? 'Excellent! You know your facts. Share them with friends.'
        : pct >= 50
          ? 'Solid effort. Review the lessons and try again to beat your score.'
          : 'Good start. Go through the lessons again, then retake the quiz.';
      var best = store.get('st_best', null);
      if (best === null || score > best.score) { store.set('st_best', { score: score, total: total }); }
      quizRoot.innerHTML =
        '<div class="result"><h2>Quiz done</h2><div class="score">' + score + '/' + total + '</div><p>' + msg + '</p>' +
        '<p><button class="btn" id="retry">Retake quiz</button> <a class="btn btn-white" href="facts.html">Review the facts</a></p></div>';
      document.getElementById('retry').addEventListener('click', function () { idx = 0; score = 0; renderQ(); });
      showBest();
    };

    renderQ();
  }
})();
