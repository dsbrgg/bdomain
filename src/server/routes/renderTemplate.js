'use strict';

import config from 'config';
import template from 'template';
import ssr from 'public/build/ssr.js';
import home from 'routes/webpage/webpage.json';
import blog from 'routes/webpage/blog/blog.json';
import resume from 'routes/webpage/resume/resume.json';

const client = config.get('client');

const getState = url => {
  switch (url) {
    case '/': return { home, client, url };
    case '/blog': return { blog, client, url };
    case '/resume': return { resume, client, url };
    case '/pdf': return { resume, saveFile: true, client, url };
    default: return null;
  }
};

export default async ctx => {
  const state = getState(ctx.url);
  const mountState = ctx.get('X-State');
  const { html, css, head } = ssr.render(state);

  if (mountState === ctx.url) {
    ctx.body = state;

    return;
  }

  ctx.set('Content-Type', 'text/html');
  ctx.body = template({ css, head, html, state });
};
