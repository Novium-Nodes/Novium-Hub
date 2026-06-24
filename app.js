// ====== الإعدادات الأساسية لجوجل ======
const CLIENT_ID = '265333396119-7pdoruuiu9h3v59gremlndjpmnbn59ck.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

// المعرّف الصافي للملف على جوجل درايف
const FILE_ID = '1aM4Wf2lK-sJVZNVcrp_7sgl0-gCPyA-B'; 

// إيميلات الأدمنز المصرح لهم
const ADMIN_EMAILS = {
    yousef: 'hak307gaming@gmail.com',
    mohamed: '#'
};

let tokenClient;
let gapiInited = false;
let gisiInited = false;
let fileId = FILE_ID; 
let fullData = { profiles: { yousef: {}, mohamed: {} }, projects: [] };

// المشاريع الافتراضية الثابتة
const defaultProjects = [
    {
        title: "NoviumPlayer",
        lang: "js",
        desc: "مشغل موسيقى متطور يدعم واجهة مستخدم زجاجية (Glassmorphic UI) مع ميزات التحكم الكامل وتخصيص تجربة الاستماع والـ Repeat Modes.",
        live: "https://novium-nodes.github.io/NoviumPlayer/",
        repo: "https://github.com/Novium-Nodes/NoviumPlayer"
    },
    {
        title: "LedgerFlow",
        lang: "html",
        desc: "تطبيق ويب متكامل لإدارة الميزانية والحسابات المالية بشكل سلس وسريع.",
        live: "https://novium-nodes.github.io/LedgerFlow/",
        repo: "https://github.com/Novium-Nodes/LedgerFlow"
    },
    {
        title: "SubTrack",
        lang: "js",
        desc: "نظام لإدارة وتتبع الاشتراكات الدورية والتنبيه بمواعيد التجديد لتجنب المصاريف الزائدة.",
        live: "https://novium-nodes.github.io/SubTrack/",
        repo: "https://github.com/Novium-Nodes/SubTrack"
    }
];

// جلب عناصر الـ DOM
const container = document.getElementById('projects-container');
const modal = document.getElementById('project-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const form = document.getElementById('add-project-form');
const userAvatar = document.getElementById('user-avatar');
const userDisplayName = document.getElementById('user-display-name');
const loadingScreen = document.getElementById('loading-screen');

function gapiLoaded() { gapi.load('client', initializeGapiClient); }
async function initializeGapiClient() {
    await gapi.client.init({ discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] });
    gapiInited = true;
    maybeEnableAuth();
}
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: '' });
    gisiInited = true;
    maybeEnableAuth();
}
window.addEventListener('load', () => { gapiLoaded(); gisLoaded(); });

function maybeEnableAuth() {
    if (gapiInited && gisiInited) { checkExistingAuth(); }
}

// ====== التحقق من الهوية والصلاحيات ======
async function checkExistingAuth() {
    const savedToken = localStorage.getItem('google_drive_token');
    const savedEmail = localStorage.getItem('logged_in_email');

    if (savedToken && (savedEmail === ADMIN_EMAILS.yousef || savedEmail === ADMIN_EMAILS.mohamed)) {
        gapi.client.setToken(JSON.parse(savedToken));
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('user-status').innerText = 'وضع التحكم 👑 (سحابي متصل)';
        
        showAdminUI(true);
        setupAvatarUpload(savedEmail);
        await loadDataHub(true);
    } else {
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-status').innerText = 'وضع الزائر 👀 (عرض فقط)';
        
        showAdminUI(false);
        if (userAvatar) userAvatar.src = 'logo.jpg';
        if (userDisplayName) userDisplayName.innerText = 'NoviumNodes Team';
        
        await loadDataHub(false);
    }
    
    // 🚪 إخفاء شاشة التحميل بمجرد اكتمال الفحص والاستقرار
    hideLoading();
}

function hideLoading() {
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
}

// ====== تسجيل الدخول ======
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error("خطأ أثناء تسجيل الدخول:", resp);
            return;
        }
        if (loadingScreen) loadingScreen.style.display = 'flex'; // إعادة تفعيل اللودينج أثناء المزامنة
        localStorage.setItem('google_drive_token', JSON.stringify(gapi.client.getToken()));
        
        try {
            const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
            });
            const userData = await userInfo.json();
            localStorage.setItem('logged_in_email', userData.email);
        } catch(e) {
            console.error("خطأ في جلب بيانات الإيميل:", e);
        }
        
        await checkExistingAuth();
    };
    tokenClient.requestAccessToken({prompt: 'consent'});
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revokeToken(token.access_token);
        gapi.client.setToken('');
    }
    localStorage.removeItem('google_drive_token');
    localStorage.removeItem('logged_in_email');
    location.reload();
}

function showAdminUI(isAdmin) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
}

