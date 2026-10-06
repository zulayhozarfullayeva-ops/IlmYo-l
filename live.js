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
    plan: [], tasks: [], chapters: [], pubs: [], docs: [], evidence: [], comments: [],
    myDataTab: 'profile',
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
    const [profiles, plan, tasks, chapters, pubs, docs, evidence, comments] = await Promise.all([
      q(sb.from('profiles').select('*').order('full_name')),
      q(sb.from('plan_items').select('*')),
      q(sb.from('tasks').select('*').order('created_at', { ascending: false })),
      q(sb.from('chapters').select('*').order('sort_order')),
      q(sb.from('publications').select('*').order('created_at')),
      q(sb.from('documents').select('*').order('created_at')),
      q(sb.from('evidence_files').select('*').order('created_at', { ascending: false })),
      q(sb.from('comments').select('*').order('created_at', { ascending: false }).limit(500))
    ]);
    Object.assign(L, { profiles, plan, tasks, chapters, pubs, docs, evidence, comments });
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
    setAuthMsg('');
  };

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
        if (data.session) { await enterLive(data.session.user); }
        else setAuthMsg('Emailingizga tasdiqlash xati yuborildi. Havolani bosing, keyin shu yerda kiring.');
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email yoki parol noto‘g‘ri. Parolni eslay olmasangiz, pastdagi “Parolni unutdingizmi? — tiklash” tugmasini bosing.' :
          error.message === 'Email not confirmed' ? 'Email hali tasdiqlanmagan — pochtangizni tekshiring' : error.message);
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
    if (role() === 'supervisor') return ['supervisor', 'topic_novelty', 'mydata'];
    if (role() === 'department') return ['department', 'supervisor', 'topic_novelty', 'mydata'];
    return ['dashboard', 'roadmap', 'topic_novelty', 'dissertation', 'calendar', 'defense', 'mydata'];
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
    origSwitchView(view);
    if (L.mode === 'live') renderLiveView(view);
  };

  const LIVE_RENDER = {
    dashboard: renderDashboard,
    roadmap: renderPlanView,
    dissertation: renderChaptersView,
    calendar: renderCalendarView,
    defense: renderDefenseView,
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
      <div class="p-3 rounded-xl bg-[#0C1427] border border-[#1D3058] text-xs text-slate-400">
        Telegram eslatmalari keyingi bosqichda qo‘shiladi.
      </div>
      <button onclick="liveSignOut()" class="btn-ghost w-full">Chiqish</button>
    `);
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

    let alerts = '';
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
    const btn = `<button onclick="goMyData('chapters')" class="btn-primary self-start">Tahrirlash</button>`;
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
      ['Hujjatlar tayyor', s.docsReady, s.docs.length]
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
  // Supervisor view
  // =====================================================================
  function renderSupervisorView() {
    if (role() === 'department') return renderSupervisorsForDepartment();
    const students = L.profiles.filter(p => p.supervisor_id === L.me.id);
    const pending = L.plan.filter(p => p.status === 'submitted' && students.some(s => s.id === p.student_id));
    let html = header('Mening doktorantlarim', `${students.length} ta doktorant biriktirilgan`);
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
    const sup = p.supervisor_id ? profileName(p.supervisor_id) : 'biriktirilmagan';
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
            <th class="py-2 px-2">Reja</th><th class="py-2 px-2">Muddati o‘tgan</th><th class="py-2 px-2">Holat</th></tr></thead>
          <tbody class="divide-y divide-[#1D3058]/60">
            ${rows.map(({ p, s }) => `<tr class="hover:bg-slate-800/30 cursor-pointer" onclick="openStudent('${p.id}')">
              <td class="py-2.5 px-2 font-semibold text-slate-200">${esc(p.full_name || p.email)}</td>
              <td class="py-2.5 px-2 text-slate-400">${s.year ? s.year + '-yil' : '—'}</td>
              <td class="py-2.5 px-2 text-slate-300">${esc(p.specialty_code || '—')}</td>
              <td class="py-2.5 px-2 text-slate-300">${esc(p.supervisor_id ? profileName(p.supervisor_id) : '—')}</td>
              <td class="py-2.5 px-2 font-mono text-blue-400">${s.progress}%</td>
              <td class="py-2.5 px-2 font-mono ${s.overdue.length ? 'text-rose-400' : 'text-slate-500'}">${s.overdue.length}</td>
              <td class="py-2.5 px-2"><span class="step-badge ${RISK[s.risk].badge}">${RISK[s.risk].label}</span></td></tr>`).join('') ||
              '<tr><td colspan="7" class="py-6 text-center text-slate-500">Doktorant topilmadi</td></tr>'}
          </tbody></table></div>
      </div>
      ${renderUsersAdmin()}`;
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
      return [p.full_name, p.email, s.year || '', p.specialty_code, p.topic, p.supervisor_id ? profileName(p.supervisor_id) : '',
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
        { k: 'indexing', l: 'Turi', type: 'select', options: ['', 'OAK ro‘yxatidagi jurnal', 'Scopus', 'Web of Science', 'Xalqaro konferensiya', 'Respublika konferensiyasi', 'Boshqa'].map(v => [v, v || '—']) },
        { k: 'year', l: 'Yil', type: 'number', num: true },
        { k: 'status', l: 'Holat', type: 'select', options: Object.entries(PUB_STATUS) },
        { k: 'url', l: 'Havola (URL)', type: 'url' }
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
  const LIST_KEY = { plan_items: 'plan', tasks: 'tasks', chapters: 'chapters', publications: 'pubs', documents: 'docs' };

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
    return `<form onsubmit="saveProfile(event)" class="rounded-2xl p-5 bg-[#121E38] border border-[#1D3058] grid grid-cols-1 md:grid-cols-2 gap-4">
      ${f('full_name', 'F.I.Sh.', 'text')}
      <div><label class="live-label">Email</label><input value="${esc(p.email || '')}" disabled class="live-input opacity-60"></div>
      ${isStudent ? f('topic', 'Dissertatsiya mavzusi', 'textarea', 'md:col-span-2') : f('academic_title', 'Ilmiy daraja va unvon', 'text')}
      ${f('specialty_code', 'Ixtisoslik shifri (masalan 10.00.09)', 'text')}
      ${f('specialty_name', 'Ixtisoslik nomi', 'text')}
      ${f('university', 'OTM / ilmiy muassasa', 'text')}
      ${f('department', 'Kafedra', 'text')}
      ${isStudent ? f('start_date', 'Doktoranturaga kirgan sana', 'date') : ''}
      ${f('phone', 'Telefon', 'tel')}
      ${isStudent ? `<div><label class="live-label">Ilmiy rahbar</label><input value="${esc(sup)}" disabled class="live-input opacity-60"></div>` : ''}
      <div class="md:col-span-2 flex justify-end"><button class="btn-primary">Saqlash</button></div>
    </form>`;
  }
  window.saveProfile = async function (e) {
    e.preventDefault();
    const keys = ['full_name', 'topic', 'academic_title', 'specialty_code', 'specialty_name', 'university', 'department', 'start_date', 'phone'];
    const patch = {};
    keys.forEach(k => { const el = document.getElementById(`pf_${k}`); if (el) patch[k] = el.value.trim() || null; });
    if (!patch.full_name) return toast('F.I.Sh. bo‘sh bo‘lmasin', 'error');
    const { error } = await sb.from('profiles').update(patch).eq('id', L.me.id);
    if (error) return fail(error);
    if (patch.topic) { IlmYolData.student.topic = patch.topic; const i = document.getElementById('topicSearchInput'); if (i) i.value = patch.topic; AppState.currentInputTopic = null; }
    toast('Profil saqlandi');
    reload();
  };

  function cellValue(tableKey, row) {
    switch (tableKey) {
      case 'plan_items': return { main: row.title, sub: `${row.year}-yil · ${row.due_date ? fmtDate(row.due_date) : 'muddat yo‘q'}`, badge: [PLAN_STATUS[row.status].label, PLAN_STATUS[row.status].badge] };
      case 'tasks': return { main: row.title, sub: row.due_date ? fmtDate(row.due_date) : 'muddat yo‘q', badge: row.done ? ['Bajarildi', 'badge-emerald'] : ['Ochiq', 'badge-slate'] };
      case 'chapters': return { main: row.title, sub: `${row.pages_done} / ${row.pages_total} bet`, badge: [row.status, 'badge-slate'] };
      case 'publications': return { main: row.title, sub: [row.journal, row.indexing, row.year].filter(Boolean).join(' · ') || '—', badge: [PUB_STATUS[row.status], row.status === 'published' ? 'badge-emerald' : 'badge-blue'] };
      case 'documents': return { main: row.title, sub: [row.due_date ? fmtDate(row.due_date) : '', row.note].filter(Boolean).join(' · ') || '—', badge: [DOC_STATUS[row.status], row.status === 'ready' ? 'badge-emerald' : row.status === 'in_progress' ? 'badge-amber' : 'badge-slate'] };
    }
  }

  function tableList(tableKey) {
    const spec = TABLES[tableKey];
    let rows = L[LIST_KEY[tableKey]].filter(r => r.student_id === L.me.id);
    if (tableKey === 'plan_items') rows = sortPlan(rows);
    const templ = ['plan_items', 'chapters', 'documents'].includes(tableKey) && !rows.length
      ? `<button onclick="applyTemplate('${tableKey}')" class="btn-ghost">Andozadan qo‘shish</button>` : '';
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

  window.openForm = function (tableKey, id) {
    const spec = TABLES[tableKey];
    const row = id ? byId(L[LIST_KEY[tableKey]], id) : {};
    const defaults = { year: 1, status: tableKey === 'publications' ? 'planned' : tableKey === 'documents' ? 'missing' : 'Boshlanmagan', pages_done: 0, pages_total: 0, sort_order: 0 };
    const val = k => (row[k] !== undefined && row[k] !== null ? row[k] : (id ? '' : (defaults[k] !== undefined ? defaults[k] : '')));
    const fields = spec.fields.map(f => {
      let input;
      if (f.type === 'select') input = `<select id="ff_${f.k}" class="live-input">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(val(f.k)) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      else if (f.type === 'textarea') input = `<textarea id="ff_${f.k}" rows="3" class="live-input">${esc(val(f.k))}</textarea>`;
      else input = `<input id="ff_${f.k}" type="${f.type}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'min="0"' : ''} value="${esc(val(f.k))}" class="live-input">`;
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
      rec[f.k] = raw === '' ? null : (f.num ? Number(raw) : raw);
    });
    ['pages_done', 'pages_total', 'sort_order'].forEach(k => { if (k in rec && rec[k] === null) rec[k] = 0; });
    const res = id
      ? await sb.from(tableKey).update(rec).eq('id', id)
      : await sb.from(tableKey).insert({ ...rec, student_id: L.me.id });
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
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return await enterLive(session.user);
    } catch (e) { fail(e); }
    if (demo) window.enterDemo();
    else { L.mode = 'auth'; showAuth(true); document.getElementById('authLoading').classList.add('hidden'); document.getElementById('authForm').classList.remove('hidden'); }
  });
})();
