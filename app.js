// ====== الإعدادات الأساسية لجوجل ======
const CLIENT_ID = '265333396119-7pdoruuiu9h3v59gremlndjpmnbn59ck.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

// ⚠️ ضع هنا الـ ID الخاص بملف novium_dash_data.json من جوجل درايف الخاص بك
const FILE_ID = 'https://drive.google.com/file/d/1aM4Wf2lK-sJVZNVcrp_7sgl0-gCPyA-B/view?usp=drive_link'; 

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
        // إعادة تعيين الواجهة لملف التيم الافتراضي
        userAvatar.src = 'assets/logo.jpg';
        userDisplayName.innerText = 'NoviumNodes Team';
        uploadOverlay.style.display = 'none';
        
        await loadDataHub(false); // تحميل سحابي للقراءة فقط للـ Guest
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
    // تفعيل ظهور طبقة الرفع عند الوقوف بالماوس
    const container = document.getElementById('avatar-container');
    container.onmouseenter = () => uploadOverlay.style.display = 'flex';
    container.onmouseleave = () => uploadOverlay.style.display = 'none';
    uploadOverlay.onclick = () => avatarUpload.click();

    // معالجة اختيار ملف صورة جديد وتحويله لـ Base64
    avatarUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Img = reader.result;
            userAvatar.src = base64Img; // عرضها فوري
            
            // حفظ الصورة في الجزء الخاص بالمستخدم داخل الـ JSON
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

// ====== جلب البيانات سحابياً (يدعم الأدمن والـ Guest المجهول) ======
async function loadDataHub(isAdmin) {
    try {
        let response;
        if (isAdmin) {
            // الأدمن يقرأ عبر مكتبة GAPI الموثقة بالتوكن
            response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
            fullData = response.result || { profiles: { yousef: {}, mohamed: {} }, projects: [] };
        } else {
            // الـ Guest يقرأ بطلب فتش عام بدون توكن نهائياً لضمان الأمان الفولاذي
            const fetchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=حط_هنا_API_KEY_لو_أردت_أو_اتركه_يعتمد_على_العام`);
            fullData = await fetchRes.json();
        }

        // التأكد من هيكلة الملف الإجمالية لحمايته من الأخطاء
        if (!fullData.projects) fullData.projects = [];
        if (!fullData.profiles) fullData.profiles = { yousef: {}, mohamed: {} };

        // تخصيص الاسم والصورة بناءً على هوية الشخص المسجل
        if (isAdmin) {
            const email = localStorage.getItem('logged_in_email');
            if (email === ADMIN_EMAILS.yousef) {
                userDisplayName.innerText = fullData.profiles.yousef.name || "Yousef Mohammed";
                userAvatar.src = fullData.profiles.yousef.avatar || "assets/logo.jpg";
            } else if (email === ADMIN_EMAILS.mohamed) {
                userDisplayName.innerText = fullData.profiles.mohamed.name || "Mohamed";
                userAvatar.src = fullData.profiles.mohamed.avatar || "assets/logo.jpg";
            }
        }

        // دمج المشاريع الثابتة مع الديناميكية المرفوعة سحابياً وعرضها للكل
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
openModalBtn.onclick = () => modal.style.display = 'flex';
closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; }

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
    modal.style.display = 'none';
    
    // رفع التعديل فوراً للسحابة
    await updateDataOnDrive();
};