function setupAvatarUpload(email) {
    const container = document.getElementById('avatar-container');
    if (!container) return;

    let avatarUpload = document.getElementById('avatar-upload');
    if (!avatarUpload) {
        avatarUpload = document.createElement('input');
        avatarUpload.type = 'file';
        avatarUpload.id = 'avatar-upload';
        avatarUpload.accept = 'image/*';
        avatarUpload.style.display = 'none';
        document.body.appendChild(avatarUpload);
    }

    let overlay = document.getElementById('upload-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'upload-overlay';
        overlay.innerHTML = '<i class="fas fa-camera"></i>';
        overlay.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:none; justify-content:center; align-items:center; color:#fff; cursor:pointer; border-radius:50%;";
        container.style.position = 'relative';
        container.appendChild(overlay);
    }

    container.onmouseenter = () => overlay.style.display = 'flex';
    container.onmouseleave = () => overlay.style.display = 'none';
    overlay.onclick = () => avatarUpload.click();

    avatarUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Img = reader.result;
            if (userAvatar) userAvatar.src = base64Img; 
            
            if (email === ADMIN_EMAILS.yousef) {
                fullData.profiles.yousef.avatar = base64Img;
                fullData.profiles.yousef.name = "Yousef Mohammed";
            }
            await updateDataOnDrive();
        };
        reader.readAsDataURL(file);
    };
}

// ====== جلب البيانات السحابية ======
async function loadDataHub(isAdmin) {
    try {
        let responseData = null;
        
        if (isAdmin) {
            const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
            responseData = response.result;
        } else {
            try {
                const fetchRes = await fetch(`https://docs.google.com/uc?export=download&id=${fileId}`);
                if (fetchRes.ok) responseData = await fetchRes.json();
            } catch (corsErr) {
                console.warn("حظر الـ Guest بسبب CORS، الانتقال التلقائي للبيانات الافتراضية.");
            }
        }

        if (responseData) {
            fullData = responseData;
            if (!fullData.projects) fullData.projects = [];
            if (!fullData.profiles) fullData.profiles = { yousef: {}, mohamed: {} };
            
            if (isAdmin) {
                const email = localStorage.getItem('logged_in_email');
                if (email === ADMIN_EMAILS.yousef && fullData.profiles.yousef) {
                    if (userDisplayName) userDisplayName.innerText = fullData.profiles.yousef.name || "Yousef Mohammed";
                    if (userAvatar && fullData.profiles.yousef.avatar) userAvatar.src = fullData.profiles.yousef.avatar;
                }
            }
            renderProjects([...defaultProjects, ...fullData.projects]);
        } else {
            renderProjects(defaultProjects);
        }

    } catch (err) {
        console.error('خطأ عام في المزامنة السحابية:', err);
        renderProjects(defaultProjects);
    }
}

// ====== تحديث البيانات على الدرايف ======
async function updateDataOnDrive() {
    if (!fileId) return;
    try {
        await gapi.client.request({
            'path': '/upload/drive/v3/files/' + fileId, 'method': 'PATCH',
            'params': {'uploadType': 'media'}, 'body': JSON.stringify(fullData)
        });
        console.log("تم الحفظ السحابي بنجاح! ✔️");
    } catch (err) { console.error('خطأ أثناء رفع البيانات المحدثة للدرايف:', err); }
}

// ====== دالة الـ Render ======
function renderProjects(allProjects) {
    if (!container) return;
    container.innerHTML = '';
    allProjects.forEach(proj => {
        let badgeClass = proj.lang === 'js' ? 'js' : (proj.lang === 'html' ? 'html' : 'node');
        let badgeText = proj.lang === 'js' ? 'JAVASCRIPT' : (proj.lang === 'html' ? 'HTML / CSS' : 'NODE.JS');

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="card-content">
                <h3>${proj.title} <span class="badge ${badgeClass}">${badgeText}</span></h3>
                <p>${proj.desc}</p>
                <div class="card-actions">
                    <a href="${proj.live}" target="_blank" class="project-btn live-btn"><i class="fas fa-external-link-alt"></i> فتح المشروع</a>
                    <a href="${proj.repo}" target="_blank" class="project-btn repo-btn"><i class="fab fa-github"></i> المستودع</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ====== التحكم بالـ Modal ======
if (openModalBtn) openModalBtn.onclick = () => { if (modal) modal.style.display = 'flex'; };
if (closeModalBtn) closeModalBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
window.onclick = (e) => { if (modal && e.target === modal) modal.style.display = 'none'; };

if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const newProj = {
            title: document.getElementById('proj-title').value,
            lang: document.getElementById('proj-lang').value,
            desc: document.getElementById('proj-desc').value,
            live: document.getElementById('proj-live').value,
            repo: document.getElementById('github-repo').value
        };

        if (!fullData.projects) fullData.projects = [];
        fullData.projects.push(newProj);
        renderProjects([...defaultProjects, ...fullData.projects]);
        form.reset();
        if (modal) modal.style.display = 'none';
        
        await updateDataOnDrive();
    };
}
