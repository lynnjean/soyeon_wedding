// ===== 네이버 지도 (마커) =====
(function () {
  const VENUE = {
    lat: 33.4996507, // 위도
    lng: 126.5083329, // 경도
    title: "아젠토피오레 컨벤션",
    placeId: "1024728318",
  };

  const mapEl = document.getElementById("naverMap");
  if (!mapEl) return;

  // 네이버 지도 스크립트가 로드되지 않았으면(Client ID 미설정 등) 안내 표시
  if (typeof naver === "undefined" || !naver.maps) {
    mapEl.classList.add("map-fallback");
    mapEl.innerHTML =
      "<span>네이버 지도를 불러오지 못했습니다.<br />Client ID 설정을 확인해 주세요.</span>";
    return;
  }

  const center = new naver.maps.LatLng(VENUE.lat, VENUE.lng);
  const map = new naver.maps.Map(mapEl, {
    center: center,
    zoom: 16,
  });
  const marker = new naver.maps.Marker({
    position: center,
    map: map,
    title: VENUE.title,
  });

  // 마커 클릭 시 네이버 지도에서 해당 장소 열기
  naver.maps.Event.addListener(marker, "click", function () {
    window.open(
      "https://map.naver.com/p/entry/place/" + VENUE.placeId,
      "_blank",
    );
  });
})();

// 계좌번호 복사 기능
(function () {
  // 텍스트를 클립보드에 복사 (Clipboard API → 실패 시 execCommand 폴백)
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        /* 폴백으로 진행 */
      }
    }
    // file:// 등 비보안 환경 폴백
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  // 토스트 팝업 (몇 초간 표시 후 사라짐)
  let toastTimer = null;
  function showToast(message) {
    let toast = document.querySelector(".copy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "copy-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;

    // 재실행 시 애니메이션을 다시 트리거
    void toast.offsetWidth;
    toast.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2000);
  }

  // ===== 사진 확대 라이트박스 =====
  (function () {
    // 확대해서 볼 사진들 (갤러리 + 표지 메인 사진)
    const photos = document.querySelectorAll(
      ".gallery-item img, .cover-photo img",
    );
    if (!photos.length) return;

    // 오버레이 생성
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML =
      '<span class="lightbox-close" aria-label="닫기">&times;</span><img alt="확대 이미지" />';
    document.body.appendChild(lightbox);
    const bigImg = lightbox.querySelector("img");

    function open(src, alt) {
      bigImg.src = src;
      bigImg.alt = alt || "확대 이미지";
      lightbox.classList.add("show");
      document.body.style.overflow = "hidden"; // 배경 스크롤 잠금
    }
    function close() {
      lightbox.classList.remove("show");
      document.body.style.overflow = "";
    }

    photos.forEach(function (img) {
      img.classList.add("zoomable");
      img.addEventListener("click", function () {
        open(img.currentSrc || img.src, img.alt);
      });
    });

    lightbox.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  })();

  document.querySelectorAll(".account-card .copy-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const card = btn.closest(".account-card");
      const numberEl = card && card.querySelector(".acc-number");
      const nameEl = card && card.querySelector(".acc-name");
      if (!numberEl) return;

      // 숫자만 추출해 복사
      const number = numberEl.textContent.replace(/[^0-9]/g, "");
      const ok = await copyText(number);

      const holder = nameEl ? nameEl.textContent.trim() : "";
      if (ok) {
        showToast(holder + "님의 계좌번호가 복사되었습니다.");
      } else {
        showToast("복사에 실패했습니다. 다시 시도해 주세요.");
      }
    });
  });

  // ===== 주소 복사 =====
  document.querySelectorAll(".addr-row .btn-light").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const addrEl = document.querySelector(".addr-row .location-addr");
      if (!addrEl) return;

      // 주소 줄들을 합쳐 한 줄로 복사
      const address = Array.from(addrEl.querySelectorAll("p"))
        .map(function (p) {
          return p.textContent.trim();
        })
        .join(" ");

      const ok = await copyText(address);
      showToast(
        ok
          ? "주소가 복사되었습니다."
          : "복사에 실패했습니다. 다시 시도해 주세요.",
      );
    });
  });
})();

