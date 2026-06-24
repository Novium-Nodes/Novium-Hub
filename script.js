// ====== الإعدادات الأساسية لجوجل ======
const CLIENT_ID = 'حط_ال_CLIENT_ID_بتاعك_هنا.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

let tokenClient;
let gapiInited = false;
let gisiInited = false;
let fileId = null;
let customProjects = []; // مصفوفة المشاريع المخزنة سحابياً

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

// جلب عناصر الـ DOM الأساسية
const container = document.getElementById('projects-container');
const modal = document.getElementById('project-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const form = document.getElementById('add-project-form');

// ====== 1. تشغيل مكاتب جوجل وتهيئتها تلقائياً ======
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

// ====== 2. التحقق من حالة المستخدم الحالي (أنت أم زائر) ======
function checkExistingAuth() {
    const savedToken = localStorage.getItem('google_drive_token');
    if (savedToken) {
        gapi.client.setToken(JSON.parse(savedToken));
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('user-status').innerText = 'وضع التحكم 👑 (سحابي متصل)';
        showAdminUI(true);
        startDriveApp();
    } else {
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-status').innerText = 'وضع الزائر 👀 (عرض فقط)';
        showAdminUI(false);
        renderProjects(defaultProjects); // عرض الافتراضي فقط للزائر
    }
}

// ====== 3. منطق تسجيل الدخول والخروج ======
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        localStorage.setItem('google_drive_token', JSON.stringify(gapi.client.getToken()));
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
        location.reload();
    }
}

function showAdminUI(isAdmin) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
}

// ====== 4. التزامن مع ملف الـ JSON السحابي في جوجل درايف ======
async function startDriveApp() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "name='novium_dash_data.json' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive'
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            fileId = files[0].id;
            readDataFromDrive();
        } else {
            createNewDataFile();
        }
    } catch (err) { console.error('Error starting drive integration:', err); }
}

async function readDataFromDrive() {
    try {
        const response = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
        customProjects = response.result || [];
        // دمج المشاريع الأساسية الثابتة مع القادمة من الدرايف وعرضها
        renderProjects([...defaultProjects, ...customProjects]);
    } catch (err) { console.error('Error reading file from Drive', err); }
}

async function createNewDataFile() {
    const boundary = 'foo_bar_baz';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    const metadata = { 'name': 'novium_dash_data.json', 'mimeType': 'application/json' };

    const multipartRequestBody =
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify([]) + close_delim;

    try {
        const response = await gapi.client.request({
            'path': '/upload/drive/v3/files', 'method': 'POST',
            'params': {'uploadType': 'multipart'},
            'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            'body': multipartRequestBody
        });
        fileId = response.result.id;
        customProjects = [];
        renderProjects(defaultProjects);
    } catch (err) { console.error('Error creating base file on drive', err); }
}

async function updateDataOnDrive() {
    if (!fileId) return;
    try {
        await gapi.client.request({
            'path': '/upload/drive/v3/files/' + fileId, 'method': 'PATCH',
            'params': {'uploadType': 'media'}, 'body': JSON.stringify(customProjects)
        });
    } catch (err) { console.error('Error syncing dynamic data to Google Drive', err); }
}

// ====== 5. دالة الـ Render وبناء الكروت بالـ DOM ======
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

// ====== 6. التحكم بالـ Modal وإرسال الفورم ======
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

    customProjects.push(newProj);
    renderProjects([...defaultProjects, ...customProjects]);
    form.reset();
    modal.style.display = 'none';
    
    // رفع وحفظ الملف المحدث على درايف سحابياً فوراً
    await updateDataOnDrive();
};