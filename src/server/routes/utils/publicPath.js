'use strict';

const split = __dirname.split('/');
const index = split.indexOf('dist');
const root = split.slice(0 , index).join('/');

export default `${root}/dist/public`;
