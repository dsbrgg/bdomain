'use strict';

const Koa = require('koa');
const config = require('config');
const puppeteer = require('puppeteer');

const app = new Koa();

const { port } = config.get('server');
const { format, url, parameters } = config.get('pdf');

// https://blog.risingstack.com/pdf-from-html-node-js-puppeteer/
app.use(async ctx => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, parameters);
  const pdf = await page.pdf({ format });

  await browser.close();

  ctx.set('Content-Type', 'application/pdf');
  ctx.body = pdf;
});

app.listen(5001);
