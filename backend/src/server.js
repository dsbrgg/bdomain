'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const config = require('config');

const { PORT } = process.env;
const { pdf, webpage } = require('./routes');
const { publicMiddleware } = require('./middlewares');

const app = new Koa();

webpage(app);
pdf(app);

app.use(publicMiddleware);

app.listen(PORT || 5001, () => {
  console.log(`Listening on port ${PORT || 5001}`);
});
