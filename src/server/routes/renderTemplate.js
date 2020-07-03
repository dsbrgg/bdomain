'use strict';

import template from 'template';
import ssr from 'public/build/ssr.js';
import resume from 'routes/webpage/resume/resume.json';

const getState = url => {
  switch (url) {
    case '/': return { ...resume, url };
    case '/blog': return { ...resume, url };
    case '/resume': return { ...resume, url };
    case '/pdf': return { ...resume, url };
  }
};

export default async ctx => {
  const state = getState(ctx.url);
  const { html, css, head } = ssr.render(state);

  ctx.set('Content-Type', 'text/html');
  ctx.body = template({ css, head, html, state });
};
