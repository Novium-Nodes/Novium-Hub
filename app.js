// ====== الإعدادات الأساسية لجوجل ======
const CLIENT_ID = '265333396119-7pdoruuiu9h3v59gremlndjpmnbn59ck.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

// ⚠️ تم تعديله لوضع الـ ID الصافي لملفك لتفادي الأخطاء وفخ الـ CORS
const FILE_ID = '1aM4Wf2lK-sJVZNVcrp_7sgl0-gCPyA-B'; 

// 📧 إيميلات الأدمنز المسموح لهم بالتعديل ورفع الصور الشخصية
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
const avatarUpload = document.getElementById('avatar-upload');
const uploadOverlay = document.getElementById('upload-overlay');
const userDisplayName = document.getElementById('user-display-name');

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
        // مستخدم أدمن مسجل (أنت أو محمد)
        gapi.client.setToken(JSON.parse(savedToken));
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('user-status').innerText = 'وضع التحكم 👑 (سحابي متصل)';
        
        showAdminUI(true);
        setupAvatarUpload(savedEmail);
        await loadDataHub(true);
    } else {
        // زائر عادي أو حساب موحد (Guest Mode)
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-status').innerText = 'وضع الزائر 👀 (عرض فقط)';
        
        showAdminUI(false);
        if (userAvatar) userAvatar.src = 'assets/logo.jpg';
        if (userDisplayName) userDisplayName.innerText = 'NoviumNodes Team';
        if (uploadOverlay) uploadOverlay.style.display = 'none';
        
        await loadDataHub(false); // تحميل سحابي للقراءة فقط للـ Guest دون CORS
    }
}

// ====== تسجيل الدخول وفك التوكن لمعرفة الإيميل ======
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        localStorage.setItem('google_drive_token', JSON.stringify(gapi.client.getToken()));
        
        // جلب بيانات الإيميل لمعرفة من قام بتسجيل الدخول
        try {
            const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
            });
            const userData = await userInfo.json();
            localStorage.setItem('logged_in_email', userData.email);
        } catch(e) {
            console.error("خطأ في جلب بيانات الإيميل:", e);
        }
        
        checkExistingAuth();
    };
    tokenClient.requestAccessToken({prompt: 'consent'});
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revokeToken(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('logged_in_email');
        location.reload();
    }
}

function showAdminUI(isAdmin) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
}

// ====== التعامل مع الصور السحابية وتفعيل الـ Upload للأدمن ======
function setupAvatarUpload(email) {
    const container = document.getElementById('avatar-container');
    if (!container || !uploadOverlay || !avatarUpload) return;

    container.onmouseenter = () => uploadOverlay.style.display = 'flex';
    container.onmouseleave = () => uploadOverlay.style.display = 'none';
    uploadOverlay.onclick = () => avatarUpload.click();

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
            } else if (email === ADMIN_EMAILS.mohamed) {
                fullData.profiles.mohamed.avatar = base64Img;
                fullData.profiles.mohamed.name = "Mohamed";
            }
            
            await updateDataOnDrive();
        };
        reader.readAsDataURL(file);
    };
}

// ====== جلب البيانات سحابياً (تجاوز الـ CORS للأدمن والـ Guest المجهول) ======
async function loadDataHub(isAdmin) {
    try {
        let responseData;
        if (isAdmin) {
            // الأدمن يقرأ عبر مكتبة GAPI الموثقة بالتوكن بأمان
            const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
            responseData = response.result;
        } else {
            // الـ Guest يقرأ برابط مباشر مخصص للتحميل لتفادي حظر الـ CORS نهائياً
            const fetchRes = await fetch(`https://docs.google.com/uc?export=download&id=${fileId}`);
            if (!fetchRes.ok) throw new Error('فشل التحميل العام للملف');
            responseData = await fetchRes.json();
        }

        fullData = responseData || { profiles: { yousef: {}, mohamed: {} }, projects: [] };
        if (!fullData.projects) fullData.projects = [];
        if (!fullData.profiles) fullData.profiles = { yousef: {}, mohamed: {} };

        // تحديث معلومات الواجهة للأدمن الفعلي
        if (isAdmin) {
            const email = localStorage.getItem('logged_in_email');
            if (email === ADMIN_EMAILS.yousef) {
                if (userDisplayName) userDisplayName.innerText = fullData.profiles.yousef.name || "Yousef Mohammed";
                if (userAvatar) userAvatar.src = fullData.profiles.yousef.avatar || "assets/logo.jpg";
            } else if (email === ADMIN_EMAILS.mohamed) {
                if (userDisplayName) userDisplayName.innerText = fullData.profiles.mohamed.name || "Mohamed";
                if (userAvatar) userAvatar.src = fullData.profiles.mohamed.avatar || "assets/logo.jpg";
            }
        }

        renderProjects([...defaultProjects, ...fullData.projects]);

    } catch (err) {
        console.error('فشل في مزامنة البيانات السحابية، تحويل للافتراضي فقط:', err);
        renderProjects(defaultProjects);
    }
}

// ====== تحديث البيانات على الدرايف (مغلق ومحمي للأدمن فقط) ======
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

// ====== دالة الـ Render وبناء الكروت بالـ DOM ======
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

// ====== التحكم بالـ Modal وإرسال الفورم ======
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

        fullData.projects.push(newProj);
        renderProjects([...defaultProjects, ...fullData.projects]);
        form.reset();
        if (modal) modal.style.display = 'none';
        
        await updateDataOnDrive();
    };
}
