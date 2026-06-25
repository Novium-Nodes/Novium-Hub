/**
 * NoviumNodes Portfolio - Vanilla JavaScript Core Engine
 * Integrates directly with Supabase via CDN (No Build/React Required)
 */

// Supabase Configuration Constraints (Directly client-side)
const SUPABASE_URL = "https://hrqwlanfszvexskpcwrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycXdsYW5mc3p2ZXhza3Bjd3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzU0MjcsImV4cCI6MjA5Nzk1MTQyN30.BMKPhCpuY-9fHsoOVLWXeIGmWnc_u4sTrf8GKju3-Cs";

// Initialize the Supabase Client from the CDN Global
let supabaseClient = null;
try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error("Supabase CDN was not loaded correctly.");
  }
} catch (e) {
  console.error("Failed to initialize Supabase client:", e);
}

// Fallback Default Projects if Supabase table is not yet created
const defaultProjects = [
  {
    title: "NoviumPlayer",
    lang: "js",
    desc: "مشغل موسيقى متطور يدعم واجهة مستخدم زجاجية (Glassmorphic UI) مع ميزات التحكم الكامل وتخصيص تجربة الاستماع والـ Repeat Modes.",
    live: "https://novium-nodes.github.io/NoviumPlayer/",
    repo: "https://github.com/Novium-Nodes/NoviumPlayer",
    image_url: null
  },
  {
    title: "LedgerFlow",
    lang: "html",
    desc: "تطبيق ويب متكامل لإدارة الميزانية والحسابات المالية بشكل سلس وسريع.",
    live: "https://novium-nodes.github.io/LedgerFlow/",
    repo: "https://github.com/Novium-Nodes/LedgerFlow",
    image_url: null
  },
  {
    title: "SubTrack",
    lang: "js",
    desc: "نظام لإدارة وتتبع الاشتراكات الدورية والتنببه بمواعيد التجديد لتجنب المصاريف الزائدة.",
    live: "https://novium-nodes.github.io/SubTrack/",
    repo: "https://github.com/Novium-Nodes/SubTrack",
    image_url: null
  }
];

// Application Global State
let projectsList = [];
let userSession = null;
let userProfile = null;
let isAdminUser = false;
let currentSearchQuery = '';
let activeImageSource = 'upload';
let selectedProjectFile = null;

