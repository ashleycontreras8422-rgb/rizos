(function () {
    const SUPABASE_URL = "https://tgvecrecqueikcbemnee.supabase.co";
    const SUPABASE_KEY = "sb_publishable_rM4IuPpzAis_ad_GXthyhw_nPfi7-M5";
    const OWNER_EMAIL = "ashleycontreras8422@gmail.com";
    const scriptUrl = document.currentScript?.src || "";
    const SITE_BASE = scriptUrl.replace(/[^/]+$/, "");
    const pageName = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const isGatePage = pageName === "login.html";
    const client = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
    let session = null;
    let siteDb = null;

    function isOwner() {
        return session?.user?.email?.toLowerCase() === OWNER_EMAIL;
    }

    function requireAuth(message = "Inicia sesión con tu Gmail y contraseña para continuar.") {
        if (session) return true;
        alert(message);
        document.getElementById("siteAccessEmail")?.focus();
        return false;
    }

    function requireOwner() {
        if (isOwner()) return true;
        alert(session ? "Solo la cuenta administradora puede editar esta página." : "Inicia sesión con tu Gmail y contraseña. Solo la cuenta administradora puede editar esta página.");
        document.getElementById("siteAccessEmail")?.focus();
        return false;
    }

    function openSiteDb() {
        if (siteDb) return Promise.resolve(siteDb);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("rizos-site", 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains("files")) request.result.createObjectStore("files");
            };
            request.onsuccess = () => {
                siteDb = request.result;
                resolve(siteDb);
            };
            request.onerror = () => reject(request.error);
        });
    }

    function idbPut(key, value) {
        return openSiteDb().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        }));
    }

    function idbGet(key) {
        return openSiteDb().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readonly");
            const request = tx.objectStore("files").get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        }));
    }

    function idbDelete(key) {
        return openSiteDb().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        }));
    }

    function applyCursor() {
        if (document.getElementById("siteCursorStyle")) return;
        const style = document.createElement("style");
        style.id = "siteCursorStyle";
        style.textContent = `html, body, body * { cursor: url("${SITE_BASE}images/Right Rainbow Gem Arrow Transp.cur"), auto !important; }`;
        document.head.appendChild(style);
    }

    function applyTheme() {
        const theme = JSON.parse(localStorage.getItem("rizosTheme") || "{}");
        const root = document.documentElement;
        if (theme.rosa) root.style.setProperty("--rosa", theme.rosa);
        if (theme.amarillo) root.style.setProperty("--amarillo", theme.amarillo);
        if (theme.texto) root.style.setProperty("--texto", theme.texto);
        let layer = document.getElementById("siteThemeLayer");
        if (!layer) {
            layer = document.createElement("div");
            layer.id = "siteThemeLayer";
            document.body.prepend(layer);
        }
        layer.innerHTML = "";
        if (theme.bgType === "color" && theme.bgColor) {
            document.body.style.background = theme.bgColor;
        } else if (theme.bgType === "image" && theme.bgFileId) {
            idbGet(theme.bgFileId).then(file => {
                if (!file) return;
                const url = URL.createObjectURL(file);
                document.body.style.background = `url("${url}") center / cover no-repeat fixed`;
            });
        } else if (theme.bgType === "video" && theme.bgFileId) {
            idbGet(theme.bgFileId).then(file => {
                if (!file) return;
                const video = document.createElement("video");
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.src = URL.createObjectURL(file);
                layer.appendChild(video);
                video.play().catch(() => {});
            });
        }
    }

    function render(user) {
        session = user ? { user } : null;
        const status = document.getElementById("siteAccessStatus");
        const login = document.getElementById("siteAccessLogin");
        const logout = document.getElementById("siteAccessLogout");
        const signup = document.getElementById("siteAccessSignup");
        if (status && login && logout) {
            status.textContent = user ? `Sesión iniciada: ${user.email}${isOwner() ? " · administradora" : ""}` : "Necesitas una cuenta para comentar o escribir.";
            login.hidden = Boolean(user);
            if (signup) signup.hidden = Boolean(user);
            logout.hidden = !user;
        }
        document.body.classList.toggle("site-owner", isOwner());
        setupOwnerContent();
        setupIndexSettings();
        setupGalleryLocks();
        setupMusicPlayer();
        document.dispatchEvent(new CustomEvent("site-access-change", { detail: { owner: isOwner(), user: session?.user || null } }));
    }

    function setupOwnerContent() {
        const pageKey = pageName.replace(/[^a-z0-9]/gi, "_");
        const cleanPhotoFrame = (photo, image, controls) => {
            Array.from(photo.childNodes).forEach(node => {
                if (node !== image && node !== controls) node.remove();
            });
            if (!image.parentNode) photo.insertBefore(image, controls || null);
        };
        document.querySelectorAll(".espacio-escritura, .about-editable").forEach((element, index) => {
            element.contentEditable = isOwner() ? "true" : "false";
            const key = `owner_text_${pageKey}_${index}`;
            const saved = localStorage.getItem(key);
            if (saved !== null && element.innerHTML !== saved) element.innerHTML = saved;
            element.oninput = () => {
                if (isOwner()) localStorage.setItem(key, element.innerHTML);
            };
        });
        document.querySelectorAll(".foto, .foto-principal, .album-cover, .avatar, [data-owner-photo]").forEach((photo, index) => {
            const photoType = photo.dataset.ownerPhoto || (photo.classList.contains("album-cover") ? "album" : "photo");
            const key = `owner_photo_${pageKey}_${photoType}_${index}`;
            const legacyKey = `owner_photo_${pageKey}_${index}`;
            const saved = localStorage.getItem(key) || localStorage.getItem(legacyKey);
            if (saved && !photo.querySelector("img")) photo.innerHTML = `<img src="${saved}" alt="Foto ${index + 1}">`;
            const hasImage = Boolean(saved) || Array.from(photo.querySelectorAll("img")).some(image => image.complete && image.naturalWidth > 0);
            const currentImage = photo.querySelector("img");
            if (hasImage && currentImage) cleanPhotoFrame(photo, currentImage, photo.querySelector(".owner-photo-controls"));
            if (!isOwner()) {
                photo.querySelector(".owner-photo-controls")?.remove();
                return;
            }
            const existingControls = photo.querySelector(".owner-photo-controls");
            if (existingControls) {
                existingControls.classList.toggle("is-hidden", hasImage);
                return;
            }
            const controls = document.createElement("span");
            controls.className = "owner-photo-controls";
            controls.contentEditable = "false";
            if (hasImage) controls.classList.add("is-hidden");
            controls.innerHTML = `<label class="owner-photo-pick" title="Añadir o cambiar imagen">📷<input type="file" accept="image/*"></label><button type="button" title="Quitar imagen">🗑️</button>`;
            photo.appendChild(controls);
            photo.addEventListener("dblclick", event => {
                if (!isOwner() || !photo.querySelector("img") || event.target.closest(".owner-photo-controls")) return;
                controls.classList.remove("is-hidden");
            });
            controls.querySelector("input").addEventListener("change", event => {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    localStorage.setItem(key, reader.result);
                    photo.querySelectorAll("img").forEach(image => image.remove());
                    const image = document.createElement("img");
                    image.src = reader.result;
                    image.alt = `Foto ${index + 1}`;
                    cleanPhotoFrame(photo, image, controls);
                    controls.classList.add("is-hidden");
                };
                reader.readAsDataURL(file);
            });
            controls.querySelector("button").addEventListener("click", () => {
                localStorage.removeItem(key);
                photo.querySelectorAll("img").forEach(image => image.remove());
                controls.classList.remove("is-hidden");
            });
        });
    }

    function addSharedStyles() {
        if (document.getElementById("siteSharedStyle")) return;
        const style = document.createElement("style");
        style.id = "siteSharedStyle";
        style.textContent = `
            #siteAccessPanel{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px;background:#fff4bd;border-bottom:1px solid #dcc16a;font:12px Arial,sans-serif;color:#765966;position:relative;z-index:40}
            #siteAccessPanel input{max-width:190px;padding:5px;border:1px solid #e5abc3}
            #siteAccessPanel button{padding:5px 9px;border:1px solid #df6f9e;background:#fff;color:#765966;cursor:pointer}
            #siteAccessStatus{margin-right:auto}
            .owner-photo-controls{position:absolute;z-index:2;bottom:5px;left:50%;width:auto;display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;transform:translateX(-50%);padding:0;background:transparent}
            .owner-photo-controls.is-hidden{display:none}
            .owner-photo-pick{display:inline-flex;align-items:center;justify-content:center;padding:3px 6px;border:1px solid #df6f9e;background:rgba(255,255,255,.9);cursor:pointer}
            .owner-photo-pick input{display:none}
            .owner-photo-controls button{margin:0;padding:3px 6px;font-size:14px;background:rgba(255,255,255,.9)}
            .foto img,.foto-principal img,.album-cover img,.avatar img{display:block;width:100%;max-width:100%;height:100%;min-height:0;flex:1 1 auto;object-fit:cover}
            .foto-principal,.foto,.album-cover,.avatar{position:relative;display:flex;flex-direction:column;overflow:hidden;min-width:0}
            body:not(.site-owner) .owner-only,
            body:not(.site-owner) .admin-panel,
            body:not(.site-owner) .hobby-admin,
            body:not(.site-owner) .editor-panel,
            body:not(.site-owner) .link-controls,
            body:not(.site-owner) .add-link,
            body:not(.site-owner) .delete-column { display:none !important; }
            #siteThemeLayer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
            #siteThemeLayer video{width:100%;height:100%;object-fit:cover}
            /* Mantiene el contenido por encima del fondo, pero sin romper overlays fixed (loading/modales). */
            body > *:not(#siteThemeLayer):not(.shared-loading):not(.modal-overlay){position:relative;z-index:1}
            #siteMusicPlayer{position:fixed;z-index:80;width:230px;padding:8px;background:#fff7d8;border:2px solid #df6f9e;box-shadow:4px 4px 0 #f3d477;font:11px Arial,sans-serif;color:#765966}
            #siteMusicPlayer header{display:flex;justify-content:space-between;align-items:center;cursor:move;font-weight:bold;margin-bottom:6px;touch-action:none;user-select:none}
            #siteMusicPlayer button,#siteMusicPlayer label{margin:2px 2px 0 0;padding:3px 6px;border:1px solid #e5abc3;background:#fff;color:#765966;font:inherit;cursor:pointer}
            #siteMusicPlayer audio{width:100%;margin-top:4px}
            #siteMusicPlayer select{width:100%;margin-top:4px}
            #siteIndexSettings{margin:12px;padding:12px;border:1px solid #e5abc3;background:#fff0f6;font:12px Arial,sans-serif;color:#714258}
            #siteIndexSettings input,#siteIndexSettings select{margin:4px 6px 4px 0}
            #siteGalleryLocks{margin:12px 0;padding:10px;border:1px dashed #df6f9e;background:#fffbea}
        `;
        document.head.appendChild(style);
    }

    function addAccessPanel() {
        if (isGatePage || document.getElementById("siteAccessPanel") || !client) return;
        const panel = document.createElement("section");
        panel.id = "siteAccessPanel";
        panel.innerHTML = `<strong>Acceso</strong><span id="siteAccessStatus">Comprueba tu sesión...</span><input id="siteAccessEmail" type="email" placeholder="Gmail" autocomplete="email"><input id="siteAccessPassword" type="password" placeholder="Contraseña" autocomplete="current-password"><button id="siteAccessLogin" type="button">Entrar</button><button id="siteAccessSignup" type="button">Crear cuenta</button><button id="siteAccessLogout" type="button" hidden>Cerrar sesión</button>`;
        document.body.insertBefore(panel, document.body.firstChild);
        document.getElementById("siteAccessLogin").addEventListener("click", async () => {
            const email = document.getElementById("siteAccessEmail").value.trim();
            const password = document.getElementById("siteAccessPassword").value;
            const status = document.getElementById("siteAccessStatus");
            if (!email || !password) {
                status.textContent = "Escribe tu Gmail y contraseña.";
                return;
            }
            const { error } = await client.auth.signInWithPassword({ email, password });
            status.textContent = error ? "Correo o contraseña incorrectos." : "Sesión iniciada.";
        });
        document.getElementById("siteAccessLogout").addEventListener("click", () => client.auth.signOut());
        document.getElementById("siteAccessSignup").addEventListener("click", async () => {
            const email = document.getElementById("siteAccessEmail").value.trim();
            const password = document.getElementById("siteAccessPassword").value;
            const status = document.getElementById("siteAccessStatus");
            if (!email || password.length < 6) {
                status.textContent = "Usa un Gmail y una contraseña de al menos 6 caracteres.";
                return;
            }
            const { error } = await client.auth.signUp({ email, password });
            status.textContent = error ? error.message : "Cuenta creada. Revisa tu correo para confirmarla.";
        });
    }

    function playlist() {
        return JSON.parse(localStorage.getItem("rizosPlaylist") || "[]");
    }

    function savePlaylist(items) {
        localStorage.setItem("rizosPlaylist", JSON.stringify(items));
    }

    async function playTrack(player, index) {
        const items = playlist();
        if (!items.length) return;
        const next = (index + items.length) % items.length;
        player.dataset.index = String(next);
        const file = await idbGet(items[next].id);
        if (!file) return;
        const audio = player.querySelector("audio");
        audio.src = URL.createObjectURL(file);
        audio.play().catch(() => {});
        player.querySelector("select").value = String(next);
    }

    function setupMusicPlayer() {
        if (isGatePage || document.getElementById("siteMusicPlayer")) {
            const existing = document.getElementById("siteMusicPlayer");
            if (existing) existing.querySelector(".owner-only")?.toggleAttribute("hidden", !isOwner());
            return;
        }
        const saved = JSON.parse(localStorage.getItem("rizosPlayerPos") || '{"x":16,"y":80}');
        const hidden = localStorage.getItem("rizosPlayerHidden") === "1";
        const player = document.createElement("aside");
        player.id = "siteMusicPlayer";
        player.hidden = hidden;
        player.style.left = saved.x + "px";
        player.style.top = saved.y + "px";
        player.innerHTML = `
            <header><span>♫ Playlist</span><span><button type="button" data-player-hide title="Ocultar">✕</button></span></header>
            <select></select>
            <audio controls></audio>
            <div>
                <button type="button" data-player-prev>◀</button>
                <button type="button" data-player-next>▶</button>
                <label class="owner-only">＋<input type="file" accept="audio/*" multiple hidden></label>
            </div>`;
        document.body.appendChild(player);
        const select = player.querySelector("select");
        const refreshSelect = () => {
            const items = playlist();
            select.innerHTML = items.length ? items.map((item, index) => `<option value="${index}">${item.name}</option>`).join("") : "<option>No hay canciones</option>";
        };
        refreshSelect();
        player.querySelector("[data-player-hide]").addEventListener("click", () => {
            player.hidden = true;
            localStorage.setItem("rizosPlayerHidden", "1");
        });
        player.querySelector("[data-player-prev]").addEventListener("click", () => playTrack(player, Number(player.dataset.index || 0) - 1));
        player.querySelector("[data-player-next]").addEventListener("click", () => playTrack(player, Number(player.dataset.index || 0) + 1));
        player.querySelector("audio").addEventListener("ended", () => playTrack(player, Number(player.dataset.index || 0) + 1));
        select.addEventListener("change", () => playTrack(player, Number(select.value)));
        player.querySelector("input[type=file]").addEventListener("change", async event => {
            if (!isOwner()) return;
            const items = playlist();
            for (const file of event.target.files) {
                const id = "music_" + Date.now() + "_" + Math.random().toString(16).slice(2);
                await idbPut(id, file);
                items.push({ id, name: file.name });
            }
            savePlaylist(items);
            refreshSelect();
            event.target.value = "";
        });
        // Drag & drop del reproductor (mejorado):
        // - Soporta móvil/touch (Pointer Events)
        // - Evita scroll al arrastrar
        // - Importante: NO mueve el reproductor con un simple click (tiene umbral anti-“jitter”)
        let drag = null;
        const header = player.querySelector("header");
        const DRAG_THRESHOLD_PX = 6;

        header.addEventListener("pointerdown", event => {
            // Si haces click en el botón de cerrar/ocultar (o en controles), no iniciamos drag.
            if (event.target.closest("button, input, select, label, a")) return;
            drag = {
                pointerId: event.pointerId,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startLeft: player.offsetLeft,
                startTop: player.offsetTop,
                active: false
            };
            header.setPointerCapture(event.pointerId);
            // Ojo: NO preventDefault aquí, así un click “normal” no cambia nada.
        });

        header.addEventListener("pointermove", event => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dx = event.clientX - drag.startClientX;
            const dy = event.clientY - drag.startClientY;

            // Si aún no es drag real, esperamos a que se mueva lo suficiente.
            if (!drag.active) {
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
                drag.active = true;
            }

            player.style.left = Math.max(0, drag.startLeft + dx) + "px";
            player.style.top = Math.max(0, drag.startTop + dy) + "px";
            event.preventDefault();
        });

        header.addEventListener("pointerup", event => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            // Solo guardamos posición si realmente se arrastró.
            if (drag.active) {
                localStorage.setItem("rizosPlayerPos", JSON.stringify({ x: player.offsetLeft, y: player.offsetTop }));
                event.preventDefault();
            }
            drag = null;
            try { header.releasePointerCapture(event.pointerId); } catch (_) {}
        });

        header.addEventListener("pointercancel", event => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            drag = null;
            try { header.releasePointerCapture(event.pointerId); } catch (_) {}
        });
        if (!document.getElementById("siteMusicRestore")) {
            const restore = document.createElement("button");
            restore.id = "siteMusicRestore";
            restore.type = "button";
            restore.textContent = "♫";
            restore.title = "Mostrar reproductor";
            restore.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:79;padding:6px 8px;border:1px solid #df6f9e;background:#fff4bd";
            restore.addEventListener("click", () => {
                player.hidden = false;
                localStorage.setItem("rizosPlayerHidden", "0");
            });
            document.body.appendChild(restore);
        }
        player.querySelector(".owner-only")?.toggleAttribute("hidden", !isOwner());
        if (playlist().length) playTrack(player, 0);
    }

    function setupIndexSettings() {
        if (pageName !== "index.html" || !isOwner() || document.getElementById("siteIndexSettings")) return;
        const box = document.createElement("section");
        box.id = "siteIndexSettings";
        box.className = "owner-only";
        const theme = JSON.parse(localStorage.getItem("rizosTheme") || "{}");
        box.innerHTML = `
            <h3>Configuración de diseño</h3>
            <p>Solo tú puedes cambiar colores y el fondo de la página.</p>
            <label>Rosa <input type="color" data-theme="rosa" value="${theme.rosa || "#f49ac2"}"></label>
            <label>Amarillo <input type="color" data-theme="amarillo" value="${theme.amarillo || "#f7df91"}"></label>
            <label>Texto <input type="color" data-theme="texto" value="${theme.texto || "#8b526c"}"></label>
            <label>Fondo
                <select data-theme="bgType">
                    <option value="dots">Puntitos</option>
                    <option value="color">Color</option>
                    <option value="image">Imagen</option>
                    <option value="video">Vídeo</option>
                </select>
            </label>
            <input type="color" data-theme="bgColor" value="${theme.bgColor || "#fff8df"}">
            <input type="file" data-theme="bgFile" accept="image/*,video/*">
            <button type="button" data-theme-save>Guardar diseño</button>`;
        box.querySelector("[data-theme=bgType]").value = theme.bgType || "dots";
        const pagina = document.querySelector(".pagina, main, body");
        (document.querySelector("header") || pagina).after(box);
        box.querySelector("[data-theme-save]").addEventListener("click", async () => {
            const next = JSON.parse(localStorage.getItem("rizosTheme") || "{}");
            box.querySelectorAll("[data-theme]").forEach(input => {
                if (input.type === "file") return;
                next[input.dataset.theme] = input.value;
            });
            const file = box.querySelector("[data-theme=bgFile]").files[0];
            if (file) {
                next.bgFileId = "theme_bg";
                await idbPut("theme_bg", file);
                next.bgType = file.type.startsWith("video") ? "video" : "image";
            }
            localStorage.setItem("rizosTheme", JSON.stringify(next));
            applyTheme();
        });
    }

    const galleryMap = {
        "photos.html": "bibi",
        "secondphto.html": "family",
        "tercerpht.html": "favs",
        "cuartophto.html": "lov3"
    };

    function folderLocks() {
        return JSON.parse(localStorage.getItem("galleryFolderLocks") || "{}");
    }

    function setupGalleryLocks() {
        if (pageName === "galery.html") {
            document.querySelectorAll("a.carpeta-item").forEach(link => {
                const href = link.getAttribute("href") || "";
                const folder = galleryMap[href];
                if (!folder) return;
                link.addEventListener("click", event => {
                    const password = folderLocks()[folder];
                    if (!password) return;
                    if (sessionStorage.getItem("gallery_unlock_" + folder) === "1") return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    const typed = prompt("Esta carpeta está protegida. Escribe la contraseña:");
                    if (typed === password) {
                        sessionStorage.setItem("gallery_unlock_" + folder, "1");
                        location.href = link.href;
                    } else if (typed !== null) {
                        alert("Contraseña incorrecta.");
                    }
                }, true);
            });
            if (isOwner() && !document.getElementById("siteGalleryLocks")) {
                const box = document.createElement("div");
                box.id = "siteGalleryLocks";
                box.className = "owner-only";
                const locks = folderLocks();
                box.innerHTML = `<strong>Contraseñas de carpetas</strong>${["bibi","family","favs","lov3"].map(name => `<p>${name}: <input data-folder="${name}" type="password" value="${locks[name] || ""}" placeholder="Sin contraseña"> </p>`).join("")}<button type="button">Guardar contraseñas</button>`;
                document.querySelector(".carpeta-grid")?.after(box);
                box.querySelector("button").addEventListener("click", () => {
                    const next = {};
                    box.querySelectorAll("input").forEach(input => {
                        if (input.value.trim()) next[input.dataset.folder] = input.value.trim();
                    });
                    localStorage.setItem("galleryFolderLocks", JSON.stringify(next));
                    alert("Contraseñas de carpetas guardadas.");
                });
            }
        }
        const folder = galleryMap[pageName];
        const password = folder && folderLocks()[folder];
        if (folder && password && sessionStorage.getItem("gallery_unlock_" + folder) !== "1" && !isOwner()) {
            const typed = prompt("Esta carpeta está protegida. Escribe la contraseña:");
            if (typed === password) sessionStorage.setItem("gallery_unlock_" + folder, "1");
            else {
                alert("Necesitas la contraseña para entrar.");
                location.href = "galery.html";
            }
        }
    }

    function claimUsername(username) {
        const name = username.trim();
        const email = session?.user?.email?.toLowerCase();
        if (!email || !name) return { ok: false, message: "Inicia sesión y elige un nombre de usuario." };
        const taken = JSON.parse(localStorage.getItem("writitiUsernames") || "{}");
        const owned = Object.entries(taken).find(([, value]) => value === email);
        if (owned) {
            if (owned[0].toLowerCase() === name.toLowerCase()) return { ok: true, username: owned[0] };
            return { ok: false, message: "Tu cuenta ya tiene el usuario " + owned[0] + "." };
        }
        const conflict = Object.keys(taken).find(key => key.toLowerCase() === name.toLowerCase());
        if (conflict) return { ok: false, message: "Ese nombre de usuario ya está en uso. Prueba otro." };
        taken[name] = email;
        localStorage.setItem("writitiUsernames", JSON.stringify(taken));
        return { ok: true, username: name };
    }

    function usernameForSession() {
        const email = session?.user?.email?.toLowerCase();
        if (!email) return "";
        const taken = JSON.parse(localStorage.getItem("writitiUsernames") || "{}");
        return Object.entries(taken).find(([, value]) => value === email)?.[0] || "";
    }

    window.siteAccess = {
        client,
        ownerEmail: OWNER_EMAIL,
        isOwner,
        requireAuth,
        requireOwner,
        getSession: () => session,
        claimUsername,
        usernameForSession
    };

    applyCursor();
    document.addEventListener("DOMContentLoaded", async () => {
        addSharedStyles();
        applyTheme();
        if (!client) {
            document.body.classList.remove("site-owner");
            setupMusicPlayer();
            return;
        }
        addAccessPanel();
        const { data } = await client.auth.getSession();
        render(data.session?.user || null);
        client.auth.onAuthStateChange((_event, nextSession) => render(nextSession?.user || null));
    });
})();
