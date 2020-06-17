'use strict';

const KoaRouter = require('koa-router');
const publicContent = require('./../../utils/publicContent');

const resume = new KoaRouter();

resume.get('/', publicContent);

module.exports = resume;