// DOM Selectors
const elements = {
  authStatusPulsePing: document.getElementById('status-pulse-ping'),
  authStatusPulseDot: document.getElementById('status-pulse-dot'),
  userStatusText: document.getElementById('status-text'),
  loginBtn: document.getElementById('login-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  avatarImage: document.getElementById('avatar-image'),
  editAvatarBtn: document.getElementById('edit-avatar-btn'),
  adminBadge: document.getElementById('admin-badge'),
  avatarOptionsMenu: document.getElementById('avatar-options-menu'),
  uploadAvatarFileBtn: document.getElementById('upload-avatar-file-btn'),
  inputAvatarUrlBtn: document.getElementById('input-avatar-url-btn'),
  hiddenAvatarFileInput: document.getElementById('hidden-avatar-file'),
  urlInputForm: document.getElementById('url-input-form'),
  avatarUrlInputField: document.getElementById('avatar-url-input-field'),
  cancelUrlAvatarBtn: document.getElementById('cancel-url-avatar-btn'),
  profileDisplayName: document.getElementById('profile-display-name'),
  profileUsername: document.getElementById('profile-username'),
  openAddProjectModalBtn: document.getElementById('open-add-project-modal-btn'),
  supabaseErrorBanner: document.getElementById('supabase-error-banner'),
  supabaseErrorText: document.getElementById('supabase-error-text'),
  projectsSearchInput: document.getElementById('projects-search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  projectsGrid: document.getElementById('projects-grid'),
  footerYear: document.getElementById('footer-year'),
  
  // Modal DOM Elements
  projectModal: document.getElementById('project-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modalErrorBanner: document.getElementById('modal-error-banner'),
  modalErrorText: document.getElementById('modal-error-text'),
  addProjectForm: document.getElementById('add-project-form'),
  projTitleInput: document.getElementById('proj-title'),
  projLangSelect: document.getElementById('proj-lang'),
  projDescInput: document.getElementById('proj-desc'),
  projLiveUrlInput: document.getElementById('proj-live-url'),
  projGithubUrlInput: document.getElementById('proj-github-url'),
  tabUpload: document.getElementById('tab-upload'),
  tabUrl: document.getElementById('tab-url'),
  imageUploadWrapper: document.getElementById('image-upload-wrapper'),
  imageUrlWrapper: document.getElementById('image-url-wrapper'),
  projImageFileInput: document.getElementById('proj-image-file'),
  fileUploadStatusText: document.getElementById('file-upload-status-text'),
  projManualImageUrlInput: document.getElementById('proj-manual-image-url'),
  submitProjectBtn: document.getElementById('submit-project-btn'),
  cancelProjectBtn: document.getElementById('cancel-project-btn')
};

// Application Startup
async function startApp() {
  // Setup copyright year
  if (elements.footerYear) {
    elements.footerYear.textContent = new Date().getFullYear();
  }

  // Bind Listeners
  bindEvents();

  // Load Session and Subscriptions
  if (supabaseClient) {
    await checkAuthSession();
    await fetchProjects();
  } else {
    // CDN failed, show fallback
    projectsList = defaultProjects;
    renderProjects();
    if (elements.supabaseErrorBanner) {
      elements.supabaseErrorBanner.classList.remove('hidden');
      if (elements.supabaseErrorText) {
        elements.supabaseErrorText.textContent = "تعذر تحميل مكتبة Supabase من الـ CDN. تم تشغيل الوضع المحلي التلقائي.";
      }
    }
  }
}

// ----------------------------------------------------
// Authentication Handlers
// ----------------------------------------------------
async function checkAuthSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    await handleSessionChange(session);
  } catch (err) {
    console.error('Error loading session:', err);
  }

  // Listen for auth events
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    await handleSessionChange(session);
  });
}

