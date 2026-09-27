import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/* The front page on the college's web hosting (deploy/godaddy) uses this server from another origin */
describe('front page on the web hosting', () => {
  const app = createApp();
  const site = 'https://fees.ahscollege.ac.in';

  it('allows the college front page and answers the pre-flight check', async () => {
    const pre = await request(app).options('/api/auth/login').set('Origin', site).set('Access-Control-Request-Method', 'POST');
    expect(pre.status).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe(site);
    expect(pre.headers['access-control-allow-headers']).toContain('Authorization');
    const h = await request(app).get('/api/health').set('Origin', site);
    expect(h.headers['access-control-allow-origin']).toBe(site);
  });

  it('does not allow other websites', async () => {
    const r = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('tells the front page which files to load', async () => {
    const r = await request(app).get('/api/web-assets');
    if (r.status === 404) return; // web app not built in this checkout
    expect(r.body.js[0]).toMatch(/^\/assets\/.+\.js$/);
    expect(r.body.css[0]).toMatch(/^\/assets\/.+\.css$/);
  });
});
