'use strict';

import KoaRouter from 'koa-router';
import config from 'config';
import puppeteer from 'puppeteer';
import renderTemplate from 'routes/renderTemplate';
import prepareRouter from 'routes/utils/prepareRouter';

const {
  chromium,
  filename,
  format,
  url,
  viewport,
  parameters,
  media
} = config.get('pdf');

const router = new KoaRouter({ prefix: '/pdf' });

router.get('/', renderTemplate);

router.get('/download', async ctx => {
  const browser = await puppeteer.launch(chromium);
  const page = await browser.newPage();

  await page.setViewport(viewport);
  await page.goto(url, parameters);
  await page.emulateMedia(media);
  await page.waitFor(2000);

  const pdf = await page.pdf(format);

  await browser.close();

  ctx.set('Content-Disposition', `attachment; filename=${filename}.pdf`);
  ctx.set('Content-Type', 'application/pdf');
  ctx.body = pdf;
});

export default prepareRouter(router);
