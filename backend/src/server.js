'use strict';

const Koa = require('koa');
const Router = require('koa-router');

const { pdf, webpage } = require('./routes');
const { publicMiddleware } = require('./middlewares');

const app = new Koa();

webpage(app);
pdf(app);

app.use(publicMiddleware);

app.listen(5001);
