(function () {
    const scriptUrl = document.currentScript?.src || "";
    const SITE_BASE = scriptUrl.replace(/[^/]+$/, "");

    const loadingMarkup = `
        <div class="shared-loading" aria-live="polite" aria-label="Cargando la página">
            <div class="shared-loading-bg"></div>
            <div class="shared-loading-panel">
                <h2>♡ Loading... ♡</h2>
                <div>Welcome to my little world...</div>
                <div class="shared-loading-bar"><span></span></div>
                <small>opening memories ★</small>
            </div>
        </div>`;

    const loadingStyle = `
        .shared-loading{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;background:#86b9df;animation:sharedLoadingIn .25s ease-out}
        .shared-loading-bg{position:absolute;inset:0;background-color:#86b9df;background-image:url("${SITE_BASE}loading.jpg");background-size:cover;background-position:center;background-repeat:no-repeat}
        .shared-loading-bg:after{content:"";position:absolute;inset:0;opacity:.2;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:5px 5px}
        .shared-loading-panel{position:relative;width:min(390px,86%);padding:22px;text-align:center;color:#765966;background:rgba(255,249,223,.94);border:3px solid #fff;outline:1px solid #db78a7;box-shadow:6px 6px 0 #f3d477;font:14px Arial,sans-serif}
        .shared-loading-panel h2{margin:0 0 8px;color:#df6f9e;font-size:22px}
        .shared-loading-bar{height:18px;margin-top:14px;padding:3px;background:#fff;border:1px solid #d5799d}
        .shared-loading-bar span{display:block;width:0;height:100%;background:repeating-linear-gradient(90deg,#ee82b4 0 12px,#f5d87e 12px 24px);animation:sharedLoadingProgress 1.05s linear forwards}
        @keyframes sharedLoadingProgress{to{width:100%}}
        @keyframes sharedLoadingIn{from{opacity:0}to{opacity:1}}
        @keyframes sharedLoadingOut{to{opacity:0}}
    `;

    function ensureStyle() {
        if (document.getElementById("sharedLoadingStyle")) return;
        const style = document.createElement("style");
        style.id = "sharedLoadingStyle";
        style.textContent = loadingStyle;
        document.head.appendChild(style);
    }

    function overlay() {
        if (document.querySelector(".shared-loading")) return document.querySelector(".shared-loading");
        ensureStyle();
        document.body.insertAdjacentHTML("beforeend", loadingMarkup);
        return document.querySelector(".shared-loading");
    }

    function hideOverlay() {
        const screen = document.querySelector(".shared-loading");
        if (!screen) return;
        screen.style.animation = "sharedLoadingOut .2s ease-in forwards";
        window.setTimeout(() => screen.remove(), 200);
    }

    function showLoading(destination) {
        sessionStorage.setItem("rizos_loading", "1");
        overlay();
        window.setTimeout(() => { window.location.href = destination; }, 1050);
    }

    document.addEventListener("DOMContentLoaded", () => {
        const skipped = sessionStorage.getItem("rizos_loading") === "1";
        sessionStorage.removeItem("rizos_loading");
        if (!skipped) {
            overlay();
            window.setTimeout(hideOverlay, 1050);
        }
        document.querySelectorAll("a[href]").forEach(link => {
            link.addEventListener("click", event => {
                const href = link.getAttribute("href");
                if (!href || href.startsWith("#") || href.startsWith("mailto:") || link.target === "_blank") return;
                const destination = new URL(href, window.location.href);
                if (destination.origin !== window.location.origin) return;
                event.preventDefault();
                showLoading(destination.href);
            });
        });
    });
})();
