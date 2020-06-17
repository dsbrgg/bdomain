'use strict';

const { join } = require('path');
const send = require('koa-send');

module.exports = async ctx => {
  const split = __dirname.split('/');
  const index = split.indexOf('src');
  const path = split.slice(0 , index).join('/');
  const src = join(path, 'src');

  await send(ctx, '/', { root: `${src}/public/index.html` });
};
