'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const config = require('config');

const { port } = config.get('server');
const { pdf, webpage } = require('./routes');
const { publicMiddleware } = require('./middlewares');

const app = new Koa();

webpage(app);
pdf(app);

app.use(publicMiddleware);

app.listen(port);
