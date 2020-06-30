'use strict';

import send from 'koa-send';

const split = __dirname.split('/');
const index = split.indexOf('dist');
const root = split.slice(0 , index).join('/');

export default async ctx => {
  await send(ctx, ctx.path, { root: `${root}/dist/public` });
};
