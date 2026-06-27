// ===== 배경 음악 =====
(function () {
  const audio = document.getElementById("bgm");
  const toggle = document.getElementById("bgmToggle");
  if (!audio || !toggle) return;

  audio.volume = 0.5;
  let started = false;

  function play() {
    audio
      .play()
      .then(() => toggle.classList.add("playing"))
      .catch(() => toggle.classList.remove("playing"));
  }
  function pause() {
    audio.pause();
    toggle.classList.remove("playing");
  }

  // 버튼 클릭으로 재생/정지
  toggle.addEventListener("click", function () {
    started = true;
    if (audio.paused) play();
    else pause();
  });

  // 첫 화면 터치/클릭 시 자동 재생 시도 (브라우저 자동재생 정책 대응)
  function autoStart(e) {
    if (started) return;
    // 음악 버튼을 누른 경우는 click 핸들러가 처리하므로 제외
    if (e && toggle.contains(e.target)) return;
    started = true;
    play();
  }
  window.addEventListener("pointerdown", autoStart, { once: true });
  window.addEventListener("touchstart", autoStart, { once: true });
})();

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
    const galleryImgs = Array.from(
      document.querySelectorAll(
        ".gallery-zoom, .gallery-quad img:not(.quad-flower), .gallery-item img:not(.gallery-birds)",
      ),
    );
    const coverImgs = Array.from(document.querySelectorAll(".cover-photo img"));
    if (!galleryImgs.length && !coverImgs.length) return;

    // 갤러리 사진 목록 (캐러셀용)
    const gallerySrcs = galleryImgs.map(function (img) {
      return { src: img.currentSrc || img.src, alt: img.alt };
    });

    // 오버레이 생성
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML =
      '<span class="lightbox-close" aria-label="닫기">&times;</span>' +
      '<button class="lightbox-nav prev" type="button" aria-label="이전 사진"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<img alt="확대 이미지" />' +
      '<button class="lightbox-nav next" type="button" aria-label="다음 사진"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '<span class="lightbox-count"></span>';
    document.body.appendChild(lightbox);
    const bigImg = lightbox.querySelector("img");
    const prevBtn = lightbox.querySelector(".prev");
    const nextBtn = lightbox.querySelector(".next");
    const countEl = lightbox.querySelector(".lightbox-count");

    let currentIndex = -1; // -1 = 단일(표지) 모드

    function showIndex(i) {
      const n = gallerySrcs.length;
      if (!n) return;
      currentIndex = (i + n) % n; // 순환
      bigImg.src = gallerySrcs[currentIndex].src;
      bigImg.alt = gallerySrcs[currentIndex].alt || "확대 이미지";
      countEl.textContent = currentIndex + 1 + " / " + n;
    }

    function openGallery(i) {
      lightbox.classList.add("gallery-mode");
      showIndex(i);
      lightbox.classList.add("show");
      document.body.style.overflow = "hidden";
    }

    function openSingle(src, alt) {
      currentIndex = -1;
      lightbox.classList.remove("gallery-mode");
      bigImg.src = src;
      bigImg.alt = alt || "확대 이미지";
      lightbox.classList.add("show");
      document.body.style.overflow = "hidden";
    }

    function close() {
      lightbox.classList.remove("show");
      document.body.style.overflow = "";
    }

    // 갤러리 사진 → 캐러셀 모드
    galleryImgs.forEach(function (img, i) {
      img.classList.add("zoomable");
      img.addEventListener("click", function () {
        openGallery(i);
      });
    });
    // 표지 사진 → 단일 확대
    coverImgs.forEach(function (img) {
      img.classList.add("zoomable");
      img.addEventListener("click", function () {
        openSingle(img.currentSrc || img.src, img.alt);
      });
    });

    prevBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      showIndex(currentIndex - 1);
    });
    nextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      showIndex(currentIndex + 1);
    });

    // 배경 클릭 시 닫기 (이미지/화살표 클릭은 제외)
    lightbox.addEventListener("click", function (e) {
      if (e.target === bigImg) return;
      close();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("show")) return;
      if (e.key === "Escape") {
        close();
      } else if (lightbox.classList.contains("gallery-mode")) {
        if (e.key === "ArrowLeft") showIndex(currentIndex - 1);
        if (e.key === "ArrowRight") showIndex(currentIndex + 1);
      }
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
        // 복사된 카드의 은행·계좌번호·복사 텍스트를 잠깐 빨간색으로
        const bottom = card.querySelector(".acc-bottom");
        if (bottom) {
          bottom.classList.add("copied");
          setTimeout(function () {
            bottom.classList.remove("copied");
          }, 1200);
        }
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

  const PASTELS = [
    "#e7f4d2",
    "#fcd9d9",
    "#d7f1ea",
    "#eaf3ee",
    "#fdeccf",
    "#e8e3f5",
  ];

  const listEl = document.getElementById("gbList");
  const moreEl = document.getElementById("gbMore");
  const nameEl = document.getElementById("gbName");
  const msgEl = document.getElementById("gbMessage");
  const countEl = document.getElementById("gbCount");
  const submitEl = document.getElementById("gbSubmit");
  if (!listEl) return;

  let messages = []; // 최신순 정렬된 메시지 배열

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
    if (moreEl) moreEl.style.display = "none";
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
    listEl.innerHTML = "";

    if (!messages.length) {
      const empty = document.createElement("p");
      empty.className = "gb-state";
      empty.textContent = "작성된 메시지가 없습니다.";
      listEl.appendChild(empty);
      if (moreEl) moreEl.style.display = "none";
      return;
    }

    // 2열 메이슨리: 좌/우 컬럼에 번갈아 배치
    const colA = document.createElement("div");
    colA.className = "gb-col";
    const colB = document.createElement("div");
    colB.className = "gb-col";

    // 파스텔 카드 (textContent 사용 → XSS 방지)
    messages.forEach(function (m, i) {
      const item = document.createElement("div");
      item.className = "guestbook-item";
      item.style.background = PASTELS[i % PASTELS.length];

      const msg = document.createElement("p");
      msg.className = "gb-msg";
      msg.textContent = m.message || "";

      const name = document.createElement("p");
      name.className = "gb-name";
      name.textContent = m.name || "익명";

      const date = document.createElement("p");
      date.className = "gb-date";
      date.textContent = formatDate(m.date);

      item.appendChild(msg);
      item.appendChild(name);
      item.appendChild(date);

      // 긴 메시지는 잘려 있고, 카드를 누르면 펼쳐짐
      item.addEventListener("click", function () {
        item.classList.toggle("expanded");
      });

      (i % 2 === 0 ? colA : colB).appendChild(item);
    });

    listEl.appendChild(colA);
    listEl.appendChild(colB);

    updateMore();
  }

  // 컨테이너가 접혀 있고 내용이 넘치면 더보기 버튼 표시
  function updateMore() {
    if (!moreEl) return;
    const collapsed = listEl.classList.contains("gb-collapsed");
    if (collapsed && listEl.scrollHeight > listEl.clientHeight + 4) {
      moreEl.style.display = "block";
    } else {
      moreEl.style.display = "none";
    }
  }

  async function loadMessages() {
    if (!isConfigured) {
      setState("방명록 백엔드(Apps Script URL)가 아직 설정되지 않았습니다.");
      return;
    }
    setState("축하 메시지 불러오는 중...");
    try {
      const res = await fetch(GUESTBOOK_URL, { method: "GET" });
      const data = await res.json();
      messages = (data && data.data) || [];
      listEl.classList.add("gb-collapsed");
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

  if (moreEl)
    moreEl.addEventListener("click", function () {
      listEl.classList.remove("gb-collapsed");
      moreEl.style.display = "none";
    });

  loadMessages();
})();
