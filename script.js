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

  document.querySelectorAll(".account-card .copy-link").forEach(function (link) {
    link.addEventListener("click", async function () {
      const card = link.closest(".account-card");
      const bankEl = card && card.querySelector(".bank");
      const holderEl = card && card.querySelector(".holder");
      if (!bankEl) return;

      // "농협 3561194005123" → 숫자만 추출해 복사
      const number = bankEl.textContent.replace(/[^0-9]/g, "");
      const ok = await copyText(number);

      const holder = holderEl ? holderEl.textContent.trim() : "";
      if (ok) {
        showToast(holder + "님의 계좌번호가 복사되었습니다.");
      } else {
        showToast("복사에 실패했습니다. 다시 시도해 주세요.");
      }
    });
  });
})();
