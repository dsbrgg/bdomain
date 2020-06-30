'use strict';

import send from 'koa-send';
import publicPath from 'routes/utils/publicPath';

export default async ctx => {
  await send(ctx, '/', { root: `${publicPath}/index.html` });
};
