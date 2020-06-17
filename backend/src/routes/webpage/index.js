'use strict';

const KoaRouter = require('koa-router');
const publicContent = require('../../utils/publicContent');
const prepareRouter = require('../utils/prepareRouter');

const router = new KoaRouter({});

router.get('/', publicContent);
router.get('/resume', publicContent);
router.get('/blog', publicContent);

module.exports = prepareRouter(router);
