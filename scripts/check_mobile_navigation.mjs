import { spawn } from "node:child_process";

const port = 9223;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/cannery-chrome-${Date.now()}`,
  "about:blank",
], { stdio: "ignore" });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForChrome() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw new Error("Chromium did not start");
}

try {
  await waitForChrome();
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("http://127.0.0.1:4173/")}`, { method: "PUT" }).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let requestId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return result.result.value;
  };

  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call("Page.navigate", { url: "http://127.0.0.1:4173/" });
  await delay(1800);
  const before = await evaluate(`(() => { const button = document.querySelector('.menu-toggle'); return { buttonVisible: getComputedStyle(button).display !== 'none', expanded: button.getAttribute('aria-expanded'), giftLinks: [...document.querySelectorAll('header a, footer a')].filter(a => /gift/i.test(a.textContent || '')).length }; })()`);
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  await delay(100);
  const opened = await evaluate(`(() => ({ expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), menuVisible: !!document.querySelector('#mobile-navigation'), links: [...document.querySelectorAll('#mobile-navigation a')].map(a => a.textContent.trim()) }))()`);
  await evaluate(`window.scrollTo(0, 1300)`);
  await delay(100);
  const sticky = await evaluate(`(() => ({ top: Math.round(document.querySelector('.navbar').getBoundingClientRect().top), scrollY: Math.round(window.scrollY), position: getComputedStyle(document.querySelector('.navbar')).position }))()`);
  console.log(JSON.stringify({ before, opened, sticky }, null, 2));
  socket.close();
} finally {
  chrome.kill("SIGTERM");
}