async function handleSessionChange(session) {
  userSession = session;
  userProfile = null;
  isAdminUser = false;

  if (session && session.user) {
    try {
      // Attempt to load profile where email matches
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        userProfile = profile;
        isAdminUser = true;
      } else {
        // If logged in but profile doesn't exist, we can treat them as admin if it matches noviumnodes@gmail.com
        if (session.user.email === 'noviumnodes@gmail.com') {
          isAdminUser = true;
          // Auto create profile
          const { data: newProf, error: createErr } = await supabaseClient
            .from('profiles')
            .insert({
              email: 'noviumnodes@gmail.com',
              username: 'noviumnodes',
              display_name: 'NoviumNodes Team',
              avatar_url: 'assets/logo.jpg'
            })
            .select()
            .single();

          if (!createErr && newProf) {
            userProfile = newProf;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err);
    }
  }

  updateAuthUI();
}

function updateAuthUI() {
  if (userSession) {
    if (elements.loginBtn) elements.loginBtn.classList.add('hidden');
    if (elements.logoutBtn) elements.logoutBtn.classList.remove('hidden');

    if (elements.authStatusPulsePing) {
      elements.authStatusPulsePing.className = `animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAdminUser ? 'bg-emerald-400' : 'bg-amber-400'}`;
    }
    if (elements.authStatusPulseDot) {
      elements.authStatusPulseDot.className = `relative inline-flex rounded-full h-2.5 w-2.5 ${isAdminUser ? 'bg-emerald-500' : 'bg-amber-500'}`;
    }

    if (elements.userStatusText) {
      if (isAdminUser) {
        elements.userStatusText.innerHTML = `
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="text-emerald-400">وضع التحكم 👑 (${userSession.user.email})</span>
        `;
      } else {
        elements.userStatusText.innerHTML = `
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="text-amber-400">زائر مسجل 🔑 (${userSession.user.email}) - لا تملك صلاحية تحرير</span>
        `;
      }
    }

    if (isAdminUser) {
      if (elements.openAddProjectModalBtn) elements.openAddProjectModalBtn.classList.remove('hidden');
      if (elements.adminBadge) elements.adminBadge.classList.remove('hidden');
      if (elements.editAvatarBtn) elements.editAvatarBtn.classList.remove('hidden');
    } else {
      if (elements.openAddProjectModalBtn) elements.openAddProjectModalBtn.classList.add('hidden');
      if (elements.adminBadge) elements.adminBadge.classList.add('hidden');
      if (elements.editAvatarBtn) elements.editAvatarBtn.classList.add('hidden');
    }
  } else {
    if (elements.loginBtn) elements.loginBtn.classList.remove('hidden');
    if (elements.logoutBtn) elements.logoutBtn.classList.add('hidden');

    if (elements.authStatusPulsePing) {
      elements.authStatusPulsePing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-cyan-400';
    }
    if (elements.authStatusPulseDot) {
      elements.authStatusPulseDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500';
    }

    if (elements.userStatusText) {
      elements.userStatusText.innerHTML = `
        <svg class="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span>وضع الزائر 👀 (عرض فقط)</span>
      `;
    }

    if (elements.openAddProjectModalBtn) elements.openAddProjectModalBtn.classList.add('hidden');
    if (elements.adminBadge) elements.adminBadge.classList.add('hidden');
    if (elements.editAvatarBtn) elements.editAvatarBtn.classList.add('hidden');
  }

  // Bind custom avatar and user text
  if (userProfile) {
    if (elements.profileDisplayName) elements.profileDisplayName.textContent = userProfile.display_name || "NoviumNodes Team";
    if (elements.profileUsername) elements.profileUsername.textContent = userProfile.username ? `@${userProfile.username}` : "Full-Stack Web Developers & Cyber Security Enthusiasts";
    if (elements.avatarImage && userProfile.avatar_url) {
      elements.avatarImage.src = userProfile.avatar_url;
    }
  } else {
    if (elements.profileDisplayName) elements.profileDisplayName.textContent = "NoviumNodes Team";
    if (elements.profileUsername) elements.profileUsername.textContent = "Full-Stack Web Developers & Cyber Security Enthusiasts";
    if (elements.avatarImage) elements.avatarImage.src = "assets/logo.jpg";
  }

  renderProjects();
}

// ----------------------------------------------------
// Database Projects Loading & Rendering
// ----------------------------------------------------
async function fetchProjects() {
  try {
    const { data, error } = await supabaseClient
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      projectsList = data;
    } else {
      projectsList = defaultProjects;
    }

    if (elements.supabaseErrorBanner) elements.supabaseErrorBanner.classList.add('hidden');
  } catch (err) {
    console.error("Error loading projects from Supabase:", err);
    if (elements.supabaseErrorBanner) {
      elements.supabaseErrorBanner.classList.remove('hidden');
      if (elements.supabaseErrorText) {
        const errMsg = err.message || err.details || String(err);
        if (errMsg.includes('relation "projects" does not exist') || (errMsg.includes('projects') && errMsg.includes('not found'))) {
          elements.supabaseErrorText.innerHTML = `تم عرض المشاريع الافتراضية محلياً. <strong>جدول المشاريع (projects) غير موجود</strong> في قاعدة بيانات Supabase الخاصة بك. يرجى تهيئة الجداول باستخدام كود الـ SQL أدناه.`;
        } else {
          elements.supabaseErrorText.textContent = `تم عرض المشاريع الافتراضية محلياً. تفاصيل الخطأ: ${errMsg}`;
        }
      }
    }
    // Fallback
    projectsList = defaultProjects;
  }

  renderProjects();
}

