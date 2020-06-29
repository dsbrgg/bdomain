'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const config = require('config');

const { PORT = 5001 } = process.env;
const { pdf, webpage } = require('./routes');
const { publicMiddleware } = require('./middlewares');

const app = new Koa();

webpage(app);
pdf(app);

app.use(publicMiddleware);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
