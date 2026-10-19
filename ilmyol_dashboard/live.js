/**
 * IlmYo'l — Live data layer (Supabase)
 * Login, real data loading, role-based views and data entry.
 * Loaded after app.js; in demo mode the original app.js behaviour is untouched.
 */
(function () {
  const cfg = window.ILMYOL_SUPABASE;
  if (!window.supabase || !cfg) {
    // Supabase library failed to load (network/CDN) — keep demo usable and tell the user.
    window.enterDemo = function () {
      document.getElementById('authScreen').classList.add('hidden');
    };
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('authLoading');
      if (el) el.textContent = 'Serverga ulanib bo‘lmadi. Internetni tekshirib, sahifani yangilang.';
    });
    return;
  }
  const sb = window.supabase.createClient(cfg.url, cfg.key);

  const L = {
    mode: 'boot',            // 'boot' | 'demo' | 'live'
    user: null,
    me: null,
    profiles: [],
    plan: [], tasks: [], chapters: [], pubs: [], docs: [], evidence: [], comments: [], schol: [], plag: [], specs: [], orders: [],
    myDataTab: 'profile',
    config: {},
    deptFilterYear: 'ALL',
    deptFilterRisk: 'ALL'
  };

  // =====================================================================
  // Helpers
  // =====================================================================
  const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function fmtDate(s) {
    if (!s) return '—';
    const d = parseDate(s);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function daysUntil(s) {
    if (!s) return null;
    return Math.round((parseDate(s) - parseDate(todayStr())) / 86400000);
  }
  function daysLabel(s) {
    const n = daysUntil(s);
    if (n === null) return '';
    if (n < 0) return `${-n} kun o‘tdi`;
    if (n === 0) return 'Bugun';
    return `${n} kun qoldi`;
  }
  function addMonths(s, m) {
    if (!s) return null;
    const d = parseDate(s);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + m);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function pct(a, b) { return b > 0 ? Math.round((a * 100) / b) : 0; }
  function firstName(name) {
    const parts = (name || '').trim().split(/\s+/);
    return parts.length > 1 ? parts[1] : (parts[0] || '');
  }
  function avatarUrl(name) {
    const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#2563EB"/><text x="40" y="50" font-family="Inter,Arial" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">${esc(initials)}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function studyYear(start) {
    if (!start) return null;
    const days = -daysUntil(start);
    if (days < 0) return 1;
    return Math.min(4, Math.floor(days / 365) + 1);
  }
  function icons() { if (window.lucide) lucide.createIcons(); }

  function toast(msg, kind) {
    const el = document.createElement('div');
    const color = kind === 'error' ? 'bg-rose-600' : 'bg-emerald-600';
    el.className = `fixed bottom-5 right-5 z-[70] px-4 py-2.5 rounded-xl text-sm text-white shadow-xl ${color}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  function fail(err) {
    console.error('[IlmYol live]', err);
    toast(err && err.message ? err.message : 'Xatolik yuz berdi', 'error');
  }

  function openLiveModal(title, html) {
    document.getElementById('liveModalTitle').textContent = title;
    document.getElementById('liveModalBody').innerHTML = html;
    openModal('liveModal');
    icons();
  }
  function closeLiveModal() { closeModal('liveModal'); }

  const byId = (list, id) => list.find(x => x.id === id);
  const profileName = id => { const p = byId(L.profiles, id); return p ? (p.full_name || p.email) : '—'; };
  const role = () => (L.me ? L.me.role : null);

  // =====================================================================
  // Status dictionaries
  // =====================================================================
  const PLAN_STATUS = {
    todo: { label: 'Kutilmoqda', badge: 'badge-slate', icon: 'circle', iconCls: 'bg-slate-700/60 text-slate-300' },
    in_progress: { label: 'Jarayonda', badge: 'badge-blue', icon: 'play', iconCls: 'bg-blue-600 text-white' },
    submitted: { label: 'Tekshiruvda', badge: 'badge-amber', icon: 'clock', iconCls: 'bg-amber-500/20 text-amber-400' },
    approved: { label: 'Tasdiqlangan', badge: 'badge-emerald', icon: 'check', iconCls: 'bg-emerald-500 text-white' },
    returned: { label: 'Qaytarilgan', badge: 'badge-rose', icon: 'rotate-ccw', iconCls: 'bg-rose-500/20 text-rose-400' }
  };
  const PUB_STATUS = { planned: 'Rejada', writing: 'Yozilmoqda', submitted: 'Jurnalga yuborilgan', accepted: 'Qabul qilingan', published: 'Chop etilgan' };
  const DOC_STATUS = { missing: 'Tayyor emas', in_progress: 'Jarayonda', ready: 'Tayyor' };
  const ROLE_LABEL = { doctoral_student: 'Doktorant', supervisor: 'Ilmiy rahbar', department: 'Ilmiy bo‘lim' };

  // =====================================================================
  // Data
  // =====================================================================
  async function q(promise) {
    const { data, error } = await promise;
    if (error) throw error;
    return data || [];
  }

  async function loadAll() {
    const [profiles, plan, tasks, chapters, pubs, docs, evidence, comments, config, schol, plag, specs, orders] = await Promise.all([
      q(sb.from('profiles').select('*').order('full_name')),
      q(sb.from('plan_items').select('*')),
      q(sb.from('tasks').select('*').order('created_at', { ascending: false })),
      q(sb.from('chapters').select('*').order('sort_order')),
      q(sb.from('publications').select('*').order('created_at')),
      q(sb.from('documents').select('*').order('created_at')),
      q(sb.from('evidence_files').select('*').order('created_at', { ascending: false })),
      q(sb.from('comments').select('*').order('created_at', { ascending: false }).limit(500)),
      q(sb.from('app_config').select('*')),
      q(sb.from('scholarship_items').select('*').order('created_at')),
      q(sb.from('plagiarism_services').select('*').order('sort_order')),
      q(sb.from('specialties').select('*').order('code')),
      q(sb.from('admission_orders').select('*').order('order_date', { ascending: false }))
    ]);
    Object.assign(L, { profiles, plan, tasks, chapters, pubs, docs, evidence, comments, schol, plag, specs, orders });
    L.config = Object.fromEntries(config.map(c => [c.key, c.value]));
    L.me = byId(profiles, L.user.id) || null;
  }

  async function reload() {
    try {
      await loadAll();
      applyHeader();
      rerender();
    } catch (e) { fail(e); }
  }

  function sortPlan(items) {
    return items.slice().sort((a, b) =>
      (a.year - b.year) || (a.sort_order - b.sort_order) ||
      ((a.due_date || '9999') < (b.due_date || '9999') ? -1 : (a.due_date || '9999') > (b.due_date || '9999') ? 1 : 0) ||
      (a.created_at < b.created_at ? -1 : 1));
  }

  function stats(sid) {
    const p = byId(L.profiles, sid) || {};
    const plan = sortPlan(L.plan.filter(x => x.student_id === sid));
    const today = todayStr();
    const approved = plan.filter(x => x.status === 'approved').length;
    const overdue = plan.filter(x => !['approved', 'submitted'].includes(x.status) && x.due_date && x.due_date < today);
    const maxLate = overdue.reduce((m, x) => Math.max(m, -daysUntil(x.due_date)), 0);
    const chapters = L.chapters.filter(x => x.student_id === sid);
    const pagesDone = chapters.reduce((s, c) => s + (c.pages_done || 0), 0);
    const pagesTotal = chapters.reduce((s, c) => s + (c.pages_total || 0), 0);
    const pubs = L.pubs.filter(x => x.student_id === sid);
    const docs = L.docs.filter(x => x.student_id === sid);
    let risk = 'none';
    if (plan.length) risk = overdue.length === 0 ? 'ok' : (maxLate > 30 ? 'high' : 'medium');
    return {
      profile: p, plan, approved,
      progress: pct(approved, plan.length),
      current: plan.find(x => x.status !== 'approved') || null,
      overdue, maxLate, risk,
      pending: plan.filter(x => x.status === 'submitted'),
      returned: plan.filter(x => x.status === 'returned'),
      chapters, pagesDone, pagesTotal, dissPct: pct(pagesDone, pagesTotal),
      pubs, pubsDone: pubs.filter(x => x.status === 'published').length,
      docs, docsReady: docs.filter(x => x.status === 'ready').length,
      year: studyYear(p.start_date)
    };
  }
  const RISK = {
    none: { label: 'Reja kiritilmagan', badge: 'badge-slate' },
    ok: { label: 'Reja bo‘yicha', badge: 'badge-emerald' },
    medium: { label: 'O‘rta risk', badge: 'badge-amber' },
    high: { label: 'Yuqori risk', badge: 'badge-rose' }
  };

  // =====================================================================
  // Boot / auth
  // =====================================================================
  function showAuth(show) {
    document.getElementById('authScreen').classList.toggle('hidden', !show);
  }
  function setAuthMsg(msg, kind) {
    const el = document.getElementById('authMsg');
    el.textContent = msg || '';
    el.className = 'text-xs min-h-[1rem] ' + (kind === 'error' ? 'text-rose-400' : 'text-emerald-400');
  }

  window.setAuthTab = function (tab) {
    const signup = tab === 'signup';
    document.getElementById('authNameRow').classList.toggle('hidden', !signup);
    document.getElementById('authSubmitBtn').textContent = signup ? 'Ro‘yxatdan o‘tish' : 'Kirish';
    document.getElementById('authTabLogin').classList.toggle('auth-tab-active', !signup);
    document.getElementById('authTabSignup').classList.toggle('auth-tab-active', signup);
    document.getElementById('authForm').dataset.mode = tab;
    // lets the browser's password manager offer a saved password (login) or a new strong one (sign up)
    document.getElementById('authPassword').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
    setAuthMsg('');
  };

  // ---- "Remember me": email is remembered here; the password only by the browser's own password manager ----
  const REMEMBER_EMAIL = 'ilmyol_email', SESSION_ONLY = 'ilmyol_session_only', SESSION_ALIVE = 'ilmyol_alive';
  const store = {
    get: (s, k) => { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: (s, k, v) => { try { window[s].setItem(k, v); } catch (e) { /* storage blocked */ } },
    del: (s, k) => { try { window[s].removeItem(k); } catch (e) { /* storage blocked */ } }
  };

  async function rememberLogin(email, password, name) {
    const remember = document.getElementById('authRemember').checked;
    if (remember) {
      store.set('localStorage', REMEMBER_EMAIL, email);
      store.del('localStorage', SESSION_ONLY);
    } else {
      store.del('localStorage', REMEMBER_EMAIL);
      store.set('localStorage', SESSION_ONLY, '1');
      store.set('sessionStorage', SESSION_ALIVE, '1');
    }
    // Ask the browser to save the password (Chrome/Edge); other browsers detect the form themselves.
    if (remember && window.PasswordCredential && navigator.credentials) {
      try { await navigator.credentials.store(new PasswordCredential({ id: email, password, name: name || email })); } catch (e) { /* user declined */ }
    }
  }

  window.submitAuth = async function (e) {
    e.preventDefault();
    const mode = document.getElementById('authForm').dataset.mode || 'login';
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');
    btn.disabled = true;
    try {
      if (mode === 'signup') {
        const fullName = document.getElementById('authName').value.trim();
        if (!fullName) throw new Error('F.I.Sh. ni kiriting');
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: location.origin + location.pathname }
        });
        if (error) throw error;
        await rememberLogin(email, password, fullName);
        if (data.session) { await enterLive(data.session.user); }
        else setAuthMsg('Emailingizga tasdiqlash xati yuborildi. Havolani bosing, keyin shu yerda kiring.');
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email yoki parol noto‘g‘ri. Parolni eslay olmasangiz, pastdagi “Parolni unutdingizmi? — tiklash” tugmasini bosing.' :
          error.message === 'Email not confirmed' ? 'Email hali tasdiqlanmagan — pochtangizni tekshiring' : error.message);
        await rememberLogin(email, password);
        await enterLive(data.user);
      }
    } catch (err) {
      setAuthMsg(err.message || 'Xatolik', 'error');
    } finally {
      btn.disabled = false;
    }
  };

  window.forgotPassword = async function () {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) { setAuthMsg('Avval emailingizni kiriting', 'error'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    setAuthMsg(error ? error.message : 'Parolni tiklash havolasi emailingizga yuborildi.', error ? 'error' : 'ok');
  };

  window.enterDemo = function () {
    L.mode = 'demo';
    try { sessionStorage.setItem('ilmyol_demo', '1'); } catch (e) { /* ignore */ }
    showAuth(false);
    document.getElementById('demoBanner').classList.remove('hidden');
    setRailAuthButton();
  };

  window.leaveDemo = function () {
    try { sessionStorage.removeItem('ilmyol_demo'); } catch (e) { /* ignore */ }
    location.reload();
  };

  window.liveSignOut = async function () {
    await sb.auth.signOut();
    location.reload();
  };

  async function enterLive(user) {
    L.mode = 'live';
    L.user = user;
    try { sessionStorage.removeItem('ilmyol_demo'); } catch (e) { /* ignore */ }
    await loadAll();
    if (!L.me) throw new Error('Profil topilmadi');
    showAuth(false);
    document.getElementById('demoBanner').classList.add('hidden');
    document.body.classList.add('live-mode');
    applyRoleUi();
    applyHeader();
    if (L.me.topic) {
      IlmYolData.student.topic = L.me.topic;
      IlmYolData.student.name = L.me.full_name;
      const input = document.getElementById('topicSearchInput');
      if (input) input.value = L.me.topic;
      AppState.currentInputTopic = null;
    }
    const needsProfile = role() === 'doctoral_student' && (!L.me.topic || !L.me.start_date);
    if (needsProfile) { L.myDataTab = 'profile'; switchView('mydata'); }
    else switchView(landingView());
    if (L.recovery) showRecoveryModal();
  }

  function showRecoveryModal() {
    L.recovery = false;
    openLiveModal('Yangi parol o‘rnating', `
      <p class="text-sm text-slate-300">Parolni tiklash havolasi orqali kirdingiz. Endi yangi parol yozing — keyingi safar shu parol bilan kirasiz.</p>
      <form onsubmit="liveChangePassword(event)" class="space-y-3">
        <div><label class="live-label">Yangi parol</label>
          <input id="newPassword" type="password" minlength="8" required autocomplete="new-password" class="live-input" placeholder="Kamida 8 belgi"></div>
        <button class="btn-primary w-full">Parolni saqlash</button>
      </form>`);
    setTimeout(() => { const el = document.getElementById('newPassword'); if (el) el.focus(); }, 50);
  }

  function landingView() {
    return role() === 'supervisor' ? 'supervisor' : role() === 'department' ? 'department' : 'dashboard';
  }
  function allowedViews() {
    if (role() === 'supervisor') return ['supervisor', 'journals', 'topic_novelty', 'mydata'];
    if (role() === 'department') return ['department', 'supervisor', 'journals', 'topic_novelty', 'mydata'];
    return ['dashboard', 'roadmap', 'topic_novelty', 'journals', 'plagiarism', 'dissertation', 'calendar', 'defense', 'scholarship', 'formatting', 'mydata'];
  }

  function applyRoleUi() {
    const allowed = allowedViews();
    document.querySelectorAll('#mainSidebar [data-view]').forEach(btn => {
      btn.classList.toggle('hidden', !allowed.includes(btn.dataset.view));
    });
    const ai = document.getElementById('nav-ai');
    if (ai) ai.classList.add('hidden');
    const roleWrap = document.getElementById('roleSelectorWrap');
    if (roleWrap) roleWrap.classList.add('hidden');
    const supLabel = document.querySelector('#nav-supervisor span:last-child');
    if (supLabel) supLabel.textContent = role() === 'department' ? 'Rahbarlar' : 'Doktorantlar';
    setRailAuthButton();
  }

  function setRailAuthButton() {
    const btn = document.getElementById('railAuthBtn');
    if (!btn) return;
    if (L.mode === 'live') {
      btn.onclick = () => window.liveSignOut();
      btn.querySelector('span:last-child').textContent = 'Chiqish';
      btn.querySelector('.rail-icon').innerHTML = '<i data-lucide="log-out" class="w-5 h-5"></i>';
    } else {
      btn.onclick = () => window.leaveDemo();
      btn.querySelector('span:last-child').textContent = 'Kirish';
      btn.querySelector('.rail-icon').innerHTML = '<i data-lucide="log-in" class="w-5 h-5"></i>';
    }
    icons();
  }

  function applyHeader() {
    if (!L.me) return;
    const name = L.me.full_name || L.me.email;
    const y = studyYear(L.me.start_date);
    document.getElementById('userNameDisplay').textContent = name;
    document.getElementById('userStatusDisplay').textContent =
      ROLE_LABEL[L.me.role] + (L.me.role === 'doctoral_student' && y ? ` • ${y}-yil` : '');
    document.getElementById('userAvatarImg').src = avatarUrl(name);
    const badge = document.getElementById('notifBadge');
    const n = notificationItems().length;
    if (badge) { badge.textContent = n; badge.classList.toggle('hidden', n === 0); }
  }

  // =====================================================================
  // View routing overrides
  // =====================================================================
  const origSwitchView = window.switchView;
  window.switchView = function (view) {
    if (L.mode === 'live' && !allowedViews().includes(view)) view = landingView();
    if (window.onbeforeunload && AppState.currentView === 'mydata' && view !== 'mydata') {
      if (!confirm('Profildagi o‘zgarishlar saqlanmagan. Saqlamasdan chiqilsinmi?')) return;
      window.onbeforeunload = null;
    }
    origSwitchView(view);
    if (L.mode === 'live') renderLiveView(view);
  };

  const LIVE_RENDER = {
    dashboard: renderDashboard,
    roadmap: renderPlanView,
    dissertation: renderChaptersView,
    calendar: renderCalendarView,
    defense: renderDefenseView,
    scholarship: renderScholarshipView,
    journals: renderJournalsView,
    formatting: renderFormattingView,
    plagiarism: renderPlagiarismView,
    supervisor: renderSupervisorView,
    department: renderDepartmentView,
    mydata: renderMyDataView
  };
  function renderLiveView(view) {
    const fn = LIVE_RENDER[view];
    const el = document.getElementById(`view-${view}`);
    if (!fn || !el) return;
    el.className = 'space-y-6 max-w-6xl';
    el.innerHTML = fn();
    icons();
  }
  function rerender() {
    if (L.mode === 'live') renderLiveView(AppState.currentView);
  }

  // Header / modal entry points
  const origProfile = window.openProfileModal;
  window.openProfileModal = function () {
    if (L.mode !== 'live') return origProfile();
    L.myDataTab = 'profile';
    switchView('mydata');
  };
  const origSettings = window.openSettingsModal;
  window.openSettingsModal = function () {
    if (L.mode !== 'live') return origSettings();
    openLiveModal('Sozlamalar', `
      <div class="p-3 rounded-xl bg-[#0C1427] border border-[#1D3058] text-sm space-y-1">
        <div class="text-slate-400 text-xs">Akkaunt</div>
        <div class="text-slate-100">${esc(L.me.email)}</div>
        <div class="text-xs text-slate-400">${esc(ROLE_LABEL[L.me.role])}</div>
      </div>
      <form onsubmit="liveChangePassword(event)" class="space-y-2">
        <label class="live-label">Yangi parol</label>
        <input id="newPassword" type="password" minlength="8" required class="live-input" placeholder="Kamida 8 belgi">
        <button class="btn-primary">Parolni o‘zgartirish</button>
      </form>
      ${telegramBox()}
      <button onclick="liveSignOut()" class="btn-ghost w-full">Chiqish</button>
    `);
  };

  // ---- Telegram linking ----
  function telegramBox() {
    const bot = L.config.telegram_bot_username;
    const linked = !!L.me.telegram_chat_id;
    let body;
    if (!bot) {
      body = '<p class="text-xs text-slate-400">Telegram bot hali sozlanmagan.</p>';
    } else if (linked) {
      body = `<p class="text-sm text-emerald-300 flex items-center gap-2"><i data-lucide="check-circle-2" class="w-4 h-4"></i> Ulangan — eslatmalar @${esc(bot)} orqali keladi</p>
        <button onclick="unlinkTelegram()" class="text-xs text-slate-400 hover:text-rose-300">Uzish</button>`;
    } else {
      body = `<p class="text-xs text-slate-400">Muddat eslatmalari va rahbar javoblari Telegram’ga keladi. Rahbarlar ishni bot ichida bir bosishda tasdiqlaydi.</p>
        <button onclick="linkTelegram()" class="btn-primary">Telegram’ni ulash</button>`;
    }
    return `<div class="p-3 rounded-xl bg-[#0C1427] border border-[#1D3058] space-y-2">
      <div class="text-slate-400 text-xs">Telegram eslatmalari</div>${body}</div>`;
  }

  window.linkTelegram = async function () {
    const bot = L.config.telegram_bot_username;
    const code = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    await sb.from('telegram_link_codes').delete().eq('user_id', L.me.id);
    const { error } = await sb.from('telegram_link_codes').insert({ code });
    if (error) return fail(error);
    openLiveModal('Telegram’ni ulash', `
      <div class="space-y-2">
        <div class="text-sm font-semibold text-white">1. Shu buyruqni nusxalang</div>
        <div class="flex gap-2">
          <input id="tgStartCmd" readonly value="/start ${code}" class="live-input font-mono text-xs" onclick="this.select()">
          <button onclick="copyTgCommand()" class="btn-primary shrink-0">Nusxalash</button>
        </div>
      </div>
      <div class="space-y-1">
        <div class="text-sm font-semibold text-white">2. Telegram’da @${esc(bot)} botiga yuboring</div>
        <p class="text-xs text-slate-400">Telegram’da <b>@${esc(bot)}</b> ni oching, xabar maydoniga joylang (Ctrl+V) va yuboring. Bot “✅ Ulandi” deb javob beradi.</p>
        <a href="https://t.me/${esc(bot)}?start=${code}" target="_blank" rel="noopener" class="text-xs text-blue-400 hover:text-blue-300">Yoki botni shu havola orqali oching →</a>
      </div>
      <div class="space-y-1">
        <div class="text-sm font-semibold text-white">3. Shu yerga qaytib tekshiring</div>
        <button onclick="checkTelegramLinked()" class="btn-ghost w-full">Tekshirish</button>
      </div>
      <p class="text-xs text-slate-500">Buyruq 15 daqiqa amal qiladi. Bot tokenini emas, aynan shu buyruqni yuboring.</p>`);
  };

  window.copyTgCommand = async function () {
    const el = document.getElementById('tgStartCmd');
    try { await navigator.clipboard.writeText(el.value); toast('Nusxalandi — endi botga joylang'); }
    catch (e) { el.select(); document.execCommand('copy'); toast('Nusxalandi'); }
  };

  window.checkTelegramLinked = async function () {
    await reload();
    if (L.me.telegram_chat_id) { toast('Telegram ulandi'); window.openSettingsModal(); }
    else toast('Hali ulanmagan — botda START ni bosing', 'error');
  };

  window.unlinkTelegram = async function () {
    if (!confirm('Telegram eslatmalari uzilsinmi?')) return;
    const { error } = await sb.from('profiles').update({ telegram_chat_id: null }).eq('id', L.me.id);
    if (error) return fail(error);
    await reload();
    toast('Uzildi');
    window.openSettingsModal();
  };
  window.liveChangePassword = async function (e) {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: document.getElementById('newPassword').value });
    if (error) fail(error); else { toast('Parol yangilandi'); closeLiveModal(); }
  };

  const origSupContact = window.openSupervisorContactModal;
  window.openSupervisorContactModal = function () {
    if (L.mode !== 'live') return origSupContact();
    const s = L.me.supervisor_id ? byId(L.profiles, L.me.supervisor_id) : null;
    if (!s) {
      openLiveModal('Ilmiy rahbar', '<p class="text-sm text-slate-300">Sizga hali ilmiy rahbar biriktirilmagan. Uni ilmiy bo‘lim biriktiradi.</p>');
      return;
    }
    openLiveModal('Ilmiy rahbar', `
      <div class="flex items-center gap-3">
        <img src="${avatarUrl(s.full_name)}" class="w-12 h-12 rounded-full" alt="">
        <div><div class="font-semibold text-white">${esc(s.full_name)}</div><div class="text-xs text-slate-400">${esc(s.academic_title || '')}</div></div>
      </div>
      <div class="p-3 rounded-xl bg-[#0C1427] border border-[#1D3058] text-sm space-y-1.5">
        <div><span class="text-slate-400">Email:</span> ${s.email ? `<a class="text-blue-400" href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : '—'}</div>
        <div><span class="text-slate-400">Telefon:</span> ${esc(s.phone || '—')}</div>
        <div><span class="text-slate-400">Kafedra:</span> ${esc(s.department || '—')}</div>
      </div>`);
  };

  // Notifications
  function notificationItems() {
    if (!L.me) return [];
    const items = [];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const mine = role() === 'doctoral_student';
    const visibleStudents = mine ? [L.me.id] : L.profiles.filter(p => p.role === 'doctoral_student').map(p => p.id);
    L.comments.filter(c => c.author_id !== L.me.id && c.created_at > weekAgo && visibleStudents.includes(c.student_id))
      .slice(0, 10).forEach(c => items.push({ text: `${profileName(c.author_id)}: ${c.body}`, when: c.created_at.slice(0, 10), planId: c.plan_item_id }));
    if (mine) {
      L.plan.filter(p => p.student_id === L.me.id && p.reviewed_at && p.reviewed_at > weekAgo)
        .forEach(p => items.push({ text: `“${p.title}” — ${PLAN_STATUS[p.status].label.toLowerCase()}`, when: p.reviewed_at.slice(0, 10), planId: p.id }));
      L.plan.filter(p => p.student_id === L.me.id && !['approved', 'submitted'].includes(p.status) && p.due_date && daysUntil(p.due_date) <= 7)
        .forEach(p => items.push({ text: `Muddat: “${p.title}” (${daysLabel(p.due_date)})`, when: p.due_date, planId: p.id }));
    } else if (role() === 'supervisor') {
      L.plan.filter(p => p.status === 'submitted' && p.student_id !== L.me.id)
        .forEach(p => items.push({ text: `${profileName(p.student_id)} tekshiruvga yubordi: “${p.title}”`, when: (p.updated_at || '').slice(0, 10), planId: p.id }));
    }
    return items;
  }
  const origNotifs = window.renderNotifications;
  window.renderNotifications = function () {
    if (L.mode !== 'live') return origNotifs();
    const c = document.getElementById('notificationsListContainer');
    if (!c) return;
    const items = notificationItems();
    c.innerHTML = items.length ? items.map(i => `
      <button onclick="closeModal('notificationsModal'); ${i.planId ? `openPlanItem('${esc(i.planId)}')` : ''}" class="w-full text-left p-2.5 rounded-lg bg-[#0C1427] border border-[#1D3058] hover:border-blue-500">
        <div class="text-slate-200 text-xs">${esc(i.text)}</div>
        <div class="text-[10px] text-slate-500 mt-1">${esc(fmtDate(i.when))}</div>
      </button>`).join('') : '<p class="text-xs text-slate-400">Yangi xabarlar yo‘q.</p>';
  };
  const origOpenModal = window.openModal;
  window.openModal = function (id) {
    if (id === 'notificationsModal') window.renderNotifications();
    if (L.mode === 'live' && id === 'publicationsModal') { L.myDataTab = 'publications'; return switchView('mydata'); }
    if (L.mode === 'live' && (id === 'documentsModal' || id === 'attestationDocsModal')) { L.myDataTab = 'documents'; return switchView('mydata'); }
    return origOpenModal(id);
  };

  // =====================================================================
  // Student dashboard
  // =====================================================================
  function renderDashboard() {
    const s = stats(L.me.id);
    const hello = `<h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Xush kelibsiz, ${esc(firstName(L.me.full_name))} 👋</h1>`;

    if (!s.plan.length) {
      const step = (n, title, sub, tab, done) => `
        <button onclick="goMyData('${tab}')" class="step-row w-full text-left">
          <span class="step-icon ${done ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}">${done ? '<i data-lucide="check" class="w-5 h-5"></i>' : `<span class="font-bold">${n}</span>`}</span>
          <div class="flex-1 min-w-0"><div class="step-title">${title}</div><div class="text-xs text-slate-400 mt-0.5">${sub}</div></div>
          <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
        </button>`;
      return `${hello}
        <div class="rounded-2xl p-6 bg-gradient-to-br from-[#16264A] to-[#101B35] border border-[#1D3058]">
          <h2 class="text-xl font-bold text-white">Boshlash uchun 3 qadam</h2>
          <p class="text-sm text-slate-400 mt-1">Ma’lumotlaringizni bir marta kiriting — keyin sayt progress va muddatlarni o‘zi hisoblaydi.</p>
          <div class="space-y-2.5 mt-5">
            ${step(1, 'Profilni to‘ldiring', 'Mavzu, ixtisoslik, doktoranturaga kirgan sana', 'profile', !!(L.me.topic && L.me.start_date))}
            ${step(2, 'Individual rejani kiriting', 'Andoza bilan 1 bosishda boshlash mumkin', 'plan', false)}
            ${step(3, 'Boblar, maqolalar va hujjatlar', 'Dissertatsiya va hujjatlar holati', 'chapters', s.chapters.length > 0)}
          </div>
        </div>`;
    }

    const cur = s.current;
    const curIdx = cur ? s.plan.indexOf(cur) : s.plan.length;
    const next = cur ? s.plan.slice(curIdx + 1).find(x => x.status !== 'approved') : null;
    const hero = cur ? `
      <div class="lg:col-span-2 rounded-2xl p-5 bg-gradient-to-br from-[#16264A] to-[#101B35] border border-[#1D3058] flex flex-col sm:flex-row gap-5">
        <div class="sm:w-44 h-36 sm:h-auto rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex flex-col items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/40">
          <i data-lucide="book-open-check" class="w-10 h-10 mb-2"></i>
          <span class="text-sm font-bold">${cur.year}-yil</span>
        </div>
        <div class="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex items-center gap-2"><p class="text-xs text-slate-400">Hozirgi bosqich</p><span class="step-badge ${PLAN_STATUS[cur.status].badge}">${PLAN_STATUS[cur.status].label}</span></div>
            <h2 class="text-xl font-bold text-white mt-1">${esc(cur.title)}</h2>
            <div class="flex items-center gap-3 mt-4">
              <div class="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden"><div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" style="width:${s.progress}%"></div></div>
              <span class="text-sm font-semibold text-slate-200 font-mono">${s.progress}%</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Reja: ${s.approved} / ${s.plan.length} band tasdiqlangan</p>
            ${next ? `<p class="text-sm text-slate-300 mt-3 truncate"><span class="text-slate-500">Keyingi:</span> ${esc(next.title)}</p>` : ''}
          </div>
          <div class="flex flex-wrap items-center gap-3 mt-5">
            <button onclick="openPlanItem('${cur.id}')" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition active:scale-95">Davom etish</button>
            ${cur.due_date ? `<span class="text-xs font-medium ${daysUntil(cur.due_date) < 0 ? 'text-rose-400' : 'text-amber-400'} flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ${daysLabel(cur.due_date)}</span>` : ''}
          </div>
        </div>
      </div>` : `
      <div class="lg:col-span-2 rounded-2xl p-6 bg-gradient-to-br from-emerald-900/40 to-[#101B35] border border-emerald-500/30">
        <h2 class="text-xl font-bold text-white">🎉 Rejadagi barcha bandlar tasdiqlangan</h2>
        <p class="text-sm text-slate-300 mt-2">Himoyaga tayyorlik bo‘limini tekshiring.</p>
      </div>`;

    const openTasks = L.tasks.filter(t => t.student_id === L.me.id).sort((a, b) => (a.done - b.done) || ((a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1));
    const doneCount = openTasks.filter(t => t.done).length;
    const tasksCard = `
      <div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold text-white">Vazifalar</h3>
          <span class="text-xs text-slate-400 font-mono">${doneCount} / ${openTasks.length}</span>
        </div>
        <div class="space-y-1 flex-1">
          ${openTasks.slice(0, 6).map(taskRow).join('') || '<p class="text-xs text-slate-500 py-3">Hozircha vazifa yo‘q.</p>'}
        </div>
        <button onclick="quickAddTask()" class="mt-3 w-full py-2 rounded-lg border border-dashed border-[#1D3058] hover:border-slate-500 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Qo‘shish
        </button>
      </div>`;

    let alerts = telegramNudge();
    if (s.returned.length) alerts += alertRow('rotate-ccw', 'rose', `Rahbar <b>${s.returned.length} ta</b> bandni qayta ishlashga qaytardi`, `openPlanItem('${s.returned[0].id}')`);
    if (s.overdue.length) alerts += alertRow('alert-triangle', 'amber', `<b>${s.overdue.length} ta</b> reja bandining muddati o‘tgan (eng ko‘pi ${s.maxLate} kun)`, `switchView('roadmap')`);

    const tiles = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${tile("switchView('roadmap')", 'target', 'blue', `${s.progress}%`, 'Individual reja')}
        ${tile("switchView('dissertation')", 'book-marked', 'indigo', s.pagesTotal ? `${s.dissPct}%` : '—', 'Dissertatsiya')}
        ${tile("goMyData('publications')", 'newspaper', 'emerald', `${s.pubsDone} / ${s.pubs.length}`, 'Maqolalar')}
        ${tile("goMyData('documents')", 'folder-check', 'teal', `${s.docsReady} / ${s.docs.length}`, 'Hujjatlar')}
      </div>`;

    const from = Math.max(0, curIdx - 2);
    const steps = s.plan.slice(from, from + 6);
    const road = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-white">Yo‘l xaritasi</h3>
          <button onclick="switchView('roadmap')" class="text-xs font-medium text-blue-400 hover:text-blue-300">Hammasi →</button>
        </div>
        <div class="space-y-2.5">${steps.map(p => planRow(p, cur && p.id === cur.id)).join('')}</div>
      </div>`;

    return `${hello}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">${hero}${tasksCard}</div>
      ${alerts}${tiles}${road}`;
  }

  function telegramNudge() {
    if (!L.config.telegram_bot_username || L.me.telegram_chat_id) return '';
    return alertRow('send', 'blue', 'Telegram’ni ulang — muddat eslatmalari va rahbar javoblari telefoningizga keladi', 'openSettingsModal()');
  }

  function alertRow(icon, color, html, onclick) {
    return `<button onclick="${onclick}" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-${color}-500/10 border border-${color}-500/25 text-left hover:bg-${color}-500/15 transition">
      <i data-lucide="${icon}" class="w-5 h-5 text-${color}-400 shrink-0"></i>
      <span class="text-sm text-${color}-100 flex-1">${html}</span>
      <i data-lucide="chevron-right" class="w-4 h-4 text-${color}-400"></i></button>`;
  }
  function tile(onclick, icon, color, value, label) {
    return `<button onclick="${onclick}" class="stat-tile">
      <span class="stat-icon bg-${color}-500/15 text-${color}-400"><i data-lucide="${icon}" class="w-5 h-5"></i></span>
      <span class="stat-value">${value}</span><span class="stat-label">${label}</span></button>`;
  }
  function taskRow(t) {
    return `<label class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/40 cursor-pointer ${t.done ? 'opacity-60' : ''}">
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="liveToggleTask('${t.id}', this.checked)" class="custom-checkbox mt-0.5">
      <span class="flex-1 min-w-0">
        <span class="block text-xs ${t.done ? 'line-through text-slate-400' : 'text-slate-200'} font-medium">${esc(t.title)}</span>
        ${t.due_date ? `<span class="text-[10px] ${!t.done && daysUntil(t.due_date) < 0 ? 'text-rose-400' : 'text-slate-400'}">${fmtDate(t.due_date)}</span>` : ''}
      </span></label>`;
  }
  function planRow(p, isCurrent) {
    const st = PLAN_STATUS[p.status];
    const late = !['approved', 'submitted'].includes(p.status) && p.due_date && daysUntil(p.due_date) < 0;
    return `<button onclick="openPlanItem('${p.id}')" class="step-row w-full text-left ${isCurrent ? 'step-current' : ''}">
      <span class="step-icon ${st.iconCls}"><i data-lucide="${st.icon}" class="w-5 h-5"></i></span>
      <div class="min-w-0 flex-1">
        <div class="step-meta">${p.year}-yil <span class="step-badge ${st.badge}">${st.label}</span>
          ${p.due_date ? `<span class="normal-case tracking-normal font-medium ${late ? 'text-rose-400' : 'text-slate-500'}">${fmtDate(p.due_date)}${late ? ` · ${daysLabel(p.due_date)}` : ''}</span>` : ''}</div>
        <div class="step-title truncate">${esc(p.title)}</div>
      </div>
      <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400 shrink-0"></i></button>`;
  }

  window.goMyData = function (tab) { L.myDataTab = tab; switchView('mydata'); };

  window.liveToggleTask = async function (id, done) {
    const { error } = await sb.from('tasks').update({ done }).eq('id', id);
    if (error) return fail(error);
    const t = byId(L.tasks, id); if (t) t.done = done;
    rerender();
  };
  window.quickAddTask = function (studentId) {
    const sid = studentId || L.me.id;
    openLiveModal('Yangi vazifa', `
      <form onsubmit="saveQuickTask(event, '${sid}')" class="space-y-3">
        <div><label class="live-label">Vazifa</label><input id="qtTitle" required class="live-input" placeholder="Masalan: 2.1-paragrafni tugatish"></div>
        <div><label class="live-label">Muddat</label><input id="qtDue" type="date" class="live-input"></div>
        <button class="btn-primary w-full">Saqlash</button>
      </form>`);
    setTimeout(() => document.getElementById('qtTitle').focus(), 50);
  };
  window.saveQuickTask = async function (e, sid) {
    e.preventDefault();
    const { error } = await sb.from('tasks').insert({
      student_id: sid, title: document.getElementById('qtTitle').value.trim(),
      due_date: document.getElementById('qtDue').value || null
    });
    if (error) return fail(error);
    closeLiveModal(); toast('Vazifa qo‘shildi'); reload();
  };
  // Keep app.js buttons working in live mode
  const origAddTask = window.openAddTaskModal;
  window.openAddTaskModal = function () { return L.mode === 'live' ? window.quickAddTask() : origAddTask(); };

  // =====================================================================
  // Plan item details (student + supervisor)
  // =====================================================================
  window.openPlanItem = function (id) {
    const p = byId(L.plan, id);
    if (!p) return;
    const st = PLAN_STATUS[p.status];
    const isOwner = p.student_id === L.me.id;
    const canReview = !isOwner && (role() === 'department' || byId(L.profiles, p.student_id)?.supervisor_id === L.me.id);
    const files = L.evidence.filter(f => f.plan_item_id === id);
    const comments = L.comments.filter(c => c.plan_item_id === id).slice().reverse();
    const hasSupervisor = !!byId(L.profiles, p.student_id)?.supervisor_id;

    let actions = '';
    if (isOwner) {
      if (['todo', 'returned'].includes(p.status)) actions += `<button onclick="setPlanStatus('${id}','in_progress')" class="btn-ghost">Boshladim</button>`;
      if (['todo', 'in_progress', 'returned'].includes(p.status)) actions += `<button onclick="setPlanStatus('${id}','submitted')" class="btn-primary">Rahbarga yuborish</button>`;
      if (p.status === 'submitted') actions += `<span class="text-xs text-amber-300">Rahbar tekshiruvida</span>`;
      if (p.status === 'submitted' && !hasSupervisor) actions += `<span class="text-xs text-slate-400">Sizga hali ilmiy rahbar biriktirilmagan</span>`;
    }
    if (canReview && p.status === 'submitted') {
      actions += `<button onclick="reviewPlan('${id}','approved')" class="btn-primary !bg-emerald-600 hover:!bg-emerald-500">Tasdiqlash</button>
                  <button onclick="reviewPlan('${id}','returned')" class="btn-ghost !text-rose-300">Qaytarish</button>`;
    }

    openLiveModal(p.title, `
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="step-badge ${st.badge}">${st.label}</span>
        <span class="text-slate-400">${p.year}-yil</span>
        ${p.due_date ? `<span class="text-slate-300">Muddat: ${fmtDate(p.due_date)}</span><span class="${daysUntil(p.due_date) < 0 && p.status !== 'approved' ? 'text-rose-400' : 'text-amber-400'}">${p.status === 'approved' ? '' : daysLabel(p.due_date)}</span>` : ''}
        ${!isOwner ? `<span class="text-slate-400">· ${esc(profileName(p.student_id))}</span>` : ''}
      </div>
      ${p.description ? `<p class="text-sm text-slate-300 bg-[#090F1D] p-3 rounded-xl border border-[#1D3058] whitespace-pre-line">${esc(p.description)}</p>` : ''}
      <div>
        <div class="live-label">Dalil fayllari</div>
        <div class="space-y-1.5">
          ${files.map(f => `<div class="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0C1427] border border-[#1D3058] text-xs">
              <button onclick="openEvidence('${f.id}')" class="flex items-center gap-2 text-blue-300 hover:text-blue-200 truncate"><i data-lucide="paperclip" class="w-3.5 h-3.5 shrink-0"></i><span class="truncate">${esc(f.file_name)}</span></button>
              <span class="text-slate-500 shrink-0">${fmtDate(f.created_at.slice(0, 10))}</span></div>`).join('') || '<p class="text-xs text-slate-500">Hali fayl yuklanmagan.</p>'}
        </div>
        ${isOwner ? `<label class="mt-2 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-blue-500/40 hover:bg-blue-500/10 text-xs font-semibold text-blue-300 cursor-pointer">
            <i data-lucide="upload" class="w-3.5 h-3.5"></i><span id="uploadLabel">Fayl biriktirish (20 MB gacha)</span>
            <input type="file" class="hidden" onchange="uploadEvidence('${id}', this)"></label>` : ''}
      </div>
      ${actions ? `<div class="flex flex-wrap items-center gap-2">${actions}</div>` : ''}
      <div>
        <div class="live-label">Izohlar</div>
        <div class="space-y-2">
          ${comments.map(c => `<div class="p-2.5 rounded-lg bg-[#0C1427] border border-[#1D3058]">
              <div class="text-[11px] text-slate-400">${esc(profileName(c.author_id))} · ${fmtDate(c.created_at.slice(0, 10))}</div>
              <div class="text-sm text-slate-200 whitespace-pre-line">${esc(c.body)}</div></div>`).join('') || '<p class="text-xs text-slate-500">Izoh yo‘q.</p>'}
        </div>
        <form onsubmit="addComment(event, '${id}')" class="mt-2 flex gap-2">
          <input id="commentBody" required class="live-input" placeholder="Izoh yozing...">
          <button class="btn-primary shrink-0">Yuborish</button>
        </form>
      </div>
      ${isOwner ? `<div class="pt-2 border-t border-[#1D3058] flex gap-2"><button onclick="openForm('plan_items','${id}')" class="btn-ghost text-xs">Tahrirlash</button></div>` : ''}
    `);
  };

  window.setPlanStatus = async function (id, status) {
    const { error } = await sb.from('plan_items').update({ status }).eq('id', id);
    if (error) return fail(error);
    toast(status === 'submitted' ? 'Rahbarga yuborildi' : 'Holat yangilandi');
    await reload(); openPlanItem(id);
  };
  window.reviewPlan = async function (id, status) {
    const note = status === 'returned' ? prompt('Qaytarish sababi (doktorant ko‘radi):') : null;
    if (status === 'returned' && !note) return;
    const p = byId(L.plan, id);
    const { error } = await sb.from('plan_items').update({ status }).eq('id', id);
    if (error) return fail(error);
    if (note) {
      const r = await sb.from('comments').insert({ student_id: p.student_id, plan_item_id: id, body: note });
      if (r.error) return fail(r.error);
    }
    toast(status === 'approved' ? 'Tasdiqlandi' : 'Qaytarildi');
    await reload(); openPlanItem(id);
  };
  window.addComment = async function (e, id) {
    e.preventDefault();
    const p = byId(L.plan, id);
    const body = document.getElementById('commentBody').value.trim();
    if (!body) return;
    const { error } = await sb.from('comments').insert({ student_id: p.student_id, plan_item_id: id, body });
    if (error) return fail(error);
    await reload(); openPlanItem(id);
  };
  window.uploadEvidence = async function (planId, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast('Fayl 20 MB dan katta', 'error');
    document.getElementById('uploadLabel').textContent = 'Yuklanmoqda...';
    const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
    const path = `${L.me.id}/${planId}/${Date.now()}_${safe}`;
    const up = await sb.storage.from('evidence').upload(path, file);
    if (up.error) return fail(up.error);
    const { error } = await sb.from('evidence_files').insert({ student_id: L.me.id, plan_item_id: planId, file_path: path, file_name: file.name });
    if (error) return fail(error);
    toast('Fayl yuklandi');
    await reload(); openPlanItem(planId);
  };
  window.openEvidence = async function (fileId) {
    const f = byId(L.evidence, fileId);
    const { data, error } = await sb.storage.from('evidence').createSignedUrl(f.file_path, 300);
    if (error) return fail(error);
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  // =====================================================================
  // Plan / chapters / calendar / defense views
  // =====================================================================
  function header(title, sub, btn) {
    return `<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><h1 class="text-2xl font-bold text-white tracking-tight">${title}</h1>${sub ? `<p class="text-sm text-slate-400 mt-1">${sub}</p>` : ''}</div>
      ${btn || ''}</div>`;
  }

  function renderPlanView() {
    const s = stats(L.me.id);
    const btn = `<button onclick="openForm('plan_items')" class="btn-primary self-start">+ Band qo‘shish</button>`;
    if (!s.plan.length) {
      return header('Individual reja', '', btn) + emptyCard('Reja hali kiritilmagan.', `<button onclick="applyTemplate('plan_items')" class="btn-primary">Andoza 3 yillik rejani qo‘shish</button>`);
    }
    const years = [...new Set(s.plan.map(p => p.year))];
    return header('Individual reja', `${s.approved} / ${s.plan.length} band tasdiqlangan · ${s.progress}%`, btn) + years.map(y => {
      const items = s.plan.filter(p => p.year === y);
      const done = items.filter(p => p.status === 'approved').length;
      return `<div class="space-y-2.5">
        <div class="flex items-center justify-between"><h3 class="text-lg font-semibold text-white">${y}-yil</h3>
          <span class="text-xs text-slate-400 font-mono">${done} / ${items.length}</span></div>
        ${items.map(p => planRow(p, s.current && p.id === s.current.id)).join('')}</div>`;
    }).join('');
  }

  function renderChaptersView() {
    const s = stats(L.me.id);
    const btn = `<div class="flex gap-2 self-start"><button onclick="switchView('formatting')" class="btn-ghost">📐 Rasmiylashtirish talablari</button><button onclick="goMyData('chapters')" class="btn-primary">Tahrirlash</button></div>`;
    if (!s.chapters.length) return header('Dissertatsiya', '', btn) + emptyCard('Boblar hali kiritilmagan.', `<button onclick="applyTemplate('chapters')" class="btn-primary">Andoza tuzilmani qo‘shish</button>`);
    return header('Dissertatsiya', `${s.pagesDone} / ${s.pagesTotal} bet · ${s.dissPct}%`, btn) + `<div class="space-y-2.5">` +
      s.chapters.map(c => {
        const pc = pct(c.pages_done, c.pages_total);
        return `<div class="step-row">
          <span class="step-icon ${pc >= 100 ? 'bg-emerald-500 text-white' : 'bg-indigo-500/20 text-indigo-300'}"><i data-lucide="${pc >= 100 ? 'check' : 'book-open'}" class="w-5 h-5"></i></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2"><div class="step-title truncate">${esc(c.title)}</div><span class="text-sm font-mono text-slate-300">${pc}%</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2"><div class="bg-indigo-500 h-full rounded-full" style="width:${Math.min(pc, 100)}%"></div></div>
            <div class="flex justify-between text-[11px] text-slate-400 mt-1"><span>${c.pages_done} / ${c.pages_total} bet</span><span>${esc(c.status)}</span></div>
          </div></div>`;
      }).join('') + `</div>`;
  }

  function renderCalendarView() {
    const today = todayStr();
    const ev = [];
    L.plan.filter(p => p.student_id === L.me.id && p.status !== 'approved' && p.due_date)
      .forEach(p => ev.push({ date: p.due_date, title: p.title, type: 'Reja', click: `openPlanItem('${p.id}')` }));
    L.docs.filter(d => d.student_id === L.me.id && d.status !== 'ready' && d.due_date)
      .forEach(d => ev.push({ date: d.due_date, title: d.title, type: 'Hujjat', click: `goMyData('documents')` }));
    L.tasks.filter(t => t.student_id === L.me.id && !t.done && t.due_date)
      .forEach(t => ev.push({ date: t.due_date, title: t.title, type: 'Vazifa', click: `switchView('dashboard')` }));
    ev.sort((a, b) => a.date < b.date ? -1 : 1);
    if (!ev.length) return header('Kalendar', 'Muddati belgilangan reja bandlari, hujjatlar va vazifalar') + emptyCard('Muddatli ish yo‘q.', '');
    const groups = [
      ['Muddati o‘tgan', e => e.date < today, 'rose'],
      ['Shu hafta', e => e.date >= today && daysUntil(e.date) <= 7, 'amber'],
      ['Shu oy', e => daysUntil(e.date) > 7 && daysUntil(e.date) <= 31, 'blue'],
      ['Keyinroq', e => daysUntil(e.date) > 31, 'slate']
    ];
    return header('Kalendar', 'Muddati belgilangan reja bandlari, hujjatlar va vazifalar') + groups.map(([name, fn, color]) => {
      const list = ev.filter(fn);
      if (!list.length) return '';
      return `<div class="space-y-2"><h3 class="text-sm font-semibold text-${color}-300">${name} · ${list.length}</h3>
        ${list.map(e => `<button onclick="${e.click}" class="step-row w-full text-left">
          <span class="px-3 py-1.5 rounded-lg bg-[#080E1A] font-mono text-xs font-bold text-slate-200 shrink-0">${fmtDate(e.date)}</span>
          <div class="flex-1 min-w-0"><div class="step-title truncate">${esc(e.title)}</div><div class="text-[11px] text-slate-400">${e.type} · ${daysLabel(e.date)}</div></div></button>`).join('')}</div>`;
    }).join('');
  }

  function renderDefenseView() {
    const s = stats(L.me.id);
    const rows = [
      ['Individual reja bandlari tasdiqlangan', s.approved, s.plan.length],
      ['Dissertatsiya qo‘lyozmasi (bet)', s.pagesDone, s.pagesTotal],
      ['Rejadagi maqolalar chop etilgan', s.pubsDone, s.pubs.length],
      ['Hujjatlar tayyor', s.docsReady, s.docs.length],
      ['Rasmiylashtirish talablari (OAK qoidalari)', formatDone(L.me), FORMAT_TOTAL]
    ];
    const valid = rows.filter(r => r[2] > 0);
    const overall = valid.length ? Math.round(valid.reduce((a, r) => a + Math.min(100, pct(r[1], r[2])), 0) / valid.length) : 0;
    return header('Himoyaga tayyorlik', 'Kiritgan ma’lumotlaringiz asosida avtomatik hisoblanadi') + `
      <div class="rounded-2xl p-6 bg-gradient-to-br from-[#16264A] to-[#101B35] border border-[#1D3058] flex items-center gap-5">
        <div class="text-4xl font-extrabold text-white font-mono">${overall}%</div>
        <div class="text-sm text-slate-300">Umumiy tayyorlik darajasi</div>
      </div>
      <div class="space-y-2.5">${rows.map(([title, a, b]) => {
        const pc = pct(a, b); const ok = b > 0 && a >= b;
        return `<div class="step-row">
          <span class="step-icon ${ok ? 'bg-emerald-500 text-white' : 'bg-amber-500/20 text-amber-400'}"><i data-lucide="${ok ? 'check' : 'hourglass'}" class="w-5 h-5"></i></span>
          <div class="flex-1 min-w-0"><div class="step-title">${title}</div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2"><div class="${ok ? 'bg-emerald-500' : 'bg-amber-500'} h-full rounded-full" style="width:${Math.min(pc, 100)}%"></div></div></div>
          <span class="text-sm font-mono text-slate-300 shrink-0">${b ? `${a} / ${b}` : 'kiritilmagan'}</span></div>`;
      }).join('')}</div>`;
  }

  function emptyCard(text, actionHtml) {
    return `<div class="rounded-2xl p-8 bg-[#121E38] border border-dashed border-[#1D3058] text-center space-y-4">
      <p class="text-sm text-slate-400">${text}</p>${actionHtml ? `<div class="flex justify-center gap-2 flex-wrap">${actionHtml}</div>` : ''}</div>`;
  }

  // =====================================================================
  // President's scholarship readiness (CoM resolution No. 226, Appendix 1)
  // =====================================================================
  const SCHOL_KIND = {
    exam: 'Malakaviy imtihon',
    language_cert: 'Chet tili sertifikati',
    test_prep: 'Test tayyorgarligi (til, AT, tarix)',
    expert_opinion: 'Yetakchi mutaxassis fikri',
    annotation: 'Ilmiy ish annotatsiyasi',
    council_discussion: 'Ilmiy kengashda muhokama',
    author_cert: 'Mualliflik guvohnomasi',
    implementation_act: 'Joriy etish dalolatnomasi',
    other: 'Boshqa'
  };
  const LEAD_INDEXING = ['OAK ro‘yxatidagi jurnal', 'Scopus', 'Web of Science'];
  const LEX_URL = 'https://lex.uz/acts/-1399382';

  // "a'lo" written in any apostrophe style, or 5
  const isExcellent = g => /^a\s*['‘’`ʼ]?\s*lo$|^5$|^excellent$|^отлично$/i.test(String(g || '').trim());

  function scholarshipApplyYear(start) {
    if (!start) return null;
    const d = parseDate(start);
    d.setFullYear(d.getFullYear() + 2); // final (3rd) year of tayanch doktorantura
    return d.getMonth() + 1 <= 10 ? d.getFullYear() : d.getFullYear() + 1;
  }

  function scholarship(sid) {
    const s = stats(sid);
    const items = L.schol.filter(x => x.student_id === sid);
    const of = k => items.filter(x => x.kind === k);
    const applyYear = scholarshipApplyYear(s.profile.start_date);
    const testEnd = applyYear ? `${applyYear}-12-01` : null;
    const leadPubs = s.pubs.filter(x => x.status === 'published' && LEAD_INDEXING.includes(x.indexing)).length;
    const confPubs = s.pubs.filter(x => x.status === 'published' && x.indexing === 'Xalqaro konferensiya').length;
    const exams = of('exam').filter(e => e.done);
    const badExams = exams.filter(e => !isExcellent(e.grade));
    const certs = of('language_cert').filter(c => c.done);
    const validCert = certs.find(c => !c.expires_at || !testEnd || c.expires_at >= testEnd);
    const doneOf = k => of(k).some(x => x.done);

    const rows = [
      { req: true, title: 'Yetakchi ilmiy nashrlarda kamida 2 ta maqola', value: `${leadPubs} / 2`, ok: leadPubs >= 2,
        hint: '“Maqolalar”da turini OAK / Scopus / Web of Science va holatini “Chop etilgan” qilib belgilang.', action: "goMyData('publications')" },
      { req: true, title: 'Xalqaro konferensiya to‘plamida maqola', value: String(confPubs), ok: confPubs >= 1,
        hint: '“Maqolalar”da turini “Xalqaro konferensiya” qilib belgilang.', action: "goMyData('publications')" },
      { req: true, title: 'Dissertatsiya kamida 70% tayyor', value: s.pagesTotal ? `${s.dissPct}%` : 'kiritilmagan', ok: s.pagesTotal > 0 && s.dissPct >= 70,
        hint: '“Boblar”dagi yozilgan / rejadagi betlar asosida. Muassasa xulosasi ham kerak.', action: "goMyData('chapters')" },
      { req: true, title: 'Malakaviy imtihonlar faqat “a’lo”', kind: 'exam',
        value: exams.length ? `${exams.length - badExams.length} / ${exams.length} a’lo` : 'kiritilmagan', ok: exams.length > 0 && badExams.length === 0,
        warn: badExams.length ? '“A’lo” bo‘lmagan baho bor — bu talab bajarilmaydi.' : '' },
      { req: true, title: 'Chet tili (MDH davlatlari tili bo‘lmagan)', kind: 'language_cert',
        value: validCert ? (validCert.grade || 'bor') : certs.length ? 'muddati yetmaydi' : 'yo‘q', ok: !!validCert,
        warn: certs.length && !validCert && applyYear ? `Sertifikat ${applyYear}-yil noyabr testigacha amal qilmaydi.` : '',
        hint: 'Talab qilinadigan darajani vazirlik belgilaydi — ilmiy bo‘limdan aniqlang.' },
      { req: true, title: 'Davlat test markazidagi test: chet tili, AT, O‘zbekiston tarixi', kind: 'test_prep', value: doneOf('test_prep') ? 'tayyor' : '', ok: doneOf('test_prep'),
        hint: 'Test 3-kursning 1–30 noyabrida o‘tkaziladi.' },
      { req: true, final: true, title: 'Yetakchi mutaxassislar fikri', kind: 'expert_opinion', ok: doneOf('expert_opinion') },
      { req: true, final: true, title: 'Ilmiy ish annotatsiyasi (2 nusxada, rasmlar bilan)', kind: 'annotation', ok: doneOf('annotation') },
      { req: true, final: true, title: 'Ilmiy kengashda ochiq muhokama va tavsiya', kind: 'council_discussion', ok: doneOf('council_discussion') },
      { req: false, title: 'Mualliflik guvohnomalari (masalan, EHM dasturi uchun)', kind: 'author_cert', value: String(of('author_cert').filter(x => x.done).length), ok: doneOf('author_cert'),
        hint: 'Hujjatlar ro‘yxatida bor bo‘lsa ilova qilinadi.' },
      { req: false, title: 'Ilmiy natijalardan foydalanish (joriy etish) dalolatnomalari', kind: 'implementation_act', value: String(of('implementation_act').filter(x => x.done).length), ok: doneOf('implementation_act') }
    ];
    const req = rows.filter(r => r.req);
    return { s, items, applyYear, rows, readiness: pct(req.filter(r => r.ok).length, req.length) };
  }

  function renderScholarshipView() {
    const h = header('Prezident stipendiyasi', 'Tayanch doktorantura · Vazirlar Mahkamasining 226-son qarori, 1-ilova');
    if (!L.me.start_date) {
      return h + emptyCard('Taymer va reja uchun profilga doktoranturaga kirgan sanani kiriting.', `<button onclick="goMyData('profile')" class="btn-primary">Profilni to‘ldirish</button>`);
    }
    const sc = scholarship(L.me.id);
    const y = sc.applyYear;
    const open = `${y}-10-01`, close = `${y}-10-31`;
    const daysToOpen = daysUntil(open), daysToClose = daysUntil(close);
    let phase;
    if (daysToOpen > 0) phase = `<div class="text-4xl font-extrabold text-white font-mono">${daysToOpen}</div><div class="text-sm text-slate-300">kun qoldi — hujjat qabuli ${fmtDate(open)} da boshlanadi</div>`;
    else if (daysToClose >= 0) phase = `<div class="text-2xl font-extrabold text-amber-300">Hujjat qabuli davom etmoqda</div><div class="text-sm text-slate-300">Muddat: ${fmtDate(close)} (${daysLabel(close)})</div>`;
    else phase = `<div class="text-xl font-bold text-slate-300">${y}-yilgi qabul yakunlangan</div><div class="text-sm text-slate-400">Test: 1–30 noyabr, qaror: dekabr</div>`;

    const curYear = studyYear(L.me.start_date) || 1;
    const rowHtml = r => {
      const icon = r.ok ? '<span class="step-icon bg-emerald-500 text-white"><i data-lucide="check" class="w-5 h-5"></i></span>'
        : r.warn ? '<span class="step-icon bg-rose-500/20 text-rose-400"><i data-lucide="alert-triangle" class="w-5 h-5"></i></span>'
        : '<span class="step-icon bg-slate-700/60 text-slate-300"><i data-lucide="circle" class="w-5 h-5"></i></span>';
      const btn = r.kind ? `<button onclick="openForm('scholarship_items', null, '${r.kind}')" class="btn-ghost !py-1 !px-3 text-xs shrink-0">+ Qo‘shish</button>`
        : r.action ? `<button onclick="${r.action}" class="btn-ghost !py-1 !px-3 text-xs shrink-0">Ochish</button>` : '';
      return `<div class="step-row">${icon}
        <div class="flex-1 min-w-0">
          <div class="step-title">${r.title}${r.final ? ' <span class="text-[10px] font-medium text-slate-500 uppercase">· 3-kurs</span>' : ''}</div>
          ${r.warn ? `<div class="text-xs text-rose-300 mt-0.5">${r.warn}</div>` : r.hint ? `<div class="text-xs text-slate-400 mt-0.5">${r.hint}</div>` : ''}
        </div>
        ${r.value ? `<span class="text-sm font-mono text-slate-300 shrink-0">${esc(r.value)}</span>` : ''}${btn}</div>`;
    };

    // Course n runs from start + (n-1) years to the day before start + n years (own enrolment date)
    const courseFrom = n => addMonths(L.me.start_date, 12 * (n - 1));
    const courseTo = n => { const d = parseDate(addMonths(L.me.start_date, 12 * n)); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const short = s => { const d = parseDate(s); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };
    const timeline = [
      [1, ['Malakaviy imtihonlarni faqat “a’lo”ga topshirish', `1-maqola yetakchi nashrda — ${short(courseTo(1))} gacha`, 'Chet tili: kerakli darajani aniqlash va tayyorgarlik', 'Birinchi xalqaro konferensiya']],
      [2, [`2-maqola (iloji bo‘lsa Scopus / Web of Science) — ${short(courseTo(2))} gacha`, 'Xalqaro konferensiya to‘plamida maqola', `Til sertifikati — 01.12.${y} dan keyin ham amal qiladigan`, 'Dissertatsiya 40–60%', 'Mualliflik guvohnomasi, joriy etish dalolatnomasi']],
      [3, [`Dissertatsiya ≥70% va muassasa xulosasi — 01.10.${y} gacha`, 'Annotatsiya va mutaxassislar fikri', 'Ilmiy kengashda muhokama va tavsiya', `Hujjat topshirish: 01.10–31.10.${y}`, `Davlat test markazida test: 01.11–30.11.${y}`, `Vazirlik qarori: dekabr ${y}`]]
    ];
    const keyDates = [
      ['Kirgan sana', short(L.me.start_date)],
      ['3-kurs (so‘nggi yil) boshlanadi', short(courseFrom(3))],
      ['Hujjat qabuli', `01.10 – 31.10.${y}`],
      ['Test', `01.11 – 30.11.${y}`],
      ['Doktorantura tugaydi', short(courseTo(3))]
    ];

    const myItems = sc.items.slice().sort((a, b) => Object.keys(SCHOL_KIND).indexOf(a.kind) - Object.keys(SCHOL_KIND).indexOf(b.kind));
    return h + `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-2xl p-6 bg-gradient-to-br from-[#16264A] to-[#101B35] border border-[#1D3058] flex flex-col justify-center gap-1">${phase}</div>
        <div class="rounded-2xl p-6 bg-[#121E38] border border-[#1D3058] flex items-center gap-5">
          <div class="text-4xl font-extrabold font-mono ${sc.readiness >= 80 ? 'text-emerald-400' : 'text-white'}">${sc.readiness}%</div>
          <div><div class="text-sm text-slate-300">Majburiy talablar bajarilishi</div>
            <div class="text-xs text-slate-500 mt-1">Hozir ${curYear}-kurs · ariza ${y}-yil oktabrida</div></div>
        </div>
      </div>

      <div class="space-y-2.5">
        <h3 class="text-lg font-semibold text-white">Majburiy talablar</h3>
        ${sc.rows.filter(r => r.req).map(rowHtml).join('')}
      </div>
      <div class="space-y-2.5">
        <h3 class="text-lg font-semibold text-white">Qo‘shimcha (hujjatlar ro‘yxatida)</h3>
        ${sc.rows.filter(r => !r.req).map(rowHtml).join('')}
      </div>

      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-white">Asosiy sanalar (kirgan sanangiz bo‘yicha)</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          ${keyDates.map(([l, v]) => `<div class="rounded-xl p-3 bg-[#121E38] border border-[#1D3058]"><div class="text-[11px] text-slate-400">${l}</div><div class="text-sm font-semibold text-white font-mono mt-1">${v}</div></div>`).join('')}
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-white">Tayyorgarlik rejasi</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${timeline.map(([n, list]) => `<div class="rounded-2xl p-4 border ${n === curYear ? 'bg-[#16264A] border-blue-500/50' : 'bg-[#121E38] border-[#1D3058]'}">
            <div class="flex items-center justify-between mb-1"><span class="font-semibold text-white">${n}-kurs</span>${n === curYear ? '<span class="step-badge badge-blue">Hozir</span>' : ''}</div>
            <div class="text-[11px] text-slate-400 font-mono mb-2">${short(courseFrom(n))} – ${short(courseTo(n))}</div>
            <ul class="space-y-1.5 text-sm text-slate-300">${list.map(t => `<li class="flex gap-2"><span class="text-slate-500">•</span><span>${esc(t)}</span></li>`).join('')}</ul></div>`).join('')}
        </div>
      </div>

      <div class="space-y-2.5">
        <div class="flex items-center justify-between"><h3 class="text-lg font-semibold text-white">Mening yozuvlarim <span class="text-slate-500 text-sm font-normal">· ${myItems.length}</span></h3>
          <button onclick="openForm('scholarship_items')" class="btn-primary">+ Qo‘shish</button></div>
        ${myItems.length ? myItems.map(r => {
          const v = cellValue('scholarship_items', r);
          return `<div class="step-row"><div class="flex-1 min-w-0"><div class="step-title truncate">${esc(v.main)}</div><div class="text-xs text-slate-400 truncate">${esc(v.sub)}</div></div>
            <span class="step-badge ${v.badge[1]} shrink-0 hidden sm:inline">${v.badge[0]}</span>
            <button onclick="openForm('scholarship_items','${r.id}')" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Tahrirlash"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button onclick="deleteRow('scholarship_items','${r.id}')" class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" title="O‘chirish"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
        }).join('') : '<p class="text-sm text-slate-500">Imtihonlar, til sertifikati, guvohnomalar va boshqalarni shu yerga kiriting.</p>'}
      </div>

      <p class="text-xs text-slate-500">Talablar <a href="${LEX_URL}" target="_blank" rel="noopener" class="text-blue-400 hover:text-blue-300">VM 226-son qarori</a> (2025-yil 30-dekabrdagi tahriri) asosida. Qoidalar o‘zgarishi mumkin — har yili rasmiy matnni tekshiring. Saralash respublika miqyosida (10 ta stipendiya), shuning uchun talablarni bajarish g‘alabani kafolatlamaydi.</p>`;
  }

  // =====================================================================
  // Dissertation & autoreferat formatting rules (OAK Presidium 214/8, 2015; amended 239/8, 2017)
  // =====================================================================
  const FORMAT_SOURCE = 'OAK Rayosatining 2015-yil 20-martdagi 214/8-son qarori bilan tasdiqlangan, 2017-yil 31-maydagi 239/8-son qarori bilan o‘zgartirilgan “Dissertatsiya va dissertatsiya avtoreferatini rasmiylashtirish qoidalari” (Adliya vazirligi, 2665 va 2665-1).';
  const FORMAT_RULES = [
    { id: 'struct', title: 'Dissertatsiya tarkibi', items: [
      ['s1', 'Mundarija — boblar, paragraflar nomi va betlari ko‘rsatilgan'],
      ['s2', 'Kirish (dissertatsiya annotatsiyasi)'],
      ['s3', 'Asosiy qism: PhD — kamida 3 bob (DSc — kamida 4 bob)'],
      ['s4', 'Xulosa — qisqa, aniq, bandlangan (raqamlangan)'],
      ['s5', 'Foydalanilgan adabiyotlar: 1) normativ-huquqiy va metodologik; 2) monografiya, maqola, patent, to‘plamlar; 3) boshqa adabiyotlar'],
      ['s6', 'Ro‘yxatda faqat matnda havola qilingan adabiyotlar'],
      ['s7', 'Shartli belgilar va atamalar ro‘yxati (bo‘lsa), ilovalar (bo‘lsa)'],
      ['s8', 'Har bir bob oxirida xulosa va takliflar']
    ] },
    { id: 'intro', title: 'Kirish qismida yoritiladi', items: [
      ['i1', 'Mavzuning dolzarbligi va zarurati'], ['i2', 'Respublika fan va texnologiyalari ustuvor yo‘nalishlariga mosligi'],
      ['i3', 'Muammoning o‘rganilganlik darajasi'], ['i4', 'Muassasa ilmiy-tadqiqot rejalari bilan bog‘liqligi'],
      ['i5', 'Maqsad va vazifalar'], ['i6', 'Obyekt va predmet'], ['i7', 'Tadqiqot usullari'],
      ['i8', 'Ilmiy yangilik va amaliy natijalar'], ['i9', 'Natijalarning ishonchliligi, ilmiy va amaliy ahamiyati'],
      ['i10', 'Natijalarning joriy qilinishi va aprobatsiyasi'], ['i11', 'Natijalarning e’lon qilinganligi'],
      ['i12', 'Dissertatsiyaning tuzilishi va hajmi']
    ] },
    { id: 'text', title: 'Matnni rasmiylashtirish', items: [
      ['t1', 'Hajm: PhD — 60 varaqdan oshmasin (ikki tomonlama); ijtimoiy-gumanitar fanlarda ko‘pi bilan +30%. Mundarija, adabiyotlar, ilovalar hajmga kirmaydi'],
      ['t2', 'A4, varaqning ikki tomonida, 1,5 qator oralig‘i'],
      ['t3', 'Hoshiyalar: yuqori va past 2 sm, chap 3 sm, o‘ng 1,5 sm; xatboshi 1,27 sm'],
      ['t4', 'Times New Roman, 14 o‘lcham (Microsoft Word)'],
      ['t5', 'Bet raqami pastki o‘ng burchakda, 2 dan boshlab (titul varag‘iga qo‘yilmaydi)'],
      ['t6', 'Mundarija, kirish, har bir bob, xulosa, adabiyotlar — yangi betdan'],
      ['t7', 'Asosiy sarlavhalar (MUNDARIJA, KIRISH, XULOSA…) bosh harflarda'],
      ['t8', 'Boblar rim raqamlari bilan; paragraflar “§” va arab raqamlari bilan; sarlavha atrofida 12 pt oraliq'],
      ['t9', 'Havola: sahifa ostida yoki matnda [1; 25–26-b.] ko‘rinishida'],
      ['t10', 'Rasm: ostida markazda “1.1-rasm.” va nomi'],
      ['t11', 'Jadval: tepa o‘ng burchakda “1.1-jadval.”, nomi jadval ustida'],
      ['t12', 'Formula: Word “Formula” yoki LaTeX; o‘ng tomonda (1.1); atrofida 12 pt'],
      ['t13', 'Matnda havola: “(1.3-jadvalga qarang)”; izohlar “Izoh 1.:”'],
      ['t14', 'Ilovalar alohida betda: “1-ilova” va sarlavha']
    ] },
    { id: 'title', title: 'Titul varag‘i (1-ilova)', items: [
      ['ti1', 'Muassasa nomi; o‘ngda “Qo‘lyozma huquqida” va UDK'],
      ['ti2', 'Muallif F.I.Sh., mavzu, ixtisoslik shifri va nomi'],
      ['ti3', '“… fanlari bo‘yicha falsafa doktori (PhD) ilmiy darajasini olish uchun yozilgan DISSERTATSIYA”'],
      ['ti4', 'Ilmiy rahbar (F.I.Sh., ilmiy daraja, unvon); pastda shahar – yil'],
      ['ti5', 'Times New Roman 14 (bosh harflarda) va 12 — namunadagi oraliqlar bilan']
    ] },
    { id: 'auto', title: 'Avtoreferat', items: [
      ['a1', 'Risola 21 × 14,5 sm; asosiy muqova oq-yaltiroq qog‘ozda (2-ilova), orqasida mundarija'],
      ['a2', 'Ichki muqovalar o‘zbek, rus va ingliz tilida; orqa tomoni 3-ilova shaklida'],
      ['a3', 'Tarkibi: kirish (dissertatsiya kirishi bilan aynan bir xil), asosiy mazmun, xulosa, e’lon qilingan ishlar'],
      ['a4', 'Hajm (PhD): o‘zbek va rus/ingliz tilida 2 bosma taboq (har tilda 1) + uchinchi tilda qisqacha; gumanitar fanlarda +30% gacha'],
      ['a5', 'A4 bir tomonlama, 1 qator oralig‘i, hoshiyalar dissertatsiyadagidek, xatboshi 1 sm'],
      ['a6', 'Bet raqami pastki o‘ng burchakda “5” dan (muqovalarga qo‘yilmaydi)'],
      ['a7', 'E’lon qilingan ishlar: 1-bo‘lim — OAK ro‘yxatidagi nashrlar va patentlar, har biriga (fan shifri; № ro‘yxatdagi raqam); 2-bo‘lim — boshqa nashrlar'],
      ['a8', 'Tartib: monografiya, patent, ilmiy maqola, to‘plamlar; avtoreferat uch tilda Ilmiy kengash sayti va ziyonet.uz da']
    ] }
  ];
  const HUMANITIES = ['07', '08', '09', '10', '12', '13', '17', '19', '22', '23', '24'];
  const FORMAT_TOTAL = FORMAT_RULES.reduce((n, g) => n + g.items.length, 0);

  function formatAuto(sid) {
    const p = byId(L.profiles, sid) || {};
    const s = stats(sid);
    const mainChapters = s.chapters.filter(c => /bob/i.test(c.title)).length;
    const human = HUMANITIES.includes(String(p.specialty_code || '').slice(0, 2));
    const maxPages = human ? 156 : 120; // 60 sheets two-sided = 120 pages; +30% = 78 sheets = 156 pages
    return { mainChapters, human, maxPages, pages: s.pagesTotal };
  }
  function formatDone(p) { const c = p.format_checks || {}; return FORMAT_RULES.reduce((n, g) => n + g.items.filter(([id]) => c[id]).length, 0); }

  function renderFormattingView() {
    const p = L.me;
    const checks = p.format_checks || {};
    const a = formatAuto(p.id);
    const done = formatDone(p);
    const autoRows = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${tile("switchView('dissertation')", 'book-open', a.mainChapters >= 3 ? 'emerald' : 'amber', `${a.mainChapters} / 3`, 'Asosiy boblar (PhD — kamida 3)')}
        ${tile("switchView('dissertation')", 'file-text', a.pages && a.pages > a.maxPages ? 'rose' : 'blue', a.pages ? `${a.pages} / ${a.maxPages}` : '—', `Rejadagi bet / chegara${a.human ? ' (gumanitar +30%)' : ''}`)}
        ${tile('', 'list-checks', 'indigo', `${pct(done, FORMAT_TOTAL)}%`, `Belgilangan bandlar: ${done} / ${FORMAT_TOTAL}`)}
      </div>
      <p class="text-xs text-slate-500">Bet chegarasi taxminiy: 1 varaq = 2 bet (ikki tomonlama). Mundarija, adabiyotlar va ilovalar hajmga kirmaydi.</p>`;
    const groups = FORMAT_RULES.map(g => `
      <div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] space-y-2">
        <div class="flex items-center justify-between"><h3 class="text-base font-semibold text-white">${g.title}</h3>
          <span class="text-xs text-slate-400 font-mono">${g.items.filter(([id]) => checks[id]).length} / ${g.items.length}</span></div>
        ${g.items.map(([id, text]) => `<label class="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/40 cursor-pointer">
          <input type="checkbox" ${checks[id] ? 'checked' : ''} onchange="toggleFormatCheck('${id}', this.checked)" class="custom-checkbox mt-0.5">
          <span class="text-sm ${checks[id] ? 'text-slate-400 line-through' : 'text-slate-200'}">${esc(text)}</span></label>`).join('')}
      </div>`).join('');
    return header('Rasmiylashtirish talablari', 'Dissertatsiya va avtoreferat — bandma-band tekshirish',
      `<div class="flex gap-2 self-start"><button onclick="switchView('dissertation')" class="btn-ghost">← Ilmiy ish</button><button onclick="openAutoreferatList()" class="btn-primary">📄 E’lon qilingan ishlar ro‘yxati</button></div>`) +
      autoRows + groups +
      `<p class="text-xs text-slate-500">Manba: ${esc(FORMAT_SOURCE)} Keyinroq o‘zgartirishlar kiritilgan bo‘lishi mumkin — himoyadan oldin amaldagi tahririni ilmiy kengash kotibidan aniqlang.</p>`;
  }

  window.toggleFormatCheck = async function (id, on) {
    const checks = { ...(L.me.format_checks || {}) };
    if (on) checks[id] = true; else delete checks[id];
    const { error } = await sb.from('profiles').update({ format_checks: checks }).eq('id', L.me.id);
    if (error) return fail(error);
    L.me.format_checks = checks;
    const me = byId(L.profiles, L.me.id); if (me) me.format_checks = checks;
    rerender();
  };

  // Autoreferat "published works" list in the order the rules require
  const PUB_ORDER = ['Monografiya', 'Patent'];
  window.openAutoreferatList = async function () {
    if (!J.doc) {
      try { J.doc = await (await fetch('data/oak_journals.json?v=2026-08-03')).json(); } catch (e) { /* list works without OAK numbers */ }
    }
    const key = s => cyrillicToLatin(String(s || '').toLowerCase()).replace(/[^a-z0-9]+/g, '');
    const oakByName = new Map((J.doc ? J.doc.journals : []).map(j => [key(j.name), j]));
    const myField = myFieldCode();
    const pubs = L.pubs.filter(x => x.student_id === L.me.id && ['published', 'accepted'].includes(x.status));
    const rank = x => { const i = PUB_ORDER.indexOf(x.indexing); return i === -1 ? 2 + (x.indexing === 'Xalqaro konferensiya' || x.indexing === 'Respublika konferensiyasi' ? 1 : 0) : i; };
    const oakOf = x => oakByName.get(key(x.journal));
    const first = pubs.filter(x => x.indexing === 'Patent' || x.indexing === 'OAK ro‘yxatidagi jurnal' || oakOf(x));
    const second = pubs.filter(x => !first.includes(x));
    const sortFn = (a, b) => (rank(a) - rank(b)) || ((a.year || 0) - (b.year || 0));
    let n = 0;
    const line = x => {
      n += 1;
      const j = oakOf(x);
      const field = j ? (j.fields.find(f => f[0] === myField) || j.fields[0])[0] : (myField || '__.00.00');
      const tag = (x.indexing === 'Patent') ? '' : ` (${field}; № ${j ? j.no : '___'})`;
      const dot = s => String(s || '').trim().replace(/\.+$/, '');
      return `${n}. ${dot(L.me.full_name)}. ${dot(x.title)} // ${dot(x.journal) || '[jurnal]'}. — ${x.year || '[yil]'}.${first.includes(x) ? tag : ''}`;
    };
    const text = ['I bo‘lim (I часть; I part)', ...first.sort(sortFn).map(line), '', 'II bo‘lim (II часть; II part)', ...second.sort(sortFn).map(line)].join('\n');
    openLiveModal('Avtoreferat: e’lon qilingan ishlar ro‘yxati', `
      <p class="text-xs text-slate-400">“Chop etilgan” va “Qabul qilingan” maqolalaringizdan tuzildi. 1-bo‘lim — OAK ro‘yxatidagi nashrlar va patentlar; № — OAK ro‘yxatidagi tartib raqami (jurnal nomi ro‘yxatdagiga aynan mos kelsa avtomatik; “___” bo‘lsa qo‘lda yozing va oak.uz da tekshiring).</p>
      <textarea id="autorefList" rows="14" readonly class="live-input font-mono text-xs">${esc(text)}</textarea>
      <button onclick="copyAutorefList()" class="btn-primary w-full">Nusxalash</button>`);
  };
  window.copyAutorefList = async function () {
    const el = document.getElementById('autorefList');
    try { await navigator.clipboard.writeText(el.value); } catch (e) { el.select(); document.execCommand('copy'); }
    toast('Nusxalandi');
  };

  // =====================================================================
  // OAK journals finder (data/oak_journals.json, parsed from the OAK list)
  // =====================================================================
  const J = { doc: null, loading: false, q: '', field: null, type: 'ALL', showRemoved: false, limit: 40 };
  const ACTIVE_STATUSES = ['Aktiv', 'Qo‘shildi', 'O‘zgartirildi'];

  function loadJournals() {
    if (J.doc || J.loading) return;
    J.loading = true;
    fetch('data/oak_journals.json?v=2026-08-03')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(doc => { J.doc = doc; J.loading = false; if (AppState.currentView === 'journals') rerender(); })
      .catch(err => { J.loading = false; fail(err); });
  }

  // Cyrillic → Latin (app.js cyrillicToLatin), drop apostrophes, keep an 8-letter stem so
  // "jurnalistika", "журналистикаси" and "jurnalistikasi" match (while "jurnali" stays different).
  const stems = s => cyrillicToLatin(String(s || '').toLowerCase())
    .replace(/[‘’'`ʼ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4)
    .map(w => w.slice(0, 8));
  const JOURNAL_STOP = new Set(stems(
    'ilmiy jurnal jurnali journal xabarlari axborotnomasi axborot international science scientific university universiteti ' +
    'davlat fanlar muammolari zamonaviy vestnik научный вестник известия исследования research bulletin tadqiqotlar ' +
    'хабарлари ахборотномаси dolzarb ta’lim fan uchun bilan'));
  const normWords = s => stems(s).filter(w => !JOURNAL_STOP.has(w));

  function myFieldCode() {
    const code = (L.me && L.me.specialty_code) || '';
    const m = code.match(/^(\d{2})\./);
    return m ? `${m[1]}.00.00` : null;
  }

  function renderJournalsView() {
    loadJournals();
    const h = header('Jurnallar', 'OAK tavsiya etgan ilmiy nashrlar — yo‘nalishingiz bo‘yicha');
    if (!J.doc) return h + emptyCard('Ro‘yxat yuklanmoqda...', '');
    if (J.field === null) J.field = myFieldCode() || 'ALL';
    const fieldNames = J.doc.field_names || {};
    const topicWords = new Set(normWords(L.me && L.me.topic));

    let list = J.doc.journals.filter(j => J.showRemoved || ACTIVE_STATUSES.includes(j.status));
    if (J.field !== 'ALL') list = list.filter(j => j.fields.some(f => f[0] === J.field));
    if (J.type !== 'ALL') list = list.filter(j => j.type === J.type);
    const q = J.q.trim().toLowerCase();
    if (q) list = list.filter(j => (j.name + ' ' + j.publisher + ' ' + j.place).toLowerCase().includes(q));
    // rank: overlap of the student's topic words with the journal name/publisher, then national first
    const scored = list.map(j => {
      const words = normWords(j.name + ' ' + j.publisher);
      const score = words.reduce((a, w) => a + (topicWords.has(w) ? 1 : 0), 0);
      return { j, score };
    }).sort((a, b) => (b.score - a.score) || ((a.j.type === 'Milliy') === (b.j.type === 'Milliy') ? a.j.no - b.j.no : (a.j.type === 'Milliy' ? -1 : 1)));

    const mine = myFieldCode();
    const banner = mine
      ? `<div class="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-sm text-blue-100">Ixtisosligingiz <b>${esc(L.me.specialty_code)}</b> → <b>${esc(mine)} ${esc(fieldNames[mine] || '')}</b>. Mavzuingizdagi so‘zlarga mos jurnallar yuqorida turadi.</div>`
      : `<div class="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-100">Profilga ixtisoslik shifrini kiritsangiz, yo‘nalishingiz bo‘yicha jurnallar avtomatik tanlanadi. <button onclick="goMyData('profile')" class="underline">Profil</button></div>`;

    const card = ({ j, score }) => {
      const removed = !ACTIVE_STATUSES.includes(j.status);
      const wos = `https://mjl.clarivate.com/search-results?search=${encodeURIComponent(j.name)}`;
      const google = `https://www.google.com/search?q=${encodeURIComponent(`"${j.name}" journal submission`)}`;
      return `<div class="rounded-2xl p-4 bg-[#121E38] border ${removed ? 'border-rose-500/40' : 'border-[#1D3058]'} space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold text-white">${esc(j.name)}</div>
            <div class="text-xs text-slate-400">${esc([j.place, j.publisher].filter(Boolean).join(' · '))}</div>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span class="step-badge ${j.type === 'Milliy' ? 'badge-emerald' : j.type === 'MDH' ? 'badge-blue' : 'badge-amber'}">${esc(j.type)}</span>
            ${removed ? `<span class="step-badge badge-rose">${esc(j.status)}${j.removed ? ' ' + esc(j.removed) : ''}</span>` : score ? '<span class="step-badge badge-cyan">Mavzuga mos</span>' : ''}
          </div>
        </div>
        <div class="flex flex-wrap gap-1">${j.fields.map(f => `<span class="text-[10px] px-2 py-0.5 rounded-full ${f[0] === J.field ? 'bg-blue-500/20 text-blue-200' : 'bg-slate-700/50 text-slate-300'}">${esc(f[0])} ${esc(f[1])}</span>`).join('')}</div>
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <span class="text-[11px] text-slate-500">Ro‘yxatda: ${esc(j.added || '—')}${j.decision ? ' · qaror ' + esc(j.decision) : ''}</span>
          <span class="flex-1"></span>
          <a href="${wos}" target="_blank" rel="noopener" class="text-xs text-blue-400 hover:text-blue-300">Web of Science’da tekshirish ↗</a>
          <a href="${google}" target="_blank" rel="noopener" class="text-xs text-blue-400 hover:text-blue-300">Jurnal sayti ↗</a>
          ${role() === 'doctoral_student' && !removed ? `<button onclick="addJournalToPlan(${j.no})" class="btn-ghost !py-1 !px-3 text-xs">+ Maqola rejasiga</button>` : ''}
        </div>
      </div>`;
    };

    const fieldOptions = [['ALL', 'Barcha fan tarmoqlari'], ...Object.entries(fieldNames).sort().map(([c, n]) => [c, `${c} ${n}`])];
    return h + banner + `
      <div class="flex flex-col md:flex-row gap-2">
        <input value="${esc(J.q)}" oninput="journalFilter('q', this.value)" placeholder="Jurnal nomi, nashriyot yoki davlat..." class="live-input md:flex-1">
        <select onchange="journalFilter('field', this.value)" class="live-input md:!w-72">${fieldOptions.map(([v, l]) => `<option value="${v}" ${J.field === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <select onchange="journalFilter('type', this.value)" class="live-input md:!w-40">${[['ALL', 'Hammasi'], ['Milliy', 'Milliy'], ['MDH', 'MDH'], ['Xorijiy', 'Xorijiy']].map(([v, l]) => `<option value="${v}" ${J.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <label class="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" ${J.showRemoved ? 'checked' : ''} onchange="journalFilter('showRemoved', this.checked)" class="custom-checkbox"> Ro‘yxatdan chiqarilgan jurnallarni ham ko‘rsatish</label>
      <div id="journalCount" class="text-sm text-slate-400">${scored.length} ta jurnal</div>
      <div class="space-y-3" id="journalList">${scored.slice(0, J.limit).map(card).join('')}</div>
      ${scored.length > J.limit ? `<button onclick="journalFilter('more')" class="btn-ghost w-full">Yana ko‘rsatish (${scored.length - J.limit} ta qoldi)</button>` : ''}
      <p class="text-xs text-slate-500">${esc(J.doc.source || '')} Ro‘yxat sanasi: ${esc(fmtDate(J.doc.as_of))}. “Web of Science’da tekshirish” Clarivate’ning rasmiy qidiruvini ochadi — jurnal u yerda bo‘lsa, WoS’da indekslangan. Jurnalga maqola uning o‘z saytidagi tizim orqali yuboriladi.</p>`;
  }

  let journalTimer = null;
  window.journalFilter = function (key, value) {
    if (key === 'more') { J.limit += 40; return rerender(); }
    J[key] = value;
    J.limit = 40;
    if (key === 'q') {
      clearTimeout(journalTimer);
      journalTimer = setTimeout(() => {
        const input = document.activeElement; const pos = input && input.selectionStart;
        rerender();
        const again = document.querySelector('#view-journals input[placeholder^="Jurnal"]');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
      }, 250);
      return;
    }
    rerender();
  };

  window.addJournalToPlan = async function (no) {
    const j = J.doc.journals.find(x => x.no === no);
    const { data, error } = await sb.from('publications').insert({
      student_id: L.me.id, title: 'Yangi maqola (nomini kiriting)', journal: j.name,
      indexing: 'OAK ro‘yxatidagi jurnal', status: 'planned'
    }).select('id').single();
    if (error) return fail(error);
    toast('Maqolalar rejasiga qo‘shildi');
    await reload();
    openForm('publications', data.id);
  };

  // =====================================================================
  // Supervisor view
  // =====================================================================
  function renderSupervisorView() {
    if (role() === 'department') return renderSupervisorsForDepartment();
    const students = L.profiles.filter(p => p.supervisor_id === L.me.id);
    const pending = L.plan.filter(p => p.status === 'submitted' && students.some(s => s.id === p.student_id));
    let html = header('Mening doktorantlarim', `${students.length} ta doktorant biriktirilgan`) + telegramNudge();
    if (!students.length) return html + emptyCard('Sizga hali doktorant biriktirilmagan. Ilmiy bo‘lim biriktirgandan keyin shu yerda ko‘rinadi.', '');
    if (pending.length) {
      html += `<div class="space-y-2"><h3 class="text-lg font-semibold text-white">Tekshirishni kutayotganlar · ${pending.length}</h3>
        ${pending.map(p => `<button onclick="openPlanItem('${p.id}')" class="step-row w-full text-left">
          <span class="step-icon bg-amber-500/20 text-amber-400"><i data-lucide="clock" class="w-5 h-5"></i></span>
          <div class="flex-1 min-w-0"><div class="step-meta">${esc(profileName(p.student_id))}</div><div class="step-title truncate">${esc(p.title)}</div></div>
          <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i></button>`).join('')}</div>`;
    }
    html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${students.map(studentCard).join('')}</div>`;
    return html;
  }

  function studentCard(p) {
    const s = stats(p.id);
    return `<button onclick="openStudent('${p.id}')" class="text-left rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] hover:border-blue-500 transition space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0"><img src="${avatarUrl(p.full_name)}" class="w-10 h-10 rounded-full" alt="">
          <div class="min-w-0"><div class="font-semibold text-white truncate">${esc(p.full_name || p.email)}</div><div class="text-xs text-slate-400">${s.year ? `${s.year}-yil` : 'Yil noma’lum'} · ${esc(p.specialty_code || '')}</div></div></div>
        <span class="step-badge ${RISK[s.risk].badge} shrink-0">${RISK[s.risk].label}</span>
      </div>
      <p class="text-xs text-slate-300 line-clamp-2">${esc(p.topic || 'Mavzu kiritilmagan')}</p>
      <div class="grid grid-cols-3 gap-2 text-center text-xs p-2.5 rounded-xl bg-[#0C1427] border border-[#1D3058]">
        <div><div class="text-[10px] text-slate-400">Reja</div><div class="font-mono font-bold text-blue-400">${s.progress}%</div></div>
        <div><div class="text-[10px] text-slate-400">Dissertatsiya</div><div class="font-mono font-bold text-indigo-400">${s.pagesTotal ? s.dissPct + '%' : '—'}</div></div>
        <div><div class="text-[10px] text-slate-400">Maqolalar</div><div class="font-mono font-bold text-emerald-400">${s.pubsDone}/${s.pubs.length}</div></div>
      </div>
      ${s.pending.length ? `<div class="text-xs text-amber-400">${s.pending.length} ta band tekshiruv kutmoqda</div>` : ''}
    </button>`;
  }

  window.openStudent = function (id) {
    const p = byId(L.profiles, id);
    const s = stats(id);
    const sup = p.supervisor_id ? profileName(p.supervisor_id) : (p.supervisor_text ? `${p.supervisor_text} (saytda yo‘q)` : 'biriktirilmagan');
    openLiveModal(p.full_name || p.email, `
      <div class="text-sm text-slate-300 p-3 rounded-xl bg-[#0C1427] border border-[#1D3058] space-y-1">
        <div><span class="text-slate-400">Mavzu:</span> ${esc(p.topic || '—')}</div>
        <div><span class="text-slate-400">Ixtisoslik:</span> ${esc([p.specialty_code, p.specialty_name].filter(Boolean).join(' — ') || '—')}</div>
        <div><span class="text-slate-400">Boshlagan:</span> ${fmtDate(p.start_date)} · <span class="text-slate-400">Rahbar:</span> ${esc(sup)}</div>
        <div><span class="text-slate-400">Email:</span> ${esc(p.email || '—')} · <span class="text-slate-400">Tel:</span> ${esc(p.phone || '—')}</div>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="step-badge ${RISK[s.risk].badge}">${RISK[s.risk].label}</span>
        <span class="text-slate-300">Reja ${s.progress}% · Dissertatsiya ${s.pagesTotal ? s.dissPct + '%' : '—'} · Maqolalar ${s.pubsDone}/${s.pubs.length} · Hujjatlar ${s.docsReady}/${s.docs.length}</span>
      </div>
      ${(() => { const sc = scholarship(id); return sc.applyYear ? `<div class="text-xs text-slate-300 p-2.5 rounded-lg bg-[#0C1427] border border-[#1D3058]">🏅 Prezident stipendiyasi (${sc.applyYear}): majburiy talablar <b>${sc.readiness}%</b> · ${sc.rows.filter(r => r.req && !r.ok).map(r => esc(r.title)).slice(0, 3).join('; ') || 'hammasi bajarilgan'}</div>` : ''; })()}
      <div class="space-y-2">${s.plan.map(pl => planRow(pl, s.current && pl.id === s.current.id)).join('') || '<p class="text-xs text-slate-500">Reja kiritilmagan.</p>'}</div>
      <button onclick="quickAddTask('${id}')" class="btn-primary">+ Vazifa berish</button>`);
  };

  // =====================================================================
  // Department view
  // =====================================================================
  function renderDepartmentView() {
    const students = L.profiles.filter(p => p.role === 'doctoral_student');
    const all = students.map(p => ({ p, s: stats(p.id) }));
    const count = r => all.filter(x => x.s.risk === r).length;
    let rows = all;
    if (L.deptFilterYear !== 'ALL') rows = rows.filter(x => String(x.s.year) === L.deptFilterYear);
    if (L.deptFilterRisk !== 'ALL') rows = rows.filter(x => x.s.risk === L.deptFilterRisk);
    const supervisors = L.profiles.filter(p => p.role === 'supervisor');

    return header('Ilmiy bo‘lim', 'Doktorantlar monitoringi va foydalanuvchilarni boshqarish',
      `<button onclick="exportDepartmentCsv()" class="btn-ghost self-start">CSV yuklab olish</button>`) + `
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        ${deptStat('Doktorantlar', students.length, 'text-white')}
        ${deptStat('Reja bo‘yicha', count('ok'), 'text-emerald-400')}
        ${deptStat('O‘rta risk', count('medium'), 'text-amber-400')}
        ${deptStat('Yuqori risk', count('high'), 'text-rose-400')}
        ${deptStat('Ilmiy rahbarlar', supervisors.length, 'text-cyan-400')}
      </div>
      <div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 class="text-base font-semibold text-white">Doktorantlar reyestri</h3>
          <div class="flex gap-2 text-xs">
            <select onchange="setDeptFilter('year', this.value)" class="live-input !w-auto">
              ${[['ALL', 'Barcha yillar'], ['1', '1-yil'], ['2', '2-yil'], ['3', '3-yil'], ['4', '4-yil']].map(([v, l]) => `<option value="${v}" ${L.deptFilterYear === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
            <select onchange="setDeptFilter('risk', this.value)" class="live-input !w-auto">
              ${[['ALL', 'Barcha holatlar'], ['ok', 'Reja bo‘yicha'], ['medium', 'O‘rta risk'], ['high', 'Yuqori risk'], ['none', 'Reja kiritilmagan']].map(([v, l]) => `<option value="${v}" ${L.deptFilterRisk === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="overflow-x-auto"><table class="w-full min-w-[700px] text-xs text-left">
          <thead class="text-slate-400 uppercase border-b border-[#1D3058]"><tr>
            <th class="py-2 px-2">F.I.Sh.</th><th class="py-2 px-2">Yil</th><th class="py-2 px-2">Ixtisoslik</th><th class="py-2 px-2">Rahbar</th>
            <th class="py-2 px-2">Reja</th><th class="py-2 px-2">Muddati o‘tgan</th><th class="py-2 px-2">Stipendiya</th><th class="py-2 px-2">Holat</th></tr></thead>
          <tbody class="divide-y divide-[#1D3058]/60">
            ${rows.map(({ p, s }) => `<tr class="hover:bg-slate-800/30 cursor-pointer" onclick="openStudent('${p.id}')">
              <td class="py-2.5 px-2 font-semibold text-slate-200">${esc(p.full_name || p.email)}</td>
              <td class="py-2.5 px-2 text-slate-400">${s.year ? s.year + '-yil' : '—'}</td>
              <td class="py-2.5 px-2 text-slate-300">${esc(p.specialty_code || '—')}</td>
              <td class="py-2.5 px-2 text-slate-300">${esc(p.supervisor_id ? profileName(p.supervisor_id) : (p.supervisor_text ? p.supervisor_text + ' *' : '—'))}</td>
              <td class="py-2.5 px-2 font-mono text-blue-400">${s.progress}%</td>
              <td class="py-2.5 px-2 font-mono ${s.overdue.length ? 'text-rose-400' : 'text-slate-500'}">${s.overdue.length}</td>
              <td class="py-2.5 px-2 font-mono text-amber-300">${(() => { const sc = scholarship(p.id); return sc.applyYear ? `${sc.readiness}% · ${sc.applyYear}` : '—'; })()}</td>
              <td class="py-2.5 px-2"><span class="step-badge ${RISK[s.risk].badge}">${RISK[s.risk].label}</span></td></tr>`).join('') ||
              '<tr><td colspan="8" class="py-6 text-center text-slate-500">Doktorant topilmadi</td></tr>'}
          </tbody></table></div>
      </div>
      ${renderUsersAdmin()}
      ${renderOrdersAdmin()}
      ${renderSpecialtiesAdmin()}
      ${renderPlagiarismAdmin()}`;
  }

  function renderOrdersAdmin() {
    return `<div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><h3 class="text-base font-semibold text-white">Qabul buyruqlari</h3>
          <p class="text-xs text-slate-400 mt-1">Doktorant profilda o‘z buyrug‘ini tanlaydi — kirgan sana va muddatlar shundan olinadi.</p></div>
        <button onclick="openForm('admission_orders')" class="btn-primary">+ Qo‘shish</button>
      </div>
      <div class="space-y-2">${L.orders.map(o => {
        const n = L.profiles.filter(p => p.admission_order_id === o.id).length;
        return `<div class="step-row">
          <div class="flex-1 min-w-0"><div class="step-title truncate">${esc(o.number)} · ${esc(fmtDate(o.order_date))} — ${esc(o.university)}</div>
            <div class="text-xs text-slate-400 truncate">O‘qish: ${esc(fmtDate(o.study_start))} dan ${o.duration_years} yil · ${n} ta doktorant${o.doc_code ? ' · kod ' + esc(o.doc_code) : ''}</div></div>
          <button onclick="openForm('admission_orders','${o.id}')" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Tahrirlash"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button onclick="deleteRow('admission_orders','${o.id}')" class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" title="O‘chirish"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`;
      }).join('') || '<p class="text-sm text-slate-500">Hali buyruq kiritilmagan.</p>'}</div>
    </div>`;
  }

  function renderSpecialtiesAdmin() {
    return `<div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><h3 class="text-base font-semibold text-white">Ixtisosliklar ro‘yxati</h3>
          <p class="text-xs text-slate-400 mt-1">Doktorantlar profilda shu ro‘yxatdan tanlaydi.</p></div>
        <button onclick="openForm('specialties')" class="btn-primary">+ Qo‘shish</button>
      </div>
      <div class="space-y-2">${L.specs.map(s => `<div class="step-row">
        <span class="font-mono text-sm text-blue-300 shrink-0">${esc(s.code)}</span>
        <div class="flex-1 min-w-0"><div class="step-title truncate">${esc(s.name)}</div>${s.source ? `<div class="text-xs text-slate-500 truncate">${esc(s.source)}</div>` : ''}</div>
        <button onclick="deleteSpecialty('${esc(s.code)}')" class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" title="O‘chirish"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>`).join('') || '<p class="text-sm text-slate-500">Ro‘yxat bo‘sh.</p>'}</div>
    </div>`;
  }
  window.deleteSpecialty = async function (code) {
    if (!confirm(`${code} ro‘yxatdan o‘chirilsinmi? (Doktorantlar profilidagi shifr o‘zgarmaydi)`)) return;
    const { error } = await sb.from('specialties').delete().eq('code', code);
    if (error) return fail(error);
    toast('O‘chirildi'); reload();
  };

  function renderPlagiarismAdmin() {
    return `<div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><h3 class="text-base font-semibold text-white">Antiplagiat tizimlari</h3>
          <p class="text-xs text-slate-400 mt-1">Doktorantlar shu ro‘yxatdan tanlaydi. Universitet rasmiy qabul qiladigan tizimni belgilang.</p></div>
        <button onclick="openForm('plagiarism_services')" class="btn-primary">+ Qo‘shish</button>
      </div>
      <div class="space-y-2">${L.plag.map(s => `<div class="step-row">
        <div class="flex-1 min-w-0"><div class="step-title truncate">${esc(s.name)} ${s.official ? '<span class="step-badge badge-emerald">rasmiy</span>' : ''}</div>
          <div class="text-xs text-slate-400 truncate">${esc(s.url)} · ${esc(s.pricing || '')}</div></div>
        <button onclick="openForm('plagiarism_services','${s.id}')" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Tahrirlash"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button onclick="deleteRow('plagiarism_services','${s.id}')" class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" title="O‘chirish"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>`).join('') || '<p class="text-sm text-slate-500">Ro‘yxat bo‘sh.</p>'}</div>
    </div>`;
  }
  function deptStat(label, value, cls) {
    return `<div class="stat-tile !cursor-default"><span class="stat-label">${label}</span><span class="stat-value ${cls}">${value}</span></div>`;
  }
  window.setDeptFilter = function (k, v) {
    if (k === 'year') L.deptFilterYear = v; else L.deptFilterRisk = v;
    rerender();
  };

  function renderUsersAdmin() {
    const supervisors = L.profiles.filter(p => p.role === 'supervisor');
    return `<div class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] space-y-3">
      <div><h3 class="text-base font-semibold text-white">Foydalanuvchilar va rollar</h3>
        <p class="text-xs text-slate-400 mt-1">Yangi foydalanuvchi saytda o‘zi ro‘yxatdan o‘tadi (doktorant sifatida). Shu yerda uning rolini o‘zgartiring va doktorantga rahbar biriktiring.</p></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-xs text-left">
        <thead class="text-slate-400 uppercase border-b border-[#1D3058]"><tr><th class="py-2 px-2">F.I.Sh.</th><th class="py-2 px-2">Email</th><th class="py-2 px-2">Rol</th><th class="py-2 px-2">Ilmiy rahbar</th><th></th></tr></thead>
        <tbody class="divide-y divide-[#1D3058]/60">
          ${L.profiles.map(p => `<tr>
            <td class="py-2 px-2 text-slate-200">${esc(p.full_name || '—')}</td>
            <td class="py-2 px-2 text-slate-400">${esc(p.email || '')}</td>
            <td class="py-2 px-2"><select id="role_${p.id}" class="live-input !py-1" ${p.id === L.me.id ? 'disabled' : ''}>
              ${Object.entries(ROLE_LABEL).map(([v, l]) => `<option value="${v}" ${p.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
            <td class="py-2 px-2"><select id="sup_${p.id}" class="live-input !py-1" ${p.role !== 'doctoral_student' ? 'disabled' : ''}>
              <option value="">—</option>${supervisors.map(s => `<option value="${s.id}" ${p.supervisor_id === s.id ? 'selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></td>
            <td class="py-2 px-2 text-right"><button onclick="saveUserRole('${p.id}')" class="text-blue-400 hover:text-blue-300 font-semibold">Saqlash</button></td></tr>`).join('')}
        </tbody></table></div></div>`;
  }
  window.saveUserRole = async function (id) {
    const roleVal = document.getElementById(`role_${id}`).value;
    const supVal = document.getElementById(`sup_${id}`).value || null;
    const { error } = await sb.from('profiles').update({ role: roleVal, supervisor_id: roleVal === 'doctoral_student' ? supVal : null }).eq('id', id);
    if (error) return fail(error);
    toast('Saqlandi'); reload();
  };
  window.exportDepartmentCsv = function () {
    const students = L.profiles.filter(p => p.role === 'doctoral_student');
    const head = ['F.I.Sh.', 'Email', 'Yil', 'Ixtisoslik', 'Mavzu', 'Ilmiy rahbar', 'Reja %', 'Muddati o‘tgan', 'Dissertatsiya %', 'Maqolalar', 'Hujjatlar', 'Holat'];
    const lines = students.map(p => {
      const s = stats(p.id);
      return [p.full_name, p.email, s.year || '', p.specialty_code, p.topic, p.supervisor_id ? profileName(p.supervisor_id) : (p.supervisor_text || ''),
        s.progress, s.overdue.length, s.pagesTotal ? s.dissPct : '', `${s.pubsDone}/${s.pubs.length}`, `${s.docsReady}/${s.docs.length}`, RISK[s.risk].label];
    });
    const csv = [head, ...lines].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `ilmyol_doktorantlar_${todayStr()}.csv`;
    a.click();
  };

  function renderSupervisorsForDepartment() {
    const supervisors = L.profiles.filter(p => p.role === 'supervisor');
    return header('Ilmiy rahbarlar', `${supervisors.length} ta rahbar`) + (supervisors.length ? `<div class="space-y-2.5">${supervisors.map(s => {
      const studs = L.profiles.filter(p => p.supervisor_id === s.id);
      const pending = L.plan.filter(p => p.status === 'submitted' && studs.some(x => x.id === p.student_id)).length;
      return `<div class="step-row"><img src="${avatarUrl(s.full_name)}" class="w-11 h-11 rounded-full" alt="">
        <div class="flex-1 min-w-0"><div class="step-title">${esc(s.full_name || s.email)}</div>
          <div class="text-xs text-slate-400">${studs.length} ta doktorant${pending ? ` · <span class="text-amber-400">${pending} ta tekshiruv kutmoqda</span>` : ''}</div></div></div>`;
    }).join('')}</div>` : emptyCard('Hali ilmiy rahbar yo‘q. “Ilmiy bo‘lim” sahifasida foydalanuvchiga “Ilmiy rahbar” rolini bering.', ''));
  }

  // =====================================================================
  // "Ma'lumotlarim" — data entry
  // =====================================================================
  const TABLES = {
    plan_items: {
      label: 'Individual reja', single: 'Reja bandi', fields: [
        { k: 'year', l: 'Yil', type: 'select', options: [[1, '1-yil'], [2, '2-yil'], [3, '3-yil'], [4, '4-yil']], req: true, num: true },
        { k: 'title', l: 'Band nomi', type: 'text', req: true },
        { k: 'due_date', l: 'Muddat', type: 'date' },
        { k: 'sort_order', l: 'Tartib raqami', type: 'number', num: true },
        { k: 'description', l: 'Izoh / tavsif', type: 'textarea' }
      ]
    },
    tasks: {
      label: 'Vazifalar', single: 'Vazifa', fields: [
        { k: 'title', l: 'Vazifa', type: 'text', req: true },
        { k: 'due_date', l: 'Muddat', type: 'date' }
      ]
    },
    chapters: {
      label: 'Boblar', single: 'Bob', fields: [
        { k: 'title', l: 'Bob nomi', type: 'text', req: true },
        { k: 'pages_done', l: 'Yozilgan bet', type: 'number', num: true },
        { k: 'pages_total', l: 'Rejadagi bet', type: 'number', num: true },
        { k: 'status', l: 'Holat', type: 'select', options: ['Boshlanmagan', 'Yozilmoqda', 'Rahbarga topshirilgan', 'Tasdiqlangan'].map(v => [v, v]) },
        { k: 'sort_order', l: 'Tartib raqami', type: 'number', num: true }
      ]
    },
    publications: {
      label: 'Maqolalar', single: 'Maqola', fields: [
        { k: 'title', l: 'Maqola nomi', type: 'text', req: true },
        { k: 'journal', l: 'Jurnal / to‘plam', type: 'text' },
        { k: 'indexing', l: 'Turi', type: 'select', options: ['', 'OAK ro‘yxatidagi jurnal', 'Scopus', 'Web of Science', 'Xalqaro konferensiya', 'Respublika konferensiyasi', 'Monografiya', 'Patent', 'Boshqa'].map(v => [v, v || '—']) },
        { k: 'year', l: 'Yil', type: 'number', num: true },
        { k: 'status', l: 'Holat', type: 'select', options: Object.entries(PUB_STATUS) },
        { k: 'url', l: 'Havola (URL)', type: 'url' },
        { k: 'plagiarism_service', l: 'Antiplagiat tizimi', type: 'select', options: () => [['', '— tekshirilmagan —'], ...L.plag.map(s => [s.name, s.name]), ['Boshqa', 'Boshqa']] },
        { k: 'originality', l: 'Originallik, %', type: 'number', num: true, max: 100, step: '0.1' },
        { k: 'originality_required', l: 'Talab qilingan originallik, % (jurnal yoki OTM talabi)', type: 'number', num: true, max: 100, step: '0.1' },
        { k: 'plagiarism_checked_at', l: 'Tekshirilgan sana', type: 'date' }
      ]
    },
    admission_orders: {
      label: 'Qabul buyruqlari', single: 'Qabul buyrug‘i', global: true, fields: [
        { k: 'university', l: 'OTM / muassasa', type: 'text', req: true },
        { k: 'number', l: 'Buyruq raqami (masalan D/86)', type: 'text', req: true },
        { k: 'order_date', l: 'Buyruq sanasi', type: 'date', req: true },
        { k: 'title', l: 'Buyruq nomi', type: 'text', req: true },
        { k: 'study_start', l: 'O‘qish boshlanadigan sana', type: 'date', req: true },
        { k: 'duration_years', l: 'Muddati (yil)', type: 'number', num: true, max: 6 },
        { k: 'doc_code', l: 'Hujjat kodi (ijro.gov.uz)', type: 'text' },
        { k: 'note', l: 'Izoh', type: 'textarea' }
      ]
    },
    specialties: {
      label: 'Ixtisosliklar', single: 'Ixtisoslik', global: true, fields: [
        { k: 'code', l: 'Shifr (masalan 10.00.09)', type: 'text', req: true },
        { k: 'name', l: 'Nomi', type: 'text', req: true },
        { k: 'source', l: 'Manba (ixtiyoriy)', type: 'text' }
      ]
    },
    plagiarism_services: {
      label: 'Antiplagiat tizimlari', single: 'Antiplagiat tizimi', global: true, fields: [
        { k: 'name', l: 'Nomi', type: 'text', req: true },
        { k: 'url', l: 'Sayt manzili (https://...)', type: 'url', req: true },
        { k: 'description', l: 'Qisqa tavsif', type: 'text' },
        { k: 'pricing', l: 'Narxi (masalan: bepul / pullik / universitet orqali)', type: 'text' },
        { k: 'official', l: 'Universitet natijasini qabul qiladimi?', type: 'select', options: [['false', 'Yo‘q / noma’lum'], ['true', 'Ha, rasmiy qabul qilinadi']], bool: true },
        { k: 'sort_order', l: 'Tartib raqami', type: 'number', num: true }
      ]
    },
    documents: {
      label: 'Hujjatlar', single: 'Hujjat', fields: [
        { k: 'title', l: 'Hujjat nomi', type: 'text', req: true },
        { k: 'status', l: 'Holat', type: 'select', options: Object.entries(DOC_STATUS) },
        { k: 'due_date', l: 'Topshirish muddati', type: 'date' },
        { k: 'note', l: 'Izoh', type: 'text' }
      ]
    }
  };
  TABLES.scholarship_items = {
    label: 'Stipendiya hujjatlari', single: 'Yozuv', fields: [
      { k: 'kind', l: 'Turi', type: 'select', options: () => Object.entries(SCHOL_KIND), req: true },
      { k: 'title', l: 'Nomi (masalan: Mutaxassislik fanidan malakaviy imtihon, IELTS)', type: 'text', req: true },
      { k: 'grade', l: 'Baho yoki daraja (a’lo, yaxshi / B2, C1 / IELTS 7.0)', type: 'text' },
      { k: 'done', l: 'Holat', type: 'select', options: [['true', 'Bajarildi / bor'], ['false', 'Rejada']], bool: true },
      { k: 'event_date', l: 'Sana', type: 'date' },
      { k: 'expires_at', l: 'Amal qilish muddati (sertifikat uchun)', type: 'date' },
      { k: 'note', l: 'Izoh', type: 'text' }
    ]
  };
  const LIST_KEY = { plan_items: 'plan', tasks: 'tasks', chapters: 'chapters', publications: 'pubs', documents: 'docs', scholarship_items: 'schol', plagiarism_services: 'plag', specialties: 'specs', admission_orders: 'orders' };

  function renderMyDataView() {
    const isStudent = role() === 'doctoral_student';
    const tabs = [['profile', 'Profil']].concat(isStudent ? [['plan', 'Reja'], ['tasks', 'Vazifalar'], ['chapters', 'Boblar'], ['publications', 'Maqolalar'], ['documents', 'Hujjatlar']] : []);
    if (!tabs.some(t => t[0] === L.myDataTab)) L.myDataTab = 'profile';
    const tabBar = `<div class="flex gap-1 overflow-x-auto p-1 rounded-xl bg-[#0C1427] border border-[#1D3058] w-fit max-w-full">
      ${tabs.map(([k, l]) => `<button onclick="goMyData('${k}')" class="px-3.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${L.myDataTab === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}">${l}</button>`).join('')}</div>`;
    const body = L.myDataTab === 'profile' ? profileForm() : tableList(L.myDataTab === 'plan' ? 'plan_items' : L.myDataTab);
    return header('Ma’lumotlarim', 'Shu yerda kiritgan ma’lumotlaringiz asosida progress va eslatmalar hisoblanadi') + tabBar + body;
  }

  function profileForm() {
    const p = L.me;
    const isStudent = p.role === 'doctoral_student';
    const sup = p.supervisor_id ? profileName(p.supervisor_id) : 'Biriktirilmagan (ilmiy bo‘lim biriktiradi)';
    const f = (k, l, type, extra) => `<div class="${extra || ''}"><label class="live-label">${l}</label>
      ${type === 'textarea' ? `<textarea id="pf_${k}" rows="3" class="live-input">${esc(p[k] || '')}</textarea>` : `<input id="pf_${k}" type="${type}" value="${esc(p[k] || '')}" class="live-input">`}</div>`;
    return `<form id="profileForm" onsubmit="saveProfile(event)" oninput="markProfileDirty()" onchange="markProfileDirty()" class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] grid grid-cols-1 md:grid-cols-2 gap-4">
      <div id="pfDirty" class="hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[65] px-4 py-3 rounded-2xl bg-amber-500 text-[#0F1B33] shadow-2xl flex items-center gap-3">
        <span class="text-sm font-semibold">Saqlanmagan o‘zgarishlar bor</span>
        <button class="px-4 py-1.5 rounded-xl bg-[#0F1B33] text-white text-sm font-semibold">Saqlash</button>
      </div>
      ${f('full_name', 'F.I.Sh.', 'text')}
      <div><label class="live-label">Email</label><input value="${esc(p.email || '')}" disabled class="live-input opacity-60"></div>
      ${isStudent ? f('topic', 'Dissertatsiya mavzusi', 'textarea', 'md:col-span-2') : f('academic_title', 'Ilmiy daraja va unvon', 'text')}
      ${specialtyPicker(p)}
      ${f('university', 'OTM / ilmiy muassasa', 'text')}
      ${f('department', 'Kafedra', 'text')}
      ${isStudent ? orderPicker(p) : ''}
      ${isStudent ? f('start_date', 'Doktoranturaga kirgan sana (reja muddatlari va stipendiya taymeri shundan hisoblanadi)', 'date') : ''}
      ${f('phone', 'Telefon', 'tel')}
      ${isStudent ? (p.supervisor_id
        ? `<div><label class="live-label">Ilmiy rahbar (saytdagi akkaunt)</label><input value="${esc(sup)}" disabled class="live-input opacity-60">
            <p class="text-[11px] text-slate-500 mt-1">Rahbarni ilmiy bo‘lim biriktiradi. Ismi noto‘g‘ri bo‘lsa, rahbar o‘z akkauntida “Ma’lumotlar → Profil”dan F.I.Sh.ni o‘zgartiradi.</p></div>`
        : `<div><label class="live-label">Ilmiy rahbar F.I.Sh.</label><input id="pf_supervisor_text" type="text" value="${esc(p.supervisor_text || '')}" placeholder="Masalan: Rahimov Abdurahmon, f.f.d., professor" class="live-input">
            <p class="text-[11px] text-slate-500 mt-1">Rahbar saytda ro‘yxatdan o‘tsa, ilmiy bo‘lim uni akkauntingizga biriktiradi — shunda tasdiqlash va Telegram xabarlari ishlaydi.</p></div>`) : ''}
      <div class="md:col-span-2 flex justify-end"><button class="btn-primary">Saqlash</button></div>
    </form>`;
  }
  // Specialty is picked from the department-managed list; "Boshqa" reveals manual fields
  function specialtyPicker(p) {
    const known = L.specs.some(s => s.code === p.specialty_code);
    const other = !!p.specialty_code && !known;
    return `<div class="md:col-span-2">
      <label class="live-label">Ixtisoslik</label>
      <select id="pf_specialty_select" onchange="onSpecialtySelect(this.value)" class="live-input">
        <option value="">— tanlang —</option>
        ${L.specs.map(s => `<option value="${esc(s.code)}" ${p.specialty_code === s.code ? 'selected' : ''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('')}
        <option value="__other" ${other ? 'selected' : ''}>Boshqa (ro‘yxatda yo‘q)…</option>
      </select>
      <div id="pf_specialty_other" class="${other ? '' : 'hidden'} grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
        <input id="pf_specialty_code" value="${esc(p.specialty_code || '')}" placeholder="Shifr, masalan 08.00.13" pattern="\\d{2}\\.\\d{2}\\.\\d{2}" class="live-input">
        <input id="pf_specialty_name" value="${esc(p.specialty_name || '')}" placeholder="Ixtisoslik nomi" class="live-input md:col-span-2">
      </div>
    </div>`;
  }
  // Admission order (department-managed) fixes the official study start date
  function orderPicker(p) {
    const o = L.orders.find(x => x.id === p.admission_order_id);
    return `<div>
      <label class="live-label">Qabul buyrug‘i</label>
      <select id="pf_admission_order_id" onchange="onOrderSelect(this.value)" class="live-input">
        <option value="">— tanlanmagan —</option>
        ${L.orders.map(x => `<option value="${x.id}" ${x.id === p.admission_order_id ? 'selected' : ''}>${esc(x.number)} (${esc(fmtDate(x.order_date))}) — o‘qish ${esc(fmtDate(x.study_start))} dan</option>`).join('')}
      </select>
      ${o ? `<p class="text-[11px] text-slate-500 mt-1">${esc(o.university)} · ${o.duration_years} yil${o.doc_code ? ' · kod ' + esc(o.doc_code) : ''}</p>` : ''}
    </div>`;
  }
  window.onOrderSelect = function (id) {
    const o = L.orders.find(x => x.id === id);
    const start = document.getElementById('pf_start_date');
    if (o && start) { start.value = o.study_start; toast(`Kirgan sana buyruq bo‘yicha: ${fmtDate(o.study_start)}`); }
  };

  window.onSpecialtySelect = function (v) {
    const box = document.getElementById('pf_specialty_other');
    const code = document.getElementById('pf_specialty_code');
    const name = document.getElementById('pf_specialty_name');
    if (v === '__other') { box.classList.remove('hidden'); code.value = ''; name.value = ''; code.focus(); return; }
    box.classList.add('hidden');
    const s = L.specs.find(x => x.code === v);
    code.value = s ? s.code : '';
    name.value = s ? s.name : '';
  };

  window.markProfileDirty = function () {
    const el = document.getElementById('pfDirty');
    if (el) el.classList.remove('hidden');
    window.onbeforeunload = () => 'Profildagi o‘zgarishlar saqlanmagan';
  };

  window.saveProfile = async function (e) {
    e.preventDefault();
    window.onbeforeunload = null;
    const keys = ['full_name', 'topic', 'academic_title', 'specialty_code', 'specialty_name', 'university', 'department', 'start_date', 'phone', 'supervisor_text', 'admission_order_id'];
    const patch = {};
    keys.forEach(k => { const el = document.getElementById(`pf_${k}`); if (el) patch[k] = el.value.trim() || null; });
    if (!patch.full_name) return toast('F.I.Sh. bo‘sh bo‘lmasin', 'error');
    const { error } = await sb.from('profiles').update(patch).eq('id', L.me.id);
    if (error) return fail(error);
    if (patch.topic) { IlmYolData.student.topic = patch.topic; const i = document.getElementById('topicSearchInput'); if (i) i.value = patch.topic; AppState.currentInputTopic = null; }
    toast('Profil saqlandi');
    reload();
  };

  // ---- Antiplagiat: free link-out to external systems + recorded result per article ----
  function plagiarismState(p) {
    if (p.originality === null || p.originality === undefined) return { text: '', low: false };
    const val = Number(p.originality), req = p.originality_required !== null && p.originality_required !== undefined ? Number(p.originality_required) : null;
    return {
      text: `Antiplagiat: ${val}%${req !== null ? ` (talab ≥${req}%)` : ''}${p.plagiarism_service ? ` · ${p.plagiarism_service}` : ''}`,
      low: req !== null && val < req
    };
  }

  window.openPlagiarismServices = function () {
    const list = L.plag.length ? L.plag.map(s => `
      <div class="p-3 rounded-xl bg-[#0C1427] border ${s.official ? 'border-emerald-500/40' : 'border-[#1D3058]'} space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold text-white">${esc(s.name)}</div>
          ${s.official ? '<span class="step-badge badge-emerald">Universitet qabul qiladi</span>' : ''}
        </div>
        ${s.description ? `<div class="text-xs text-slate-400">${esc(s.description)}</div>` : ''}
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-amber-300">${esc(s.pricing || '')}</span>
          <a href="${esc(s.url)}" target="_blank" rel="noopener" class="btn-primary !py-1 !px-3 text-xs">Ochish ↗</a>
        </div>
      </div>`).join('') : '<p class="text-sm text-slate-400">Ro‘yxat hali bo‘sh — ilmiy bo‘lim qo‘shadi.</p>';
    openLiveModal('Antiplagiat tekshiruvi', `
      <ol class="text-sm text-slate-300 space-y-1 list-decimal list-inside">
        <li>Tizimni tanlang va saytida maqolangizni tekshiring (pullik tizimlarda to‘lov tizimning o‘zida).</li>
        <li>Natijani <b>Ma’lumotlar → Maqolalar</b>da maqola ✏️ orqali kiriting: tizim, originallik %, talab %.</li>
      </ol>
      <div class="space-y-2">${list}</div>
      <p class="text-xs text-slate-500">Rasmiy hisoblanadigan natija universitet va jurnal talabiga bog‘liq. Ba’zi tizimlar tekshirilgan matnni bazasiga saqlaydi — chop etilmagan maqolani yuborishdan oldin bu sozlamani tekshiring.</p>`);
  };

  // Dedicated "Antiplagiat" page: systems (link-out) + each article's recorded result
  function renderPlagiarismView() {
    const mine = L.pubs.filter(x => x.student_id === L.me.id);
    const checked = mine.filter(x => x.originality !== null && x.originality !== undefined);
    const low = checked.filter(x => plagiarismState(x).low);
    const services = L.plag.map(s => `
      <div class="rounded-2xl p-4 bg-[#121E38] border ${s.official ? 'border-emerald-500/40' : 'border-[#1D3058]'} flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold text-white">${esc(s.name)}</div>
          ${s.official ? '<span class="step-badge badge-emerald">Universitet qabul qiladi</span>' : ''}
        </div>
        ${s.description ? `<div class="text-xs text-slate-400 flex-1">${esc(s.description)}</div>` : '<div class="flex-1"></div>'}
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-amber-300">${esc(s.pricing || '')}</span>
          <a href="${esc(s.url)}" target="_blank" rel="noopener" class="btn-primary !py-1 !px-3 text-xs">Ochish ↗</a>
        </div>
      </div>`).join('') || '<p class="text-sm text-slate-400">Ro‘yxat hali bo‘sh — ilmiy bo‘lim qo‘shadi.</p>';

    const articles = mine.length ? mine.map(x => {
      const pl = plagiarismState(x);
      const has = x.originality !== null && x.originality !== undefined;
      return `<div class="step-row">
        <span class="step-icon ${!has ? 'bg-slate-700/60 text-slate-300' : pl.low ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500 text-white'}"><i data-lucide="${!has ? 'circle' : pl.low ? 'alert-triangle' : 'check'}" class="w-5 h-5"></i></span>
        <div class="flex-1 min-w-0">
          <div class="step-title truncate">${esc(x.title)}</div>
          <div class="text-xs ${pl.low ? 'text-rose-300' : 'text-slate-400'} truncate">${has ? esc(pl.text) + (x.plagiarism_checked_at ? ' · ' + fmtDate(x.plagiarism_checked_at) : '') + (pl.low ? ' — talabdan past' : '') : 'Hali tekshirilmagan'}</div>
        </div>
        <button onclick="openForm('publications','${x.id}')" class="btn-ghost !py-1 !px-3 text-xs shrink-0">${has ? 'Tahrirlash' : 'Natija kiritish'}</button>
      </div>`;
    }).join('') : emptyCard('Hali maqola kiritilmagan.', `<button onclick="openForm('publications')" class="btn-primary">+ Maqola qo‘shish</button>`);

    return header('Antiplagiat', 'Maqolani tekshirish va natijani qayd etish') + `
      <div class="grid grid-cols-3 gap-4">
        ${tile('', 'file-text', 'blue', String(mine.length), 'Maqolalar')}
        ${tile('', 'check-circle-2', 'emerald', `${checked.length} / ${mine.length}`, 'Tekshirilgan')}
        ${tile('', 'alert-triangle', low.length ? 'rose' : 'slate', String(low.length), 'Talabdan past')}
      </div>
      <div class="rounded-2xl p-5 bg-[#16264A] border border-[#1D3058] text-sm text-slate-300 space-y-1">
        <div class="font-semibold text-white">Qanday ishlaydi</div>
        <div>1. Pastdagi tizimlardan birini tanlang va uning saytida maqolangizni tekshiring (pullik bo‘lsa, to‘lov tizimning o‘zida).</div>
        <div>2. Natijani shu sahifada maqola qarshisidagi <b>“Natija kiritish”</b> orqali yozing: tizim, originallik %, talab qilingan %.</div>
      </div>
      <div class="space-y-3"><h3 class="text-lg font-semibold text-white">Maqolalarim</h3>${articles}</div>
      <div class="space-y-3"><h3 class="text-lg font-semibold text-white">Antiplagiat tizimlari</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">${services}</div></div>
      <p class="text-xs text-slate-500">Rasmiy hisoblanadigan natija universitet va jurnal talabiga bog‘liq. Ba’zi tizimlar tekshirilgan matnni o‘z bazasiga saqlaydi — chop etilmagan maqolani yuborishdan oldin bu sozlamani tekshiring.</p>`;
  }

  function cellValue(tableKey, row) {
    switch (tableKey) {
      case 'plan_items': return { main: row.title, sub: `${row.year}-yil · ${row.due_date ? fmtDate(row.due_date) : 'muddat yo‘q'}`, badge: [PLAN_STATUS[row.status].label, PLAN_STATUS[row.status].badge] };
      case 'tasks': return { main: row.title, sub: row.due_date ? fmtDate(row.due_date) : 'muddat yo‘q', badge: row.done ? ['Bajarildi', 'badge-emerald'] : ['Ochiq', 'badge-slate'] };
      case 'chapters': return { main: row.title, sub: `${row.pages_done} / ${row.pages_total} bet`, badge: [row.status, 'badge-slate'] };
      case 'publications': {
        const pl = plagiarismState(row);
        return {
          main: row.title,
          sub: [row.journal, row.indexing, row.year, pl.text].filter(Boolean).join(' · ') || '—',
          badge: pl.low ? ['Originallik past', 'badge-rose'] : [PUB_STATUS[row.status], row.status === 'published' ? 'badge-emerald' : 'badge-blue']
        };
      }
      case 'documents': return { main: row.title, sub: [row.due_date ? fmtDate(row.due_date) : '', row.note].filter(Boolean).join(' · ') || '—', badge: [DOC_STATUS[row.status], row.status === 'ready' ? 'badge-emerald' : row.status === 'in_progress' ? 'badge-amber' : 'badge-slate'] };
      case 'scholarship_items': return {
        main: row.title,
        sub: [SCHOL_KIND[row.kind], row.grade, row.event_date ? fmtDate(row.event_date) : '', row.expires_at ? `amal qiladi: ${fmtDate(row.expires_at)} gacha` : ''].filter(Boolean).join(' · '),
        badge: row.done ? ['Bajarildi', 'badge-emerald'] : ['Rejada', 'badge-slate']
      };
    }
  }

  function tableList(tableKey) {
    const spec = TABLES[tableKey];
    let rows = L[LIST_KEY[tableKey]].filter(r => r.student_id === L.me.id);
    if (tableKey === 'plan_items') rows = sortPlan(rows);
    let templ = ['plan_items', 'chapters', 'documents'].includes(tableKey) && !rows.length
      ? `<button onclick="applyTemplate('${tableKey}')" class="btn-ghost">Andozadan qo‘shish</button>` : '';
    if (tableKey === 'publications') templ += `<button onclick="openPlagiarismServices()" class="btn-ghost">🔍 Antiplagiat</button>`;
    return `<div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-lg font-semibold text-white">${spec.label} <span class="text-slate-500 text-sm font-normal">· ${rows.length}</span></h3>
        <div class="flex gap-2">${templ}<button onclick="openForm('${tableKey}')" class="btn-primary">+ Qo‘shish</button></div>
      </div>
      ${rows.length ? `<div class="space-y-2">${rows.map(r => {
        const v = cellValue(tableKey, r);
        return `<div class="step-row">
          <div class="flex-1 min-w-0"><div class="step-title truncate">${esc(v.main)}</div><div class="text-xs text-slate-400 truncate">${esc(v.sub)}</div></div>
          <span class="step-badge ${v.badge[1]} shrink-0 hidden sm:inline">${esc(v.badge[0])}</span>
          <button onclick="openForm('${tableKey}','${r.id}')" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Tahrirlash"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button onclick="deleteRow('${tableKey}','${r.id}')" class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" title="O‘chirish"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`;
      }).join('')}</div>` : emptyCard('Hali hech narsa kiritilmagan.', '')}
    </div>`;
  }

  window.openForm = function (tableKey, id, presetKind) {
    const spec = TABLES[tableKey];
    const row = id ? byId(L[LIST_KEY[tableKey]], id) : {};
    const defaults = { year: 1, status: tableKey === 'publications' ? 'planned' : tableKey === 'documents' ? 'missing' : 'Boshlanmagan', pages_done: 0, pages_total: 0, sort_order: 0, done: true, kind: presetKind || 'exam', duration_years: 3 };
    const val = k => (row[k] !== undefined && row[k] !== null ? row[k] : (id ? '' : (defaults[k] !== undefined ? defaults[k] : '')));
    const fields = spec.fields.map(f => {
      let input;
      const options = typeof f.options === 'function' ? f.options() : f.options;
      if (f.type === 'select') input = `<select id="ff_${f.k}" class="live-input">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(val(f.k)) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      else if (f.type === 'textarea') input = `<textarea id="ff_${f.k}" rows="3" class="live-input">${esc(val(f.k))}</textarea>`;
      else input = `<input id="ff_${f.k}" type="${f.type}" ${f.req ? 'required' : ''} ${f.type === 'number' ? `min="0" ${f.max ? `max="${f.max}"` : ''} step="${f.step || 1}"` : ''} value="${esc(val(f.k))}" class="live-input">`;
      return `<div><label class="live-label">${f.l}${f.req ? ' *' : ''}</label>${input}</div>`;
    }).join('');
    openLiveModal(`${spec.single}${id ? ' — tahrirlash' : ' qo‘shish'}`, `
      <form onsubmit="saveForm(event, '${tableKey}', '${id || ''}')" class="space-y-3">${fields}
        <button class="btn-primary w-full">Saqlash</button></form>`);
  };

  window.saveForm = async function (e, tableKey, id) {
    e.preventDefault();
    const spec = TABLES[tableKey];
    const rec = {};
    spec.fields.forEach(f => {
      const raw = document.getElementById(`ff_${f.k}`).value.trim();
      rec[f.k] = f.bool ? raw === 'true' : raw === '' ? null : (f.num ? Number(raw) : raw);
    });
    ['pages_done', 'pages_total', 'sort_order'].forEach(k => { if (k in rec && rec[k] === null) rec[k] = 0; });
    const res = id
      ? await sb.from(tableKey).update(rec).eq('id', id)
      : await sb.from(tableKey).insert(spec.global ? rec : { ...rec, student_id: L.me.id });
    if (res.error) return fail(res.error);
    closeLiveModal(); toast('Saqlandi'); reload();
  };

  window.deleteRow = async function (tableKey, id) {
    if (!confirm('Rostdan o‘chirilsinmi?')) return;
    const { error } = await sb.from(tableKey).delete().eq('id', id);
    if (error) return fail(error);
    toast('O‘chirildi'); reload();
  };

  const TEMPLATES = {
    plan_items: [
      [1, 1, 'Dissertatsiya mavzusini Ilmiy kengashda tasdiqlash'], [1, 2, 'Individual ish rejasini tasdiqlash'],
      [1, 6, 'Adabiyotlar tahlili va nazariy asoslar'], [1, 9, '1-bob qo‘lyozmasi'],
      [1, 10, '1-maqola (OAK ro‘yxatidagi jurnal)'], [1, 11, '1-yil attestatsiyasi'],
      [2, 13, 'Tadqiqot metodologiyasini ishlab chiqish'], [2, 16, 'Empirik (amaliy) tadqiqot va ma’lumot yig‘ish'],
      [2, 20, '2-bob qo‘lyozmasi'], [2, 21, '2-maqola'], [2, 22, 'Ilmiy konferensiyada ma’ruza'], [2, 23, '2-yil attestatsiyasi'],
      [3, 26, '3-bob qo‘lyozmasi'], [3, 28, '3-maqola (xalqaro jurnal)'], [3, 30, 'Natijalarni amaliyotga joriy etish dalolatnomasi'],
      [3, 32, 'Kafedra dastlabki muhokamasi (seminar)'], [3, 33, 'Avtoreferat'], [3, 35, 'Ixtisoslashgan kengashda himoya']
    ],
    chapters: [['Kirish', 12], ['1-bob', 40], ['2-bob', 40], ['3-bob', 40], ['Xulosa', 8]],
    documents: ['Individual ish rejasi', '1-yil attestatsiya hisoboti', '2-yil attestatsiya hisoboti', 'Chet tili sertifikati',
      'Amaliyotga joriy etish dalolatnomasi', 'Kafedra dastlabki muhokamasi bayonnomasi', 'Avtoreferat']
  };
  window.applyTemplate = async function (tableKey) {
    const sid = L.me.id;
    let rows;
    if (tableKey === 'plan_items') {
      rows = TEMPLATES.plan_items.map(([year, m, title], i) => ({ student_id: sid, year, title, sort_order: i, due_date: addMonths(L.me.start_date, m) }));
      if (!L.me.start_date) toast('Profilda “kirgan sana” yo‘q — muddatlarni keyin qo‘shing', 'error');
    } else if (tableKey === 'chapters') {
      rows = TEMPLATES.chapters.map(([title, total], i) => ({ student_id: sid, title, pages_total: total, sort_order: i }));
    } else {
      rows = TEMPLATES.documents.map(title => ({ student_id: sid, title }));
    }
    const { error } = await sb.from(tableKey).insert(rows);
    if (error) return fail(error);
    toast('Andoza qo‘shildi — o‘zingizga moslab tahrirlang');
    reload();
  };

  // Local-only hook for testing views with mock data (never exposed on the deployed site)
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    window.__liveTest = { L, J, renderPlagiarismView, renderFormattingView, renderDefenseView, renderChaptersView, renderJournalsView, scholarship, renderScholarshipView, renderDashboard, renderDepartmentView, renderSupervisorView, renderMyDataView };
  }

  // =====================================================================
  // Start
  // =====================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // The recovery link signs the user in; ask for a new password once live data is loaded.
        L.recovery = true;
        if (L.mode === 'live') showRecoveryModal();
      }
    });
    let demo = false;
    try { demo = sessionStorage.getItem('ilmyol_demo') === '1'; } catch (e) { /* ignore */ }
    const savedEmail = store.get('localStorage', REMEMBER_EMAIL);
    if (savedEmail) {
      document.getElementById('authEmail').value = savedEmail;
      document.getElementById('authPassword').focus();
    }
    try {
      // "Remember me" was off: the login lasts only until the browser is closed
      if (store.get('localStorage', SESSION_ONLY) === '1' && !store.get('sessionStorage', SESSION_ALIVE)) {
        await sb.auth.signOut({ scope: 'local' });
        store.del('localStorage', SESSION_ONLY);
      }
      const { data: { session } } = await sb.auth.getSession();
      if (session) return await enterLive(session.user);
    } catch (e) { fail(e); }
    if (demo) window.enterDemo();
    else { L.mode = 'auth'; showAuth(true); document.getElementById('authLoading').classList.add('hidden'); document.getElementById('authForm').classList.remove('hidden'); }
  });
})();
