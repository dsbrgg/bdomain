import App from 'App.svelte';

var app = new App({
	target: document.body,
  hydrate: true,
  props: window.__PRELOADED_STATE__
});

export default app;
