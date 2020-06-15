'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const send = require('koa-send');
const config = require('config');
const puppeteer = require('puppeteer');

const app = new Koa();
const router = new Router();

const { port } = config.get('server');
const { headless, format, url, parameters } = config.get('pdf');

const publicContent = async ctx => {
  await send(ctx, '/', { root: `${__dirname}/public/index.html` });
};

const publicMiddleware = async ctx => {
  await send(ctx, ctx.path, { root: `${__dirname}/public` });
};

// https://blog.risingstack.com/pdf-from-html-node-js-puppeteer/
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

router.get('/', publicContent);
router.get('/resume', publicContent);
router.get('/blog', publicContent);
router.get('/pdf', publicContent);

app
  .use(router.routes())
  .use(router.allowedMethods());

app.use(publicMiddleware);

app.listen(5001);
