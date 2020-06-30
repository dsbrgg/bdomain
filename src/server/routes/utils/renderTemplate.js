'use strict';

import template from 'template';
import ssr from 'public/build/ssr.js';

export default async ctx => {
  const { url } = ctx;
  const { html, css, head } = ssr.render({ url, test: 123 });

  ctx.set('Content-Type', 'text/html');
  ctx.body = template({
    css,
    head,
    html,
    state: {
      url,
      test: 123
    }
  });
};
