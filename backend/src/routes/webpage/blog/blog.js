'use strict';

const KoaRouter = require('koa-router');
const publicContent = require('./../../utils/publicContent');

const blog = new KoaRouter();

blog.get('/', publicContent);

blog.get('/posts', async ctx => {
  ctx.status = 200;
  ctx.body = [];
});

module.exports = blog;