function renderProjects() {
  if (!elements.projectsGrid) return;

  const query = currentSearchQuery.trim().toLowerCase();

  const filtered = projectsList.filter(proj => {
    const title = (proj.title || '').toLowerCase();
    const desc = (proj.description || proj.desc || '').toLowerCase();

    if (!query) return true;
    return title.includes(query) || desc.includes(query);
  });

  if (filtered.length === 0) {
    elements.projectsGrid.innerHTML = `
      <div class="text-center py-16 bg-slate-900/20 border border-white/5 rounded-2xl">
        <p class="text-slate-400">
          ${query ? "لم يتم العثور على أي مشاريع تطابق بحثك. 🔍" : "لا توجد مشاريع متاحة حالياً."}
        </p>
      </div>
    `;
    return;
  }

  elements.projectsGrid.innerHTML = filtered.map((proj, idx) => {
    const title = proj.title;
    const desc = proj.description || proj.desc || '';
    const liveUrl = proj.live_url || proj.live || '';
    const githubUrl = proj.github_url || proj.repo || '';
    const imageUrl = proj.image_url;
    const lang = (proj.lang || 'js').toLowerCase();

    let badgeText = 'NODE.JS';
    let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    let langIconSvg = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 012-2h10a2 2 0 012 2m-14 0a2 2 0 002 2h10a2 2 0 002-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

    if (lang === 'js' || lang === 'javascript') {
      badgeText = 'JAVASCRIPT';
      badgeColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      langIconSvg = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>`;
    } else if (lang === 'html' || lang === 'css' || lang === 'html/css') {
      badgeText = 'HTML / CSS';
      badgeColor = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      langIconSvg = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`;
    }

    const isDbProject = !!proj.id;
    const deleteButtonHtml = (isAdminUser && isDbProject) ? `
      <button data-id="${proj.id}" class="delete-project-btn p-2 text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 hover:border-red-500 rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer" title="حذف المشروع">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    ` : '';

    return `
      <div class="bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 backdrop-blur-md shadow-lg hover:shadow-[0_10px_30px_rgba(6,182,212,0.06)] transition-all duration-500 transform hover:-translate-y-1 relative" id="project-card-${title.toLowerCase().replace(/\s+/g, '-')}">
        
        ${imageUrl ? `
          <div class="w-full h-44 overflow-hidden rounded-xl mb-5 border border-white/5">
            <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
          </div>
        ` : ''}

        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-start gap-4">
            <h3 class="text-xl font-bold text-slate-100 flex items-center gap-2">
              ${title}
            </h3>
            <span class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border rounded-lg ${badgeColor}">
              ${langIconSvg}
              <span>${badgeText}</span>
            </span>
          </div>

          <p class="text-slate-400 text-sm leading-relaxed text-right">
            ${desc}
          </p>

          <div class="flex gap-3 mt-2">
            <a href="${liveUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-slate-100 hover:text-slate-950 hover:bg-gradient-to-r hover:from-cyan-400 hover:to-sky-400 border border-cyan-500/30 rounded-xl transition-all duration-300 shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>فتح المشروع</span>
            </a>
            <a href="${githubUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              <span>المستودع</span>
            </a>
            ${deleteButtonHtml}
          </div>
        </div>

      </div>
    `;
  }).join('');

  // Add click events to newly rendered Delete buttons
  document.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      if (id) {
        await deleteProject(id);
      }
    });
  });
}

// ----------------------------------------------------
// Delete Project
// ----------------------------------------------------
async function deleteProject(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المشروع سحابياً؟")) return;

  try {
    const { error } = await supabaseClient
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert("تم حذف المشروع بنجاح من السحابة! ✔️");
    await fetchProjects();
  } catch (err) {
    console.error('Error deleting:', err);
    alert("فشل حذف المشروع: " + (err.message || String(err)));
  }
}

