// Telegram Test Mini App - Frontend
(function() {
  'use strict';

  // ============ STATE ============
  const state = {
    screen: 'welcome',
    user: { id: 'guest', username: 'Guest', firstName: 'Guest' },
    test: null,
    currentQuestion: 0,
    answers: {},
    results: null,
    isAdmin: false,
    adminCode: null,
    adminTests: [],
    selectedTestCode: null
  };

  // ============ TELEGRAM INTEGRATION ============
  let tg = null;

  function initTelegram() {
    if (window.Telegram?.WebApp) {
      tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Theme
      applyTheme();
      tg.onEvent('themeChanged', applyTheme);

      // User info
      const u = tg.initDataUnsafe?.user;
      if (u) {
        state.user = {
          id: String(u.id),
          username: u.username || 'User',
          firstName: u.first_name || 'Guest'
        };
      }

      // Back button
      if (tg.BackButton) {
        tg.BackButton.onClick(handleBackButton);
      }
    }
  }

  function applyTheme() {
    if (!tg) return;
    const p = tg.themeParams;
    const root = document.documentElement;
    root.style.setProperty('--tg-bg', p.bg_color || '#ffffff');
    root.style.setProperty('--tg-text', p.text_color || '#000000');
    root.style.setProperty('--tg-hint', p.hint_color || '#999999');
    root.style.setProperty('--tg-link', p.link_color || '#0088cc');
    root.style.setProperty('--tg-button', p.button_color || '#0088cc');
    root.style.setProperty('--tg-button-text', p.button_text_color || '#ffffff');
    root.style.setProperty('--tg-secondary-bg', p.secondary_bg_color || '#f5f5f5');

    if (tg.colorScheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  function updateBackButton() {
    if (!tg?.BackButton) return;
    const show = ['test', 'results', 'report', 'admin', 'adminCreate', 'adminStats'].includes(state.screen);
    if (show) tg.BackButton.show();
    else tg.BackButton.hide();
  }

  function updateClosingConfirmation() {
    if (!tg) return;
    if (state.screen === 'test') tg.enableClosingConfirmation();
    else tg.disableClosingConfirmation();
  }

  function handleBackButton() {
    if (state.screen === 'test') {
      if (confirm('Quit this test? Your progress will be lost.')) {
        resetTestState();
        state.screen = 'welcome';
      }
    } else if (state.screen === 'results') {
      resetTestState();
      state.screen = 'welcome';
    } else if (state.screen === 'report') {
      state.screen = 'results';
    } else if (state.screen === 'adminCreate' || state.screen === 'adminStats') {
      state.screen = 'admin';
    } else if (state.screen === 'admin') {
      state.isAdmin = false;
      state.adminCode = null;
      state.screen = 'welcome';
    }
    render();
  }

  function resetTestState() {
    state.test = null;
    state.currentQuestion = 0;
    state.answers = {};
    state.results = null;
  }

  // ============ API ============
  async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.isAdmin && state.adminCode) {
      headers['X-Admin-Code'] = state.adminCode;
    }

    const res = await fetch('/api' + endpoint, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ============ UTILS ============
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showLoading() {
    document.getElementById('loading').classList.add('active');
  }

  function hideLoading() {
    document.getElementById('loading').classList.remove('active');
  }

  function showError(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
  }

  function animateScore(element, target, duration = 1000) {
    const start = 0;
    const startTime = performance.now();
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * ease);
      element.textContent = current + '%';
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ============ RENDERER ============
  function render() {
    const container = document.getElementById('screens');
    container.innerHTML = '';
    updateBackButton();
    updateClosingConfirmation();

    switch (state.screen) {
      case 'welcome': renderWelcome(container); break;
      case 'test': renderTest(container); break;
      case 'results': renderResults(container); break;
      case 'report': renderReport(container); break;
      case 'admin': renderAdmin(container); break;
      case 'adminCreate': renderAdminCreate(container); break;
      case 'adminStats': renderAdminStats(container); break;
    }
  }

  // ============ WELCOME SCREEN ============
  function renderWelcome(container) {
    const el = document.createElement('div');
    el.className = 'screen welcome-screen';
    el.innerHTML = `
      <div class="logo">
        <svg viewBox="0 0 100 100" class="logo-svg" fill="none" stroke="currentColor" stroke-width="4">
          <rect x="15" y="10" width="70" height="80" rx="8"/>
          <line x1="30" y1="30" x2="70" y2="30" stroke-width="3" stroke-linecap="round"/>
          <line x1="30" y1="45" x2="70" y2="45" stroke-width="3" stroke-linecap="round"/>
          <line x1="30" y1="60" x2="55" y2="60" stroke-width="3" stroke-linecap="round"/>
          <circle cx="75" cy="75" r="16" fill="var(--tg-link)" stroke="none"/>
          <path d="M68 75 L73 80 L82 70" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 class="greeting">Welcome, ${escapeHtml(state.user.firstName)}!</h1>
      <p class="subtitle">Enter a test code to begin</p>
      <div class="input-group">
        <input type="text" id="codeInput" class="code-input" placeholder="Enter test code..." maxlength="30" autocomplete="off">
        <button class="btn btn-primary" id="startBtn">Start Test</button>
      </div>
      <div class="hint">Ask your teacher for the test code</div>
    `;
    container.appendChild(el);

    const input = el.querySelector('#codeInput');
    const btn = el.querySelector('#startBtn');
    input.focus();

    const submit = () => handleCodeSubmit(input.value.trim());
    btn.addEventListener('click', submit);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') submit(); });
  }

  async function handleCodeSubmit(code) {
    if (!code) return showError('Please enter a code');
    showLoading();

    try {
      const verifyRes = await api('/admin/verify', {
        method: 'POST',
        body: { code }
      });

      if (verifyRes.valid) {
        state.isAdmin = true;
        state.adminCode = code;
        state.screen = 'admin';
        hideLoading();
        render();
        return;
      }
    } catch (e) {
      // Not admin code, continue to test lookup
    }

    try {
      const test = await api('/tests/' + encodeURIComponent(code));
      state.test = test;
      state.currentQuestion = 0;
      state.answers = {};
      state.screen = 'test';
    } catch (e) {
      showError('Test not found. Check the code and try again.');
    } finally {
      hideLoading();
      render();
    }
  }

  // ============ TEST SCREEN ============
  function renderTest(container) {
    const q = state.test.questions[state.currentQuestion];
    const total = state.test.questions.length;
    const current = state.currentQuestion + 1;
    const pct = (current / total) * 100;

    const el = document.createElement('div');
    el.className = 'screen test-screen';
    el.innerHTML = `
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-text">Question ${current} of ${total}</div>
      <div class="question-card">
        <h2 class="question-text">${escapeHtml(q.text)}</h2>
      </div>
      <div class="options">
        ${[1,2,3,4].map(i => `
          <button class="option-btn" data-opt="${i}">
            <span class="option-label">${String.fromCharCode(64+i)}</span>
            <span class="option-text">${escapeHtml(q['option'+i])}</span>
          </button>
        `).join('')}
      </div>
      <button class="btn btn-skip" id="skipBtn">Skip Question →</button>
    `;
    container.appendChild(el);

    el.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = parseInt(btn.dataset.opt);
        state.answers[q.id] = opt;
        if (state.currentQuestion < total - 1) {
          state.currentQuestion++;
          render();
        } else {
          submitTest();
        }
      });
    });

    el.querySelector('#skipBtn').addEventListener('click', () => {
      if (state.currentQuestion < total - 1) {
        state.currentQuestion++;
        render();
      } else {
        submitTest();
      }
    });
  }

  async function submitTest() {
    showLoading();
    try {
      const result = await api('/tests/' + encodeURIComponent(state.test.code) + '/attempts', {
        method: 'POST',
        body: {
          userId: state.user.id,
          username: state.user.username,
          answers: state.answers
        }
      });
      state.results = result;
      state.screen = 'results';
    } catch (e) {
      showError('Failed to submit test. Please try again.');
    } finally {
      hideLoading();
      render();
    }
  }

  // ============ RESULTS SCREEN ============
  function renderResults(container) {
    const r = state.results;
    const el = document.createElement('div');
    el.className = 'screen results-screen';
    el.innerHTML = `
      <div class="score-circle" style="--score:${r.score}">
        <div class="score-value" id="scoreValue">0%</div>
        <div class="score-label">Score</div>
      </div>
      <div class="stats-row">
        <div class="stat-box correct">
          <div class="stat-value">${r.correctCount}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat-box incorrect">
          <div class="stat-value">${r.incorrectCount}</div>
          <div class="stat-label">Incorrect</div>
        </div>
        <div class="stat-box skipped">
          <div class="stat-value">${r.skippedCount}</div>
          <div class="stat-label">Skipped</div>
        </div>
      </div>
      <button class="btn btn-primary" id="reportBtn">See Report</button>
      <button class="btn btn-secondary" id="homeBtn">Take Another Test</button>
    `;
    container.appendChild(el);

    const scoreEl = el.querySelector('#scoreValue');
    animateScore(scoreEl, r.score);

    el.querySelector('#reportBtn').addEventListener('click', () => {
      state.screen = 'report';
      render();
    });
    el.querySelector('#homeBtn').addEventListener('click', () => {
      resetTestState();
      state.screen = 'welcome';
      render();
    });
  }

  // ============ REPORT SCREEN ============
  function renderReport(container) {
    const el = document.createElement('div');
    el.className = 'screen report-screen';

    let html = `<h2 class="report-title">Detailed Report</h2><div class="report-list">`;

    state.test.questions.forEach((q, idx) => {
      const ans = state.results.answers.find(a => a.questionId === q.id);
      let statusClass, statusText, userAnsText;

      if (ans.skipped) {
        statusClass = 'skipped';
        statusText = 'Skipped';
        userAnsText = '—';
      } else if (ans.correct) {
        statusClass = 'correct';
        statusText = 'Correct';
        userAnsText = String.fromCharCode(64 + ans.correctAnswer);
      } else {
        statusClass = 'incorrect';
        statusText = 'Incorrect';
        userAnsText = String.fromCharCode(64 + ans.userAnswer);
      }

      const correctText = String.fromCharCode(64 + ans.correctAnswer);

      html += `
        <div class="report-item ${statusClass}">
          <div class="report-header">
            <span class="report-number">Q${idx + 1}</span>
            <span class="report-status">${statusText}</span>
          </div>
          <div class="report-question">${escapeHtml(q.text)}</div>
          <div class="report-answers">
            <div>Your answer: <strong>${userAnsText}</strong></div>
            ${!ans.correct ? `<div>Correct answer: <strong class="correct-ans">${correctText}. ${escapeHtml(q['option' + ans.correctAnswer])}</strong></div>` : ''}
          </div>
        </div>
      `;
    });

    html += `</div><button class="btn btn-secondary" id="backBtn">Back to Results</button>`;
    el.innerHTML = html;
    container.appendChild(el);

    el.querySelector('#backBtn').addEventListener('click', () => {
      state.screen = 'results';
      render();
    });
  }

  // ============ ADMIN SCREEN ============
  function renderAdmin(container) {
    const el = document.createElement('div');
    el.className = 'screen admin-screen';
    el.innerHTML = `
      <h1 class="admin-title">Admin Panel</h1>
      <button class="btn btn-primary" id="createBtn">+ Create New Test</button>
      <h2 class="admin-subtitle">Existing Tests</h2>
      <div class="test-list" id="testList"><div class="loading">Loading tests...</div></div>
    `;
    container.appendChild(el);

    el.querySelector('#createBtn').addEventListener('click', () => {
      state.screen = 'adminCreate';
      render();
    });

    loadAdminTests();
  }

  async function loadAdminTests() {
    const list = document.getElementById('testList');
    if (!list) return;

    try {
      const tests = await api('/tests');
      state.adminTests = tests;

      if (tests.length === 0) {
        list.innerHTML = '<div class="empty">No tests yet. Create one!</div>';
        return;
      }

      list.innerHTML = tests.map(t => `
        <div class="test-card" data-code="${escapeHtml(t.code)}">
          <div class="test-info">
            <div class="test-code">${escapeHtml(t.code)}</div>
            <div class="test-title">${escapeHtml(t.title)}</div>
            <div class="test-meta">${escapeHtml(t.description || '')}</div>
          </div>
          <div class="test-actions">
            <button class="btn btn-small stats-btn">Stats</button>
            <button class="btn btn-small btn-danger delete-btn">Delete</button>
          </div>
        </div>
      `).join('');

      list.addEventListener('click', handleTestListClick);
    } catch (e) {
      list.innerHTML = '<div class="error">Failed to load tests</div>';
    }
  }

  function handleTestListClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const card = btn.closest('.test-card');
    const code = card?.dataset.code;
    if (!code) return;

    if (btn.classList.contains('stats-btn')) {
      state.selectedTestCode = code;
      state.screen = 'adminStats';
      render();
    } else if (btn.classList.contains('delete-btn')) {
      deleteTest(code);
    }
  }

  async function deleteTest(code) {
    if (!confirm('Delete test "' + code + '"? This cannot be undone.')) return;
    showLoading();
    try {
      await api('/tests/' + encodeURIComponent(code), { method: 'DELETE' });
      await loadAdminTests();
    } catch (e) {
      showError('Failed to delete test');
    } finally {
      hideLoading();
    }
  }

  // ============ ADMIN CREATE SCREEN ============
  function renderAdminCreate(container) {
    const el = document.createElement('div');
    el.className = 'screen admin-create-screen';
    el.innerHTML = `
      <h2>Create New Test</h2>
      <div class="form-group">
        <label>Test Code</label>
        <input type="text" id="testCode" class="form-input" placeholder="e.g. MATH101" maxlength="30">
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="testTitle" class="form-input" placeholder="Test title">
      </div>
      <div class="form-group">
        <label>Description (optional)</label>
        <input type="text" id="testDesc" class="form-input" placeholder="Short description">
      </div>
      <div id="questionsContainer"></div>
      <button class="btn btn-secondary" id="addQBtn">+ Add Question</button>
      <button class="btn btn-primary" id="saveBtn">Save Test</button>
      <button class="btn btn-text" id="cancelBtn">Cancel</button>
    `;
    container.appendChild(el);

    const qContainer = el.querySelector('#questionsContainer');
    let qCount = 0;

    function addQuestion() {
      qCount++;
      const qDiv = document.createElement('div');
      qDiv.className = 'question-form';
      qDiv.innerHTML = `
        <div class="question-header">
          <h4>Question ${qCount}</h4>
          <button class="btn btn-icon remove-q">×</button>
        </div>
        <input type="text" class="form-input q-text" placeholder="Question text">
        <div class="options-grid">
          ${[1,2,3,4].map(i => `
            <div class="option-input">
              <input type="radio" name="correct_${qCount}" value="${i}" ${i===1?'checked':''}>
              <input type="text" class="form-input opt-text" placeholder="Option ${String.fromCharCode(64+i)}">
            </div>
          `).join('')}
        </div>
      `;
      qDiv.querySelector('.remove-q').addEventListener('click', () => qDiv.remove());
      qContainer.appendChild(qDiv);
    }

    addQuestion();

    el.querySelector('#addQBtn').addEventListener('click', addQuestion);
    el.querySelector('#cancelBtn').addEventListener('click', () => {
      state.screen = 'admin';
      render();
    });
    el.querySelector('#saveBtn').addEventListener('click', async () => {
      const code = el.querySelector('#testCode').value.trim();
      const title = el.querySelector('#testTitle').value.trim();
      const description = el.querySelector('#testDesc').value.trim();

      if (!code || !title) return showError('Code and title are required');

      const questions = [];
      qContainer.querySelectorAll('.question-form').forEach(qEl => {
        const text = qEl.querySelector('.q-text').value.trim();
        const opts = [];
        let correct = 1;
        qEl.querySelectorAll('.option-input').forEach((optEl, idx) => {
          const radio = optEl.querySelector('input[type="radio"]');
          const txt = optEl.querySelector('.opt-text').value.trim();
          if (radio.checked) correct = idx + 1;
          opts.push(txt);
        });
        if (text && opts.every(o => o)) {
          questions.push({
            text, option1: opts[0], option2: opts[1], option3: opts[2], option4: opts[3],
            correctOption: correct
          });
        }
      });

      if (questions.length === 0) return showError('Add at least one complete question');

      showLoading();
      try {
        await api('/tests', {
          method: 'POST',
          body: { code, title, description, questions }
        });
        state.screen = 'admin';
        render();
      } catch (e) {
        showError(e.message || 'Failed to create test');
      } finally {
        hideLoading();
      }
    });
  }

  // ============ ADMIN STATS SCREEN ============
  function renderAdminStats(container) {
    const el = document.createElement('div');
    el.className = 'screen admin-stats-screen';
    el.innerHTML = `<div class="loading">Loading statistics...</div>`;
    container.appendChild(el);
    loadStatsData(el);
  }

  async function loadStatsData(container) {
    try {
      const stats = await api('/tests/' + encodeURIComponent(state.selectedTestCode) + '/stats');

      container.innerHTML = `
        <h2>Statistics: ${escapeHtml(state.selectedTestCode)}</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-value">${stats.totalAttempts}</div>
            <div class="summary-label">Total Attempts</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${stats.avgScore}%</div>
            <div class="summary-label">Average Score</div>
          </div>
        </div>
        <h3 class="admin-subtitle">Question Performance</h3>
        <div class="question-stats-list">
          ${stats.questionStats.map((q, idx) => {
            const total = q.correctCount + q.incorrectCount + q.skippedCount;
            const c = total > 0 ? (q.correctCount / total * 100) : 0;
            const i = total > 0 ? (q.incorrectCount / total * 100) : 0;
            const s = total > 0 ? (q.skippedCount / total * 100) : 0;
            return `
              <div class="q-stat-item">
                <div class="q-stat-text">${idx + 1}. ${escapeHtml(q.text.substring(0, 80))}${q.text.length > 80 ? '...' : ''}</div>
                <div class="q-stat-bars">
                  <div class="bar correct-bar" style="width:${c}%"></div>
                  <div class="bar incorrect-bar" style="width:${i}%"></div>
                  <div class="bar skipped-bar" style="width:${s}%"></div>
                </div>
                <div class="q-stat-legend">
                  <span>✓ ${q.correctCount}</span>
                  <span>✗ ${q.incorrectCount}</span>
                  <span>⊘ ${q.skippedCount}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-secondary" id="backBtn">Back to Admin</button>
      `;

      container.querySelector('#backBtn').addEventListener('click', () => {
        state.screen = 'admin';
        render();
      });
    } catch (e) {
      container.innerHTML = `
        <h2>Error</h2>
        <p class="error">Failed to load statistics</p>
        <button class="btn btn-secondary" id="backBtn">Back to Admin</button>
      `;
      container.querySelector('#backBtn').addEventListener('click', () => {
        state.screen = 'admin';
        render();
      });
    }
  }

  // ============ INIT ============
  initTelegram();
  render();
})();