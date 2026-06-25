// ====== إعدادات الاتصال بـ Supabase ======
const SUPABASE_URL = 'https://hrqwlanfszvexskpcwrr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dabEo0c4_bPa1a6I9KiI6A_gOJp2sm-';

// إنشاء عميل Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// كلمة مرور الأدمن الموحدة للوحة التحكم (منه فيه)
const ADMIN_PASSWORD = 'NoviumNodesAdmin2026';

// المشاريع الافتراضية الثابتة
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

// جلب عناصر الـ DOM
const container = document.getElementById('projects-container');
const projectModal = document.getElementById('project-modal');
const loginModal = document.getElementById('login-modal');

const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const loginBtn = document.getElementById('login-btn');
const closeLoginBtn = document.getElementById('close-login-btn');

const projectForm = document.getElementById('add-project-form');
const loginForm = document.getElementById('admin-login-form');
const loadingScreen = document.getElementById('loading-screen');

// عند تحميل الصفحة
window.addEventListener('load', async () => {
    await checkAdminStatus();
    await loadProjectsFromSupabase();
});

// ====== فحص حالة تسجيل الدخول المحفوظة ======
async function checkAdminStatus() {
    const isAdmin = localStorage.getItem('is_novium_admin') === 'true';

    if (isAdmin) {
        if (loginBtn) loginBtn.style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('user-status').innerText = 'وضع التحكم 👑 (سحابي متصل)';
        showAdminUI(true);
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-status').innerText = 'وضع الزائر 👀 (عرض فقط)';
        showAdminUI(false);
    }
    hideLoading();
}

function hideLoading() {
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
}

// ====== إدارة نوافذ الـ Modals (إظهار وإخفاء) ======
if (loginBtn) loginBtn.onclick = () => { if (loginModal) loginModal.style.display = 'flex'; };
if (closeLoginBtn) closeLoginBtn.onclick = () => { if (loginModal) loginModal.style.display = 'none'; };

if (openModalBtn) openModalBtn.onclick = () => { if (projectModal) projectModal.style.display = 'flex'; };
if (closeModalBtn) closeModalBtn.onclick = () => { if (projectModal) projectModal.style.display = 'none'; };

window.onclick = (e) => {
    if (e.target === projectModal) projectModal.style.display = 'none';
    if (e.target === loginModal) loginModal.style.display = 'none';
};

// ====== معالجة نموذج تسجيل الدخول بالباسورد الموحد ======
if (loginForm) {
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const inputPass = document.getElementById('admin-pass').value;

        if (inputPass === ADMIN_PASSWORD) {
            localStorage.setItem('is_novium_admin', 'true');
            alert("أهلاً بك يا صانع الإبداع! تم تفعيل وضع التحكم 👑");
            if (loginModal) loginModal.style.display = 'none';
            location.reload();
        } else {
            alert("❌ كلمة المرور الموحدة خاطئة! حاول مرة أخرى.");
            document.getElementById('admin-pass').value = '';
        }
    };
}

function handleSignoutClick() {
    localStorage.removeItem('is_novium_admin');
    location.reload();
}

function showAdminUI(isAdmin) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
}

// ====== جلب المشاريع من السيرفر وعرضها ======
async function loadProjectsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('projects')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            renderProjects([...defaultProjects, ...data]);
        } else {
            renderProjects(defaultProjects);
        }
    } catch (err) {
        console.error('خطأ أثناء جلب البيانات من Supabase:', err);
        renderProjects(defaultProjects);
    }
}

// ====== تصميم وعرض كروت المشاريع ======
function renderProjects(allProjects) {
    if (!container) return;
    container.innerHTML = '';
    
    allProjects.forEach(proj => {
        let badgeClass = proj.lang === 'js' ? 'js' : (proj.lang === 'html' ? 'html' : 'node');
        let badgeText = proj.lang === 'js' ? 'JAVASCRIPT' : (proj.lang === 'html' ? 'HTML / CSS' : 'NODE.JS');

        let imageTag = proj.image_url 
            ? `<div class="project-card-image" style="width:100%; height:180px; overflow:hidden; border-radius:12px; margin-bottom:15px;">
                    <img src="${proj.image_url}" style="width:100%; height:100%; object-fit:cover;">
               </div>` 
            : '';

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            ${imageTag}
            <div class="card-content">
                <h3>${proj.title} <span class="badge ${badgeClass}">${badgeText}</span></h3>
                <p>${proj.description || proj.desc}</p>
                <div class="card-actions">
                    <a href="${proj.live_url || proj.live}" target="_blank" class="project-btn live-btn"><i class="fas fa-external-link-alt"></i> فتح المشروع</a>
                    <a href="${proj.github_url || proj.repo}" target="_blank" class="project-btn repo-btn"><i class="fab fa-github"></i> المستودع</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ====== إرسال وحفظ مشروع جديد على السيرفر ======
if (projectForm) {
    projectForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const submitBtnText = document.getElementById('submit-btn-text');
        if (submitBtnText) {
            submitBtnText.innerText = "جاري الرفع والنشر... ⏳";
            submitBtnText.disabled = true;
        }

        const title = document.getElementById('proj-title').value;
        const lang = document.getElementById('proj-lang').value;
        const desc = document.getElementById('proj-desc').value;
        const live_url = document.getElementById('proj-live').value;
        const github_url = document.getElementById('github-repo').value;
        const imageFile = document.getElementById('proj-image').files[0];

        let image_url = null;

        try {
            // الرفع للمخزن إذا تم اختيار صورة
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('project-images')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage
                    .from('project-images')
                    .getPublicUrl(filePath);

                image_url = urlData.publicUrl;
            }

            // الحفظ في قاعدة البيانات
            const { error: insertError } = await supabaseClient
                .from('projects')
                .insert([
                    { title, description: desc, live_url, github_url, image_url, lang }
                ]);

            if (insertError) throw insertError;

            alert("تم رفع ونشر المشروع بنجاح سحابياً! ✔️🚀");
            projectForm.reset();
            if (projectModal) projectModal.style.display = 'none';
            
            await loadProjectsFromSupabase();

        } catch (error) {
            console.error("حدث خطأ أثناء عملية الحفظ السحابي:", error);
            alert("فشل الرفع: " + error.message);
        } finally {
            if (submitBtnText) {
                submitBtnText.innerText = "حفظ ونشر المشروع ✨";
                submitBtnText.disabled = false;
            }
        }
    };
}
