'use strict';

import { join } from 'path';
import KoaRouter from 'koa-router';
import renderTemplate from 'routes/utils/renderTemplate';

const blog = new KoaRouter();

blog.get('/', renderTemplate);

blog.get('/posts', async ctx => {
  ctx.status = 200;
  ctx.body = [];
});

export default blog;
