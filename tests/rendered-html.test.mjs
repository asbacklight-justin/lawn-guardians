import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Lawn Guardians game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /草坪守卫战/);
  assert.match(html, /LAWN GUARDIANS/);
  assert.match(html, /开始/);
  assert.match(html, /第一关 · 熟悉防线/);
  assert.match(html, /月雾墓园/);
  assert.match(html, /潮汐玻璃屋/);
  assert.match(html, /风暴钟楼/);
  assert.match(html, /连续远征/);
  assert.match(html, /四关连战 · 状态不重置/);
  assert.match(html, /月芒菇/);
  assert.match(html, /自动收集场上全部阳光/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /react-loading-skeleton/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
});

test("exposes the complete plant roster in rendered HTML", async () => {
  const response = await render();
  const html = await response.text();

  for (const plant of [
    "暖阳花",
    "豆荚藤",
    "双生藤",
    "岩壳根",
    "霜叶蕨",
    "爆浆果",
  ]) {
    assert.match(html, new RegExp(plant));
  }

  assert.match(html, /最高分/);
  assert.match(html, /第 1 波/);
  assert.match(html, /aria-label="植物卡片"/);
});
