'use strict';

const KoaRouter = require('koa-router');
const config = require('config');
const puppeteer = require('puppeteer');
const publicContent = require('../utils/publicContent');
const prepareRouter = require('../utils/prepareRouter');

const { port } = config.get('server');
const { headless, format, url, parameters } = config.get('pdf');
const router = new KoaRouter({ prefix: '/pdf' });

router.get('/', publicContent);

router.get('/download', async ctx => {
  const browser = await puppeteer.launch({ headless });
  const page = await browser.newPage();

  await page.goto(url, parameters);

  const pdf = await page.pdf({ format });

  await browser.close();

  ctx.set('Content-Disposition', 'attachment; filename=diego_braga_cv.pdf');
  ctx.set('Content-Type', 'application/pdf');
  ctx.body = pdf;
});

module.exports = prepareRouter(router);