// ===== 축하 메시지 (구글 시트 백엔드 + 페이지네이션) =====
(function () {
  // ▼▼ 배포한 Google Apps Script 웹앱 URL을 여기에 붙여넣으세요 ▼▼
  const GUESTBOOK_URL =
    "https://script.google.com/macros/s/AKfycbwqyJB2M6VAE6uy83kdGfSwqdfRZ87rxcYQkxgzvSM3HZO_GGVYmym0ms9M_WlckNz8oQ/exec";

  const PER_PAGE = 5; // 한 페이지에 보여줄 메시지 수

  const listEl = document.getElementById("gbList");
  const pagerEl = document.getElementById("gbPagination");
  const nameEl = document.getElementById("gbName");
  const msgEl = document.getElementById("gbMessage");
  const countEl = document.getElementById("gbCount");
  const submitEl = document.getElementById("gbSubmit");
  if (!listEl) return;

  let messages = []; // 최신순 정렬된 메시지 배열
  let currentPage = 1;

  const isConfigured =
    GUESTBOOK_URL && GUESTBOOK_URL.indexOf("YOUR_APPS_SCRIPT_URL") === -1;

  // 글자 수 카운터
  if (msgEl && countEl) {
    msgEl.addEventListener("input", function () {
      countEl.textContent = msgEl.value.length + "/3000";
    });
  }

  function setState(text) {
    listEl.innerHTML = "";
    const p = document.createElement("p");
    p.className = "gb-state";
    p.textContent = text;
    listEl.appendChild(p);
    pagerEl.innerHTML = "";
  }

  function formatDate(value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "." +
      (d.getMonth() + 1) +
      "." +
      d.getDate() +
      ". " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  function render() {
    // 메시지가 0개여도 페이지(1)는 항상 표시
    const totalPages = Math.max(1, Math.ceil(messages.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    listEl.innerHTML = "";

    if (!messages.length) {
      // 메시지가 없을 때 안내 문구
      const empty = document.createElement("p");
      empty.className = "gb-state";
      empty.textContent = "작성된 메시지가 없습니다.";
      listEl.appendChild(empty);
    } else {
      const start = (currentPage - 1) * PER_PAGE;
      const pageItems = messages.slice(start, start + PER_PAGE);

      // 목록 렌더 (textContent 사용 → XSS 방지)
      pageItems.forEach(function (m) {
        const item = document.createElement("div");
        item.className = "guestbook-item";

        const name = document.createElement("p");
        name.className = "gb-name";
        name.textContent = m.name || "익명";

        const msg = document.createElement("p");
        msg.className = "gb-msg";
        msg.textContent = m.message || "";

        const date = document.createElement("p");
        date.className = "gb-date";
        date.textContent = formatDate(m.date);

        item.appendChild(name);
        item.appendChild(msg);
        item.appendChild(date);
        listEl.appendChild(item);
      });
    }

    renderPager(totalPages);
  }

  function renderPager(totalPages) {
    pagerEl.innerHTML = "";

    function pageBtn(label, page, opts) {
      opts = opts || {};
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gb-page-btn";
      b.textContent = label;
      if (opts.active) b.classList.add("active");
      if (opts.disabled) {
        b.disabled = true;
      } else {
        b.addEventListener("click", function () {
          currentPage = page;
          render();
          listEl.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      pagerEl.appendChild(b);
    }

    pageBtn("‹", currentPage - 1, { disabled: currentPage === 1 });
    for (let i = 1; i <= totalPages; i++) {
      pageBtn(String(i), i, { active: i === currentPage });
    }
    pageBtn("›", currentPage + 1, { disabled: currentPage === totalPages });
  }

  async function loadMessages() {
    if (!isConfigured) {
      setState("방명록 백엔드(Apps Script URL)가 아직 설정되지 않았습니다.");
      return;
    }
    try {
      const res = await fetch(GUESTBOOK_URL, { method: "GET" });
      const data = await res.json();
      messages = (data && data.data) || [];
      currentPage = 1;
      render();
    } catch (e) {
      setState("메시지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function submit() {
    if (!isConfigured) {
      alert("방명록 백엔드가 아직 설정되지 않았습니다.");
      return;
    }
    const name = (nameEl.value || "").trim() || "익명";
    const message = (msgEl.value || "").trim();
    if (!message) {
      alert("축하 메시지를 입력해 주세요.");
      msgEl.focus();
      return;
    }

    // 1) 화면에 먼저 즉시 추가 (낙관적 업데이트)
    const newMsg = {
      name: name,
      message: message,
      date: new Date().toISOString(),
    };
    messages.unshift(newMsg);
    currentPage = 1;
    render();
    nameEl.value = "";
    msgEl.value = "";
    if (countEl) countEl.textContent = "0/3000";

    // 2) 서버 저장은 백그라운드로 (응답을 기다리지 않음)
    fetch(GUESTBOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ name: name, message: message }),
    }).catch(function () {
      // 저장 실패 시 방금 추가한 메시지를 되돌리고 알림
      const idx = messages.indexOf(newMsg);
      if (idx !== -1) messages.splice(idx, 1);
      render();
      alert("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    });
  }

  if (submitEl) submitEl.addEventListener("click", submit);

  loadMessages();
})();