// ----------------------------------------------------
// Event Listeners Binding Core
// ----------------------------------------------------
function bindEvents() {
  // Copy SQL script Button
  const copySqlBtn = document.getElementById('copy-sql-btn');
  const sqlCodeElement = document.getElementById('supabase-sql-code');
  if (copySqlBtn && sqlCodeElement) {
    copySqlBtn.addEventListener('click', () => {
      const text = sqlCodeElement.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copySqlBtn.textContent = 'تم نسخ الكود بنجاح! ✔️';
        copySqlBtn.classList.remove('text-slate-300');
        copySqlBtn.classList.add('bg-emerald-600', 'text-white');
        
        setTimeout(() => {
          copySqlBtn.textContent = 'نسخ الكود 📋';
          copySqlBtn.classList.remove('bg-emerald-600', 'text-white');
          copySqlBtn.classList.add('text-slate-300');
        }, 3000);
      }).catch(err => {
        console.error('Copy failed: ', err);
      });
    });
  }

  // Login handler
  if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', async () => {
      try {
        const textSpan = document.getElementById('login-btn-text');
        if (textSpan) textSpan.textContent = 'جاري الاتصال...';
        elements.loginBtn.setAttribute('disabled', 'true');

        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.href
          }
        });
        if (error) throw error;
      } catch (err) {
        console.error('Login error:', err);
        alert(err.message || 'فشل تسجيل الدخول.');
        const textSpan = document.getElementById('login-btn-text');
        if (textSpan) textSpan.textContent = 'تسجيل دخول الإدارة (Google)';
        elements.loginBtn.removeAttribute('disabled');
      }
    });
  }

  // Logout handler
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', async () => {
      try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        alert("تم تسجيل الخروج بنجاح.");
      } catch (err) {
        console.error(err);
        alert("فشل تسجيل الخروج.");
      }
    });
  }

  // Live search
  if (elements.projectsSearchInput) {
    elements.projectsSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      if (currentSearchQuery.trim()) {
        if (elements.clearSearchBtn) elements.clearSearchBtn.classList.remove('hidden');
      } else {
        if (elements.clearSearchBtn) elements.clearSearchBtn.classList.add('hidden');
      }
      renderProjects();
    });
  }

  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener('click', () => {
      if (elements.projectsSearchInput) elements.projectsSearchInput.value = '';
      currentSearchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      renderProjects();
    });
  }

  // Dropdown menus
  if (elements.editAvatarBtn) {
    elements.editAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elements.avatarOptionsMenu) elements.avatarOptionsMenu.classList.toggle('hidden');
    });
  }

  document.addEventListener('click', () => {
    if (elements.avatarOptionsMenu) elements.avatarOptionsMenu.classList.add('hidden');
  });

  if (elements.avatarOptionsMenu) {
    elements.avatarOptionsMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  // Choose file for avatar
  if (elements.uploadAvatarFileBtn) {
    elements.uploadAvatarFileBtn.addEventListener('click', () => {
      if (elements.hiddenAvatarFileInput) elements.hiddenAvatarFileInput.click();
      if (elements.avatarOptionsMenu) elements.avatarOptionsMenu.classList.add('hidden');
    });
  }

  if (elements.hiddenAvatarFileInput) {
    elements.hiddenAvatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && userProfile) {
        try {
          alert("جاري رفع صورتك سحابياً... ⏳");
          const fileExt = file.name.split('.').pop();
          const fileName = `avatar-${userProfile.username}-${Date.now()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from('project-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabaseClient.storage
            .from('project-images')
            .getPublicUrl(filePath);

          const publicUrl = urlData.publicUrl;

          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('email', userProfile.email);

          if (updateError) throw updateError;

          alert("تم تحديث صورتك الشخصية بنجاح سحابياً! ✔️");
          userProfile.avatar_url = publicUrl;
          updateAuthUI();
        } catch (err) {
          console.error(err);
          alert("فشل رفع الصورة: يرجى تفعيل الـ Storage Bucket باسم 'project-images' في لوحة تحكم Supabase.");
        }
      }
    });
  }

  if (elements.inputAvatarUrlBtn) {
    elements.inputAvatarUrlBtn.addEventListener('click', () => {
      if (elements.urlInputForm) elements.urlInputForm.classList.remove('hidden');
      if (elements.avatarOptionsMenu) elements.avatarOptionsMenu.classList.add('hidden');
    });
  }

  if (elements.urlInputForm) {
    elements.urlInputForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputUrl = elements.avatarUrlInputField.value.trim();
      if (inputUrl && userProfile) {
        try {
          const { error } = await supabaseClient
            .from('profiles')
            .update({ avatar_url: inputUrl })
            .eq('email', userProfile.email);

          if (error) throw error;

          alert("تم حفظ صورتك الشخصية بنجاح سحابياً! ✔️");
          elements.urlInputForm.classList.add('hidden');
          elements.avatarUrlInputField.value = '';
          userProfile.avatar_url = inputUrl;
          updateAuthUI();
        } catch (err) {
          console.error(err);
          alert("خطأ أثناء تحديث الصورة.");
        }
      }
    });
  }

  if (elements.cancelUrlAvatarBtn) {
    elements.cancelUrlAvatarBtn.addEventListener('click', () => {
      if (elements.urlInputForm) {
        elements.urlInputForm.classList.add('hidden');
        elements.avatarUrlInputField.value = '';
      }
    });
  }

  // Modal actions
  if (elements.openAddProjectModalBtn) {
    elements.openAddProjectModalBtn.addEventListener('click', () => {
      if (elements.projectModal) {
        elements.projectModal.classList.remove('hidden');
        setTimeout(() => {
          elements.projectModal.classList.add('opacity-100');
          const container = document.getElementById('project-modal-container');
          if (container) container.classList.remove('scale-95');
        }, 50);
      }
    });
  }

  const hideModal = () => {
    if (elements.projectModal) {
      elements.projectModal.classList.remove('opacity-100');
      const container = document.getElementById('project-modal-container');
      if (container) container.classList.add('scale-95');
      setTimeout(() => {
        elements.projectModal.classList.add('hidden');
        if (elements.modalErrorBanner) elements.modalErrorBanner.classList.add('hidden');
        elements.addProjectForm.reset();
        selectedProjectFile = null;
        if (elements.fileUploadStatusText) elements.fileUploadStatusText.textContent = "انقر هنا أو اسحب الصورة لرفعها";
      }, 300);
    }
  };

  if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', hideModal);
  if (elements.cancelProjectBtn) elements.cancelProjectBtn.addEventListener('click', hideModal);

  if (elements.projectModal) {
    elements.projectModal.addEventListener('click', (e) => {
      if (e.target === elements.projectModal) hideModal();
    });
  }

  // Image Source tabs
  if (elements.tabUpload) {
    elements.tabUpload.addEventListener('click', () => {
      activeImageSource = 'upload';
      elements.tabUpload.className = "flex-1 py-2 text-xs font-bold rounded-lg text-cyan-400 bg-white/5 border border-white/10 transition-colors cursor-pointer";
      if (elements.tabUrl) elements.tabUrl.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer";
      if (elements.imageUploadWrapper) elements.imageUploadWrapper.classList.remove('hidden');
      if (elements.imageUrlWrapper) elements.imageUrlWrapper.classList.add('hidden');
    });
  }

  if (elements.tabUrl) {
    elements.tabUrl.addEventListener('click', () => {
      activeImageSource = 'url';
      elements.tabUrl.className = "flex-1 py-2 text-xs font-bold rounded-lg text-cyan-400 bg-white/5 border border-white/10 transition-colors cursor-pointer";
      if (elements.tabUpload) elements.tabUpload.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer";
      if (elements.imageUploadWrapper) elements.imageUploadWrapper.classList.add('hidden');
      if (elements.imageUrlWrapper) elements.imageUrlWrapper.classList.remove('hidden');
    });
  }

  // File Inputs for Cover Photo
  if (elements.projImageFileInput) {
    elements.projImageFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        selectedProjectFile = e.target.files[0];
        if (elements.fileUploadStatusText) {
          elements.fileUploadStatusText.textContent = `تم تحديد الملف: ${selectedProjectFile.name} ✔️`;
        }
      }
    });
  }

  // Drag and drop events
  if (elements.imageUploadWrapper) {
    elements.imageUploadWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.imageUploadWrapper.classList.add('border-cyan-400', 'bg-cyan-500/5');
    });

    elements.imageUploadWrapper.addEventListener('dragleave', () => {
      elements.imageUploadWrapper.classList.remove('border-cyan-400', 'bg-cyan-500/5');
    });

    elements.imageUploadWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.imageUploadWrapper.classList.remove('border-cyan-400', 'bg-cyan-500/5');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        selectedProjectFile = e.dataTransfer.files[0];
        if (elements.projImageFileInput) {
          elements.projImageFileInput.files = e.dataTransfer.files;
        }
        if (elements.fileUploadStatusText) {
          elements.fileUploadStatusText.textContent = `تم إسقاط وتحديد الملف: ${selectedProjectFile.name} ✔️`;
        }
      }
    });
  }

  // Form Submission
  if (elements.addProjectForm) {
    elements.addProjectForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = elements.projTitleInput.value.trim();
      const lang = elements.projLangSelect.value;
      const description = elements.projDescInput.value.trim();
      const liveUrl = elements.projLiveUrlInput.value.trim();
      const githubUrl = elements.projGithubUrlInput.value.trim();

      if (!title || !description || !liveUrl || !githubUrl) {
        showModalError("يرجى ملء جميع الحقول المطلوبة.");
        return;
      }

      setSubmitLoading(true);
      let finalImageUrl = null;

      try {
        if (activeImageSource === 'upload' && selectedProjectFile) {
          const fileExt = selectedProjectFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from('project-images')
            .upload(filePath, selectedProjectFile);

          if (uploadError) {
            throw new Error("فشل رفع غلاف الصورة: يرجى تفعيل Storage Bucket باسم 'project-images' أو استخدام خيار رابط الصورة.");
          }

          const { data: urlData } = supabaseClient.storage
            .from('project-images')
            .getPublicUrl(filePath);

          finalImageUrl = urlData.publicUrl;
        } else if (activeImageSource === 'url' && elements.projManualImageUrlInput.value.trim()) {
          finalImageUrl = elements.projManualImageUrlInput.value.trim();
        }

        const { error } = await supabaseClient
          .from('projects')
          .insert([
            {
              title,
              description,
              live_url: liveUrl,
              github_url: githubUrl,
              image_url: finalImageUrl,
              lang,
              email: userSession ? userSession.user.email : 'noviumnodes@gmail.com'
            }
          ]);

        if (error) throw error;

        alert("تم رفع ونشر المشروع بنجاح سحابياً! ✔️🚀");
        hideModal();
        await fetchProjects();
      } catch (err) {
        console.error(err);
        showModalError(err.message || 'حدث خطأ غير متوقع أثناء حفظ المشروع.');
      } finally {
        setSubmitLoading(false);
      }
    });
  }
}

function showModalError(msg) {
  if (elements.modalErrorBanner && elements.modalErrorText) {
    elements.modalErrorText.textContent = msg;
    elements.modalErrorBanner.classList.remove('hidden');
  }
}

function setSubmitLoading(loading) {
  if (elements.submitProjectBtn) {
    if (loading) {
      elements.submitProjectBtn.setAttribute('disabled', 'true');
      elements.submitProjectBtn.textContent = 'جاري النشر والحفظ سحابياً... ⏳';
    } else {
      elements.submitProjectBtn.removeAttribute('disabled');
      elements.submitProjectBtn.textContent = 'نشر وحفظ المشروع سحابياً 🚀';
    }
  }
}

// Start core app on page load
document.addEventListener('DOMContentLoaded', startApp);
