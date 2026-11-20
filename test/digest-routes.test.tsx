import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';
import type { DigestNight } from '../src/digest/types.js';

const REAL = '2026-10-28';
const EMPTY = '2026-01-02';
const BAD = '2026-01-03';
const MISSING = '2026-01-04';

const good = '{"at":"2026-01-03T00:00:00+01:00","job":"a/job","status":"ok","owner":"x"}';

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  copyFileSync(join('runs', `${REAL}.jsonl`), join(dir, `${REAL}.jsonl`));
  writeFileSync(join(dir, `${EMPTY}.jsonl`), '');
  writeFileSync(join(dir, `${BAD}.jsonl`), `${good}\nnot json\n`);
  const config: RigConfig = {
    adapter: 'test',
    installed: '2026-01-01',
    beatEverySeconds: 60,
    runsDir: dir,
  };
  app = createApp(config);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const page = async (night: string) => {
  const res = await app.request(`/digest/${night}`);
  return { res, html: await res.text() };
};
const api = async (night: string) => {
  const res = await app.request(`/api/digest/${night}`);
  return { res, json: (await res.json()) as DigestNight & { error?: string } };
};

describe('a night with a file', () => {
  it('page lists all 5 jobs and the JSON agrees on their order', async () => {
    const { res, html } = await page(REAL);
    expect(res.status).toBe(200);
    const { res: apiRes, json } = await api(REAL);
    expect(apiRes.status).toBe(200);
    const jobs = json.rows.map((r) => r.job);
    expect(jobs).toHaveLength(5);
    const positions = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    for (const p of positions) expect(p).toBeGreaterThan(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(json.night).toBe(REAL);
  });
});

describe('a night with no file', () => {
  it('page is 404', async () => {
    const { res, html } = await page(MISSING);
    expect(res.status).toBe(404);
    expect(html).toContain('no digest for this night');
  });

  it('JSON is 404', async () => {
    const { res, json } = await api(MISSING);
    expect(res.status).toBe(404);
    expect(json.error).toBe('no such night');
  });
});

describe('the empty night', () => {
  it('page says nothing ran', async () => {
    const { res, html } = await page(EMPTY);
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('JSON has no rows', async () => {
    const { res, json } = await api(EMPTY);
    expect(res.status).toBe(200);
    expect(json.rows).toEqual([]);
  });
});

describe('a night with a bad line', () => {
  it('page is 200 and says it could not read 1 line', async () => {
    const { res, html } = await page(BAD);
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    expect(html).toContain('<td>a/job</td>');
  });

  it('JSON is 200 with badLines 1', async () => {
    const { res, json } = await api(BAD);
    expect(res.status).toBe(200);
    expect(json.badLines).toBe(1);
    expect(json.rows).toHaveLength(1);
  });
});
