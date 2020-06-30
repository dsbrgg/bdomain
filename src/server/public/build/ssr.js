'use strict';

function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}
const escaped = {
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};
function escape(html) {
    return String(html).replace(/["'&<>]/g, match => escaped[match]);
}
function each(items, fn) {
    let str = '';
    for (let i = 0; i < items.length; i += 1) {
        str += fn(items[i], i);
    }
    return str;
}
const missing_component = {
    $$render: () => ''
};
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe,
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

const LOCATION = {};
const ROUTER = {};

/**
 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
 *
 * https://github.com/reach/router/blob/master/LICENSE
 * */

function getLocation(source) {
  return {
    ...source.location,
    state: source.history.state,
    key: (source.history.state && source.history.state.key) || "initial"
  };
}

function createHistory(source, options) {
  const listeners = [];
  let location = getLocation(source);

  return {
    get location() {
      return location;
    },

    listen(listener) {
      listeners.push(listener);

      const popstateListener = () => {
        location = getLocation(source);
        listener({ location, action: "POP" });
      };

      source.addEventListener("popstate", popstateListener);

      return () => {
        source.removeEventListener("popstate", popstateListener);

        const index = listeners.indexOf(listener);
        listeners.splice(index, 1);
      };
    },

    navigate(to, { state, replace = false } = {}) {
      state = { ...state, key: Date.now() + "" };
      // try...catch iOS Safari limits to 100 pushState calls
      try {
        if (replace) {
          source.history.replaceState(state, null, to);
        } else {
          source.history.pushState(state, null, to);
        }
      } catch (e) {
        source.location[replace ? "replace" : "assign"](to);
      }

      location = getLocation(source);
      listeners.forEach(listener => listener({ location, action: "PUSH" }));
    }
  };
}

// Stores history entries in memory for testing or other platforms like Native
function createMemorySource(initialPathname = "/") {
  let index = 0;
  const stack = [{ pathname: initialPathname, search: "" }];
  const states = [];

  return {
    get location() {
      return stack[index];
    },
    addEventListener(name, fn) {},
    removeEventListener(name, fn) {},
    history: {
      get entries() {
        return stack;
      },
      get index() {
        return index;
      },
      get state() {
        return states[index];
      },
      pushState(state, _, uri) {
        const [pathname, search = ""] = uri.split("?");
        index++;
        stack.push({ pathname, search });
        states.push(state);
      },
      replaceState(state, _, uri) {
        const [pathname, search = ""] = uri.split("?");
        stack[index] = { pathname, search };
        states[index] = state;
      }
    }
  };
}

// Global history uses window.history as the source if available,
// otherwise a memory history
const canUseDOM = Boolean(
  typeof window !== "undefined" &&
    window.document &&
    window.document.createElement
);
const globalHistory = createHistory(canUseDOM ? window : createMemorySource());

/**
 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
 *
 * https://github.com/reach/router/blob/master/LICENSE
 * */

const paramRe = /^:(.+)/;

const SEGMENT_POINTS = 4;
const STATIC_POINTS = 3;
const DYNAMIC_POINTS = 2;
const SPLAT_PENALTY = 1;
const ROOT_POINTS = 1;

/**
 * Check if `segment` is a root segment
 * @param {string} segment
 * @return {boolean}
 */
function isRootSegment(segment) {
  return segment === "";
}

/**
 * Check if `segment` is a dynamic segment
 * @param {string} segment
 * @return {boolean}
 */
function isDynamic(segment) {
  return paramRe.test(segment);
}

/**
 * Check if `segment` is a splat
 * @param {string} segment
 * @return {boolean}
 */
function isSplat(segment) {
  return segment[0] === "*";
}

/**
 * Split up the URI into segments delimited by `/`
 * @param {string} uri
 * @return {string[]}
 */
function segmentize(uri) {
  return (
    uri
      // Strip starting/ending `/`
      .replace(/(^\/+|\/+$)/g, "")
      .split("/")
  );
}

/**
 * Strip `str` of potential start and end `/`
 * @param {string} str
 * @return {string}
 */
function stripSlashes(str) {
  return str.replace(/(^\/+|\/+$)/g, "");
}

/**
 * Score a route depending on how its individual segments look
 * @param {object} route
 * @param {number} index
 * @return {object}
 */
function rankRoute(route, index) {
  const score = route.default
    ? 0
    : segmentize(route.path).reduce((score, segment) => {
        score += SEGMENT_POINTS;

        if (isRootSegment(segment)) {
          score += ROOT_POINTS;
        } else if (isDynamic(segment)) {
          score += DYNAMIC_POINTS;
        } else if (isSplat(segment)) {
          score -= SEGMENT_POINTS + SPLAT_PENALTY;
        } else {
          score += STATIC_POINTS;
        }

        return score;
      }, 0);

  return { route, score, index };
}

/**
 * Give a score to all routes and sort them on that
 * @param {object[]} routes
 * @return {object[]}
 */
function rankRoutes(routes) {
  return (
    routes
      .map(rankRoute)
      // If two routes have the exact same score, we go by index instead
      .sort((a, b) =>
        a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
      )
  );
}

/**
 * Ranks and picks the best route to match. Each segment gets the highest
 * amount of points, then the type of segment gets an additional amount of
 * points where
 *
 *  static > dynamic > splat > root
 *
 * This way we don't have to worry about the order of our routes, let the
 * computers do it.
 *
 * A route looks like this
 *
 *  { path, default, value }
 *
 * And a returned match looks like:
 *
 *  { route, params, uri }
 *
 * @param {object[]} routes
 * @param {string} uri
 * @return {?object}
 */
function pick(routes, uri) {
  let match;
  let default_;

  const [uriPathname] = uri.split("?");
  const uriSegments = segmentize(uriPathname);
  const isRootUri = uriSegments[0] === "";
  const ranked = rankRoutes(routes);

  for (let i = 0, l = ranked.length; i < l; i++) {
    const route = ranked[i].route;
    let missed = false;

    if (route.default) {
      default_ = {
        route,
        params: {},
        uri
      };
      continue;
    }

    const routeSegments = segmentize(route.path);
    const params = {};
    const max = Math.max(uriSegments.length, routeSegments.length);
    let index = 0;

    for (; index < max; index++) {
      const routeSegment = routeSegments[index];
      const uriSegment = uriSegments[index];

      if (routeSegment !== undefined && isSplat(routeSegment)) {
        // Hit a splat, just grab the rest, and return a match
        // uri:   /files/documents/work
        // route: /files/* or /files/*splatname
        const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

        params[splatName] = uriSegments
          .slice(index)
          .map(decodeURIComponent)
          .join("/");
        break;
      }

      if (uriSegment === undefined) {
        // URI is shorter than the route, no match
        // uri:   /users
        // route: /users/:userId
        missed = true;
        break;
      }

      let dynamicMatch = paramRe.exec(routeSegment);

      if (dynamicMatch && !isRootUri) {
        const value = decodeURIComponent(uriSegment);
        params[dynamicMatch[1]] = value;
      } else if (routeSegment !== uriSegment) {
        // Current segments don't match, not dynamic, not splat, so no match
        // uri:   /users/123/settings
        // route: /users/:id/profile
        missed = true;
        break;
      }
    }

    if (!missed) {
      match = {
        route,
        params,
        uri: "/" + uriSegments.slice(0, index).join("/")
      };
      break;
    }
  }

  return match || default_ || null;
}

/**
 * Check if the `path` matches the `uri`.
 * @param {string} path
 * @param {string} uri
 * @return {?object}
 */
function match(route, uri) {
  return pick([route], uri);
}

/**
 * Combines the `basepath` and the `path` into one path.
 * @param {string} basepath
 * @param {string} path
 */
function combinePaths(basepath, path) {
  return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
}

/* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.23.2 */

const Router = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $base;
	let $location;
	let $routes;
	let { basepath = "/" } = $$props;
	let { url = null } = $$props;
	const locationContext = getContext(LOCATION);
	const routerContext = getContext(ROUTER);
	const routes = writable([]);
	$routes = get_store_value(routes);
	const activeRoute = writable(null);
	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

	// If locationContext is not set, this is the topmost Router in the tree.
	// If the `url` prop is given we force the location to it.
	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

	$location = get_store_value(location);

	// If routerContext is set, the routerBase of the parent Router
	// will be the base for this Router's descendants.
	// If routerContext is not set, the path and resolved uri will both
	// have the value of the basepath prop.
	const base = routerContext
	? routerContext.routerBase
	: writable({ path: basepath, uri: basepath });

	$base = get_store_value(base);

	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
		// If there is no activeRoute, the routerBase will be identical to the base.
		if (activeRoute === null) {
			return base;
		}

		const { path: basepath } = base;
		const { route, uri } = activeRoute;

		// Remove the potential /* or /*splatname from
		// the end of the child Routes relative paths.
		const path = route.default
		? basepath
		: route.path.replace(/\*.*$/, "");

		return { path, uri };
	});

	function registerRoute(route) {
		const { path: basepath } = $base;
		let { path } = route;

		// We store the original path in the _path property so we can reuse
		// it when the basepath changes. The only thing that matters is that
		// the route reference is intact, so mutation is fine.
		route._path = path;

		route.path = combinePaths(basepath, path);

		if (typeof window === "undefined") {
			// In SSR we should set the activeRoute immediately if it is a match.
			// If there are more Routes being registered after a match is found,
			// we just skip them.
			if (hasActiveRoute) {
				return;
			}

			const matchingRoute = match(route, $location.pathname);

			if (matchingRoute) {
				activeRoute.set(matchingRoute);
				hasActiveRoute = true;
			}
		} else {
			routes.update(rs => {
				rs.push(route);
				return rs;
			});
		}
	}

	function unregisterRoute(route) {
		routes.update(rs => {
			const index = rs.indexOf(route);
			rs.splice(index, 1);
			return rs;
		});
	}

	if (!locationContext) {
		// The topmost Router in the tree is responsible for updating
		// the location store and supplying it through context.
		onMount(() => {
			const unlisten = globalHistory.listen(history => {
				location.set(history.location);
			});

			return unlisten;
		});

		setContext(LOCATION, location);
	}

	setContext(ROUTER, {
		activeRoute,
		base,
		routerBase,
		registerRoute,
		unregisterRoute
	});

	if ($$props.basepath === void 0 && $$bindings.basepath && basepath !== void 0) $$bindings.basepath(basepath);
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);
	$base = get_store_value(base);
	$location = get_store_value(location);
	$routes = get_store_value(routes);

	 {
		{
			const { path: basepath } = $base;

			routes.update(rs => {
				rs.forEach(r => r.path = combinePaths(basepath, r._path));
				return rs;
			});
		}
	}

	 {
		{
			const bestMatch = pick($routes, $location.pathname);
			activeRoute.set(bestMatch);
		}
	}

	return `${$$slots.default ? $$slots.default({}) : ``}`;
});

/* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.23.2 */

const Route = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $activeRoute;
	let $location;
	let { path = "" } = $$props;
	let { component = null } = $$props;
	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
	$activeRoute = get_store_value(activeRoute);
	const location = getContext(LOCATION);
	$location = get_store_value(location);

	const route = {
		path,
		// If no path prop is given, this Route will act as the default Route
		// that is rendered if no other Route in the Router is a match.
		default: path === ""
	};

	let routeParams = {};
	let routeProps = {};
	registerRoute(route);

	// There is no need to unregister Routes in SSR since it will all be
	// thrown away anyway.
	if (typeof window !== "undefined") {
		onDestroy(() => {
			unregisterRoute(route);
		});
	}

	if ($$props.path === void 0 && $$bindings.path && path !== void 0) $$bindings.path(path);
	if ($$props.component === void 0 && $$bindings.component && component !== void 0) $$bindings.component(component);
	$activeRoute = get_store_value(activeRoute);
	$location = get_store_value(location);

	 {
		if ($activeRoute && $activeRoute.route === route) {
			routeParams = $activeRoute.params;
		}
	}

	 {
		{
			const { path, component, ...rest } = $$props;
			routeProps = rest;
		}
	}

	return `${$activeRoute !== null && $activeRoute.route === route
	? `${component !== null
		? `${validate_component(component || missing_component, "svelte:component").$$render($$result, Object.assign({ location: $location }, routeParams, routeProps), {}, {})}`
		: `${$$slots.default
			? $$slots.default({ params: routeParams, location: $location })
			: ``}`}`
	: ``}`;
});

/* src/pages/Home.svelte generated by Svelte v3.23.2 */

const Home = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { location } = $$props;
	if ($$props.location === void 0 && $$bindings.location && location !== void 0) $$bindings.location(location);

	return `<div><h1>Hello World!</h1>

  <p>Thanks for visiting my webpage.</p>
  <p>You can checkout my resume through the tab above.</p>
  <p>Have a good one! :)</p></div>`;
});

/* src/components/Transition.svelte generated by Svelte v3.23.2 */

const css = {
	code: "div.svelte-8sihx2{height:100%}",
	map: "{\"version\":3,\"file\":\"Transition.svelte\",\"sources\":[\"Transition.svelte\"],\"sourcesContent\":[\"<script>\\n  import { fade } from 'svelte/transition';\\n</script>\\n\\n<style>\\n  div {\\n   height: 100%; \\n  }\\n</style>\\n\\n<div in:fade=\\\"{{ duration: 1000 }}\\\">\\n  <slot />\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAKE,GAAG,cAAC,CAAC,AACJ,MAAM,CAAE,IAAI,AACb,CAAC\"}"
};

const Transition = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css);
	return `<div class="${"svelte-8sihx2"}">${$$slots.default ? $$slots.default({}) : ``}</div>`;
});

/* src/pages/resume/components/MainInfo.svelte generated by Svelte v3.23.2 */

const css$1 = {
	code: ".main-info-container.svelte-vcwx8e{margin:2em}.main-info-data.svelte-vcwx8e{margin-bottom:1em}#main-info-name.svelte-vcwx8e{font-family:'Shadows Into Light', cursive;font-size:3em;font-style:italic}.main-info-description.svelte-vcwx8e{margin-top:1em;margin-bottom:1em;margin-left:4em;margin-right:4em}@media(max-width: 500px), (max-height: 800px){.main-info-description.svelte-vcwx8e{margin-top:1em;margin-bottom:1em;margin-left:0em;margin-right:0em}}",
	map: "{\"version\":3,\"file\":\"MainInfo.svelte\",\"sources\":[\"MainInfo.svelte\"],\"sourcesContent\":[\"<script>\\n</script>\\n\\n<style>\\n  .main-info-container {\\n    margin: 2em; \\n  }\\n\\n  .main-info-data {\\n    margin-bottom: 1em;\\n  }\\n\\n  #main-info-name {\\n    font-family: 'Shadows Into Light', cursive;\\n    font-size: 3em;\\n    font-style: italic;\\n  }\\n\\n  .main-info-description {\\n    margin-top: 1em;\\n    margin-bottom: 1em;\\n    margin-left: 4em;\\n    margin-right: 4em;\\n  }\\n\\n  @media (max-width: 500px), (max-height: 800px) {\\n    .main-info-description {\\n      margin-top: 1em;\\n      margin-bottom: 1em;\\n      margin-left: 0em;\\n      margin-right: 0em;\\n    }\\n  }\\n</style>\\n\\n<div class=\\\"main-info-container\\\">\\n  <div class=\\\"main-info-data\\\">\\n    <h2 id=\\\"main-info-name\\\">Diego Braga</h2>\\n    <span>Porto, Portugal</span>\\n    <span>//</span>\\n    <span>dsbrgg@gmail.com</span>\\n  </div>\\n\\n  <hr />\\n\\n  <div class=\\\"main-info-description\\\">\\n    <span>\\n      This is a very fucking short description for you.\\n      Just so you fucking hire me and stop the fucking bullshit.\\n    </span>\\n  </div>\\n\\n  <hr />\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAIE,oBAAoB,cAAC,CAAC,AACpB,MAAM,CAAE,GAAG,AACb,CAAC,AAED,eAAe,cAAC,CAAC,AACf,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,eAAe,cAAC,CAAC,AACf,WAAW,CAAE,oBAAoB,CAAC,CAAC,OAAO,CAC1C,SAAS,CAAE,GAAG,CACd,UAAU,CAAE,MAAM,AACpB,CAAC,AAED,sBAAsB,cAAC,CAAC,AACtB,UAAU,CAAE,GAAG,CACf,aAAa,CAAE,GAAG,CAClB,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,AACnB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,EAAE,aAAa,KAAK,CAAC,AAAC,CAAC,AAC9C,sBAAsB,cAAC,CAAC,AACtB,UAAU,CAAE,GAAG,CACf,aAAa,CAAE,GAAG,CAClB,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,AACnB,CAAC,AACH,CAAC\"}"
};

const MainInfo = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css$1);

	return `<div class="${"main-info-container svelte-vcwx8e"}"><div class="${"main-info-data svelte-vcwx8e"}"><h2 id="${"main-info-name"}" class="${"svelte-vcwx8e"}">Diego Braga</h2>
    <span>Porto, Portugal</span>
    <span>//</span>
    <span>dsbrgg@gmail.com</span></div>

  <hr>

  <div class="${"main-info-description svelte-vcwx8e"}"><span>This is a very fucking short description for you.
      Just so you fucking hire me and stop the fucking bullshit.
    </span></div>

  <hr></div>`;
});

/* src/pages/resume/components/Experience.svelte generated by Svelte v3.23.2 */

const css$2 = {
	code: ".experience-title.svelte-1gkymnu{display:inline-block;font-weight:bold;font-style:italic;font-size:1.5em;padding-bottom:0.5em;margin-bottom:0.5em;border-bottom:#000000 solid 1px;color:darkgoldenrod}.experience-container.svelte-1gkymnu{display:flex;margin-top:2em;margin-left:4em;margin-right:4em;margin-bottom:4em}.experience-general.svelte-1gkymnu{display:flex;box-shadow:1px 2px 10px 1px;flex-direction:column;padding:1em;width:20em}.experience-name.svelte-1gkymnu{margin-top:0.1em}.experience-description.svelte-1gkymnu{align-self:center;margin-left:4em}.experience-description-main.svelte-1gkymnu{margin-bottom:1em}.experience-description-tech.svelte-1gkymnu{margin-top:1em}.experience-description-tech-label.svelte-1gkymnu{font-weight:100}@media(max-width: 500px), (max-height: 800px){.experience-container.svelte-1gkymnu{display:flex;flex-direction:column;margin-left:4em;margin-right:4em;margin-bottom:4em}.experience-general.svelte-1gkymnu{width:7em;margin:auto}.experience-description.svelte-1gkymnu{margin-left:0em;margin-top:2em}.experience-description-main.svelte-1gkymnu{padding-bottom:1em;border-bottom:#000000 solid 0px}}",
	map: "{\"version\":3,\"file\":\"Experience.svelte\",\"sources\":[\"Experience.svelte\"],\"sourcesContent\":[\"<script>\\n  export let first = false;\\n  export let last = false;\\n</script>\\n\\n<style>\\n  .experience-title {\\n    display: inline-block;\\n    font-weight: bold;\\n    font-style: italic;\\n    font-size: 1.5em;\\n    padding-bottom: 0.5em;\\n    margin-bottom: 0.5em;\\n    border-bottom: #000000 solid 1px;\\n    color: darkgoldenrod;\\n  }\\n\\n  .experience-container {\\n    display: flex;\\n    margin-top: 2em;\\n    margin-left: 4em;\\n    margin-right: 4em;\\n    margin-bottom: 4em;\\n  }\\n\\n  .experience-general {\\n    display: flex;\\n    box-shadow: 1px 2px 10px 1px;\\n    flex-direction: column;\\n    padding: 1em;\\n    width: 20em;\\n  }\\n\\n  .experience-name {\\n    margin-top: 0.1em;\\n  }\\n\\n  .experience-description {\\n    align-self: center;\\n    margin-left: 4em;\\n  }\\n\\n  .experience-description-main {\\n    margin-bottom: 1em;\\n  }\\n\\n  .experience-description-tech {\\n    margin-top: 1em;\\n  }\\n\\n  .experience-description-tech-label {\\n    font-weight: 100;\\n  } \\n\\n  @media (max-width: 500px), (max-height: 800px) {\\n    .experience-container {\\n      display: flex;\\n      flex-direction: column;\\n      margin-left: 4em;\\n      margin-right: 4em;\\n      margin-bottom: 4em;\\n    }\\n\\n    .experience-general {\\n      width: 7em;\\n      margin: auto;\\n    }\\n\\n    .experience-description {\\n      margin-left: 0em;\\n      margin-top: 2em;\\n    }\\n\\n    .experience-description-main {\\n      padding-bottom: 1em;\\n      border-bottom: #000000 solid 0px;\\n    }\\n  }\\n</style>\\n\\n{#if first}\\n  <span class=\\\"experience-title\\\">Experience</span>\\n{/if}\\n<div class=\\\"experience-container\\\"> \\n  <div class=\\\"experience-general\\\">\\n    <h3 class=\\\"experience-name\\\">Seegno</h3>\\n    <span>Backend Engineer</span>\\n    <span>Oct|2019 - Present</span>\\n  </div> \\n \\n  <div class=\\\"experience-description\\\">\\n    <div class=\\\"experience-description-main\\\">\\n      Huge description to make sure you understand I'm great and you should really hire me.\\n      Just trying a simple text to see how much this can handle right here.\\n    </div>\\n    <hr />\\n    <div class=\\\"experience-description-tech\\\">\\n      <b>Technologies used:</b> \\n      <span class=\\\"experience-description-tech-label\\\">\\n        tech1, tech2, tech3, tech4\\n      </span>\\n    </div>\\n  </div>   \\n</div>\\n{#if last}\\n  <hr />\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AAME,iBAAiB,eAAC,CAAC,AACjB,OAAO,CAAE,YAAY,CACrB,WAAW,CAAE,IAAI,CACjB,UAAU,CAAE,MAAM,CAClB,SAAS,CAAE,KAAK,CAChB,cAAc,CAAE,KAAK,CACrB,aAAa,CAAE,KAAK,CACpB,aAAa,CAAE,OAAO,CAAC,KAAK,CAAC,GAAG,CAChC,KAAK,CAAE,aAAa,AACtB,CAAC,AAED,qBAAqB,eAAC,CAAC,AACrB,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,GAAG,CACf,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,mBAAmB,eAAC,CAAC,AACnB,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,GAAG,CAAC,GAAG,CAAC,IAAI,CAAC,GAAG,CAC5B,cAAc,CAAE,MAAM,CACtB,OAAO,CAAE,GAAG,CACZ,KAAK,CAAE,IAAI,AACb,CAAC,AAED,gBAAgB,eAAC,CAAC,AAChB,UAAU,CAAE,KAAK,AACnB,CAAC,AAED,uBAAuB,eAAC,CAAC,AACvB,UAAU,CAAE,MAAM,CAClB,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,4BAA4B,eAAC,CAAC,AAC5B,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,4BAA4B,eAAC,CAAC,AAC5B,UAAU,CAAE,GAAG,AACjB,CAAC,AAED,kCAAkC,eAAC,CAAC,AAClC,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,EAAE,aAAa,KAAK,CAAC,AAAC,CAAC,AAC9C,qBAAqB,eAAC,CAAC,AACrB,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,mBAAmB,eAAC,CAAC,AACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,IAAI,AACd,CAAC,AAED,uBAAuB,eAAC,CAAC,AACvB,WAAW,CAAE,GAAG,CAChB,UAAU,CAAE,GAAG,AACjB,CAAC,AAED,4BAA4B,eAAC,CAAC,AAC5B,cAAc,CAAE,GAAG,CACnB,aAAa,CAAE,OAAO,CAAC,KAAK,CAAC,GAAG,AAClC,CAAC,AACH,CAAC\"}"
};

const Experience = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { first = false } = $$props;
	let { last = false } = $$props;
	if ($$props.first === void 0 && $$bindings.first && first !== void 0) $$bindings.first(first);
	if ($$props.last === void 0 && $$bindings.last && last !== void 0) $$bindings.last(last);
	$$result.css.add(css$2);

	return `${first
	? `<span class="${"experience-title svelte-1gkymnu"}">Experience</span>`
	: ``}
<div class="${"experience-container svelte-1gkymnu"}"><div class="${"experience-general svelte-1gkymnu"}"><h3 class="${"experience-name svelte-1gkymnu"}">Seegno</h3>
    <span>Backend Engineer</span>
    <span>Oct|2019 - Present</span></div> 
 
  <div class="${"experience-description svelte-1gkymnu"}"><div class="${"experience-description-main svelte-1gkymnu"}">Huge description to make sure you understand I&#39;m great and you should really hire me.
      Just trying a simple text to see how much this can handle right here.
    </div>
    <hr>
    <div class="${"experience-description-tech svelte-1gkymnu"}"><b>Technologies used:</b> 
      <span class="${"experience-description-tech-label svelte-1gkymnu"}">tech1, tech2, tech3, tech4
      </span></div></div></div>
${last ? `<hr>` : ``}`;
});

/* src/pages/resume/components/Education.svelte generated by Svelte v3.23.2 */

const css$3 = {
	code: ".education-title.svelte-xds0pg{display:inline-block;font-weight:bold;font-style:italic;font-size:1.5em;margin-top:0.7em;padding-bottom:0.5em;margin-bottom:0.5em;border-bottom:#000000 solid 1px;color:darkgoldenrod}.education-container.svelte-xds0pg{display:flex;margin-top:2em;margin-left:4em;margin-right:4em;margin-bottom:4em}.education-general.svelte-xds0pg{display:flex;box-shadow:1px 2px 10px 1px;flex-direction:column;padding:1em;width:20em}.education-name.svelte-xds0pg{margin-top:0.1em}.education-description.svelte-xds0pg{align-self:center;margin-left:4em}.education-description-main.svelte-xds0pg{margin-bottom:1em}.education-description-tech.svelte-xds0pg{margin-top:1em}.education-description-tech-label.svelte-xds0pg{font-weight:100}@media(max-width: 500px), (max-height: 800px){.education-container.svelte-xds0pg{display:flex;flex-direction:column;margin-left:4em;margin-right:4em;margin-bottom:4em}.education-general.svelte-xds0pg{width:7em;margin:auto}.education-description.svelte-xds0pg{margin-left:0em;margin-top:2em}.education-description-main.svelte-xds0pg{padding-bottom:1em;border-bottom:#000000 solid 0px}}",
	map: "{\"version\":3,\"file\":\"Education.svelte\",\"sources\":[\"Education.svelte\"],\"sourcesContent\":[\"<script>\\n  export let first = false;\\n  export let last = false;\\n</script>\\n\\n<style>\\n  .education-title {\\n    display: inline-block;\\n    font-weight: bold;\\n    font-style: italic;\\n    font-size: 1.5em;\\n    margin-top: 0.7em;\\n    padding-bottom: 0.5em;\\n    margin-bottom: 0.5em;\\n    border-bottom: #000000 solid 1px;\\n    color: darkgoldenrod;\\n  }\\n\\n  .education-container {\\n    display: flex;\\n    margin-top: 2em; \\n    margin-left: 4em;\\n    margin-right: 4em;\\n    margin-bottom: 4em;\\n  }\\n\\n  .education-general {\\n    display: flex;\\n    box-shadow: 1px 2px 10px 1px;\\n    flex-direction: column;\\n    padding: 1em;\\n    width: 20em;\\n  }\\n\\n  .education-name {\\n    margin-top: 0.1em;\\n  }\\n\\n  .education-description {\\n    align-self: center;\\n    margin-left: 4em;\\n  }\\n\\n  .education-description-main {\\n    margin-bottom: 1em;\\n  }\\n\\n  .education-description-tech {\\n    margin-top: 1em;\\n  }\\n\\n  .education-description-tech-label {\\n    font-weight: 100;\\n  }\\n\\n  @media (max-width: 500px), (max-height: 800px) {\\n    .education-container {\\n      display: flex;\\n      flex-direction: column;\\n      margin-left: 4em;\\n      margin-right: 4em;\\n      margin-bottom: 4em;\\n    }\\n\\n    .education-general {\\n      width: 7em;\\n      margin: auto;\\n    }\\n\\n    .education-description {\\n      margin-left: 0em;\\n      margin-top: 2em;\\n    }\\n\\n    .education-description-main {\\n      padding-bottom: 1em;\\n      border-bottom: #000000 solid 0px;\\n    }\\n  }\\n</style>\\n\\n{#if first}\\n  <span class=\\\"education-title\\\">Education</span>\\n{/if}\\n<div class=\\\"education-container\\\">\\n  <div class=\\\"education-general\\\">\\n    <h3 class=\\\"education-name\\\">ISLA</h3>\\n    <span>Web Development</span>\\n    <span>Sep|2017 - Incomplete</span>\\n  </div> \\n \\n  <div class=\\\"education-description\\\">\\n    <div class=\\\"education-description-main\\\">\\n      Huge description to make sure you understand I'm great and you should really hire me.\\n      Just trying a simple text to see how much this can handle right here.\\n    </div>\\n    <hr />\\n    <div class=\\\"education-description-tech\\\">\\n      <b>Technologies used:</b> \\n      <span class=\\\"education-description-tech-label\\\">\\n        tech1, tech2, tech3, tech4\\n      </span>\\n    </div>\\n  </div> \\n</div>\\n{#if last}\\n  <hr />\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AAME,gBAAgB,cAAC,CAAC,AAChB,OAAO,CAAE,YAAY,CACrB,WAAW,CAAE,IAAI,CACjB,UAAU,CAAE,MAAM,CAClB,SAAS,CAAE,KAAK,CAChB,UAAU,CAAE,KAAK,CACjB,cAAc,CAAE,KAAK,CACrB,aAAa,CAAE,KAAK,CACpB,aAAa,CAAE,OAAO,CAAC,KAAK,CAAC,GAAG,CAChC,KAAK,CAAE,aAAa,AACtB,CAAC,AAED,oBAAoB,cAAC,CAAC,AACpB,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,GAAG,CACf,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,kBAAkB,cAAC,CAAC,AAClB,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,GAAG,CAAC,GAAG,CAAC,IAAI,CAAC,GAAG,CAC5B,cAAc,CAAE,MAAM,CACtB,OAAO,CAAE,GAAG,CACZ,KAAK,CAAE,IAAI,AACb,CAAC,AAED,eAAe,cAAC,CAAC,AACf,UAAU,CAAE,KAAK,AACnB,CAAC,AAED,sBAAsB,cAAC,CAAC,AACtB,UAAU,CAAE,MAAM,CAClB,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,2BAA2B,cAAC,CAAC,AAC3B,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,2BAA2B,cAAC,CAAC,AAC3B,UAAU,CAAE,GAAG,AACjB,CAAC,AAED,iCAAiC,cAAC,CAAC,AACjC,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,EAAE,aAAa,KAAK,CAAC,AAAC,CAAC,AAC9C,oBAAoB,cAAC,CAAC,AACpB,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,kBAAkB,cAAC,CAAC,AAClB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,IAAI,AACd,CAAC,AAED,sBAAsB,cAAC,CAAC,AACtB,WAAW,CAAE,GAAG,CAChB,UAAU,CAAE,GAAG,AACjB,CAAC,AAED,2BAA2B,cAAC,CAAC,AAC3B,cAAc,CAAE,GAAG,CACnB,aAAa,CAAE,OAAO,CAAC,KAAK,CAAC,GAAG,AAClC,CAAC,AACH,CAAC\"}"
};

const Education = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { first = false } = $$props;
	let { last = false } = $$props;
	if ($$props.first === void 0 && $$bindings.first && first !== void 0) $$bindings.first(first);
	if ($$props.last === void 0 && $$bindings.last && last !== void 0) $$bindings.last(last);
	$$result.css.add(css$3);

	return `${first
	? `<span class="${"education-title svelte-xds0pg"}">Education</span>`
	: ``}
<div class="${"education-container svelte-xds0pg"}"><div class="${"education-general svelte-xds0pg"}"><h3 class="${"education-name svelte-xds0pg"}">ISLA</h3>
    <span>Web Development</span>
    <span>Sep|2017 - Incomplete</span></div> 
 
  <div class="${"education-description svelte-xds0pg"}"><div class="${"education-description-main svelte-xds0pg"}">Huge description to make sure you understand I&#39;m great and you should really hire me.
      Just trying a simple text to see how much this can handle right here.
    </div>
    <hr>
    <div class="${"education-description-tech svelte-xds0pg"}"><b>Technologies used:</b> 
      <span class="${"education-description-tech-label svelte-xds0pg"}">tech1, tech2, tech3, tech4
      </span></div></div></div>
${last ? `<hr>` : ``}`;
});

/* src/components/Ratings.svelte generated by Svelte v3.23.2 */

const Ratings = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { ratings } = $$props;
	if ($$props.ratings === void 0 && $$bindings.ratings && ratings !== void 0) $$bindings.ratings(ratings);
	return `<span>${each(Array(ratings), _ => `<i class="${"fas fa-star"}"></i>`)}</span>`;
});

/* src/pages/resume/components/Skills.svelte generated by Svelte v3.23.2 */

const css$4 = {
	code: ".skills-title.svelte-hs9aqk{display:inline-block;font-weight:bold;font-style:italic;font-size:1.5em;margin-top:0.7em;padding-bottom:0.5em;margin-bottom:0.5em;border-bottom:#000000 solid 1px;color:darkgoldenrod}.skills-container.svelte-hs9aqk{display:flex;margin-top:2em;margin-left:4em;margin-right:4em;margin-bottom:4em}.skills-list.svelte-hs9aqk{display:flex;flex-direction:column;width:50%}.skills-item.svelte-hs9aqk{margin-top:1em}@media(max-width: 500px), (max-height: 800px){.skills-container.svelte-hs9aqk{display:flex;flex-direction:column;margin-left:4em;margin-right:4em;margin-bottom:4em}.skills-list.svelte-hs9aqk{width:100%}}",
	map: "{\"version\":3,\"file\":\"Skills.svelte\",\"sources\":[\"Skills.svelte\"],\"sourcesContent\":[\"<script>\\n  import Ratings from 'components/Ratings.svelte';\\n</script>\\n\\n<style>\\n  .skills-title {\\n    display: inline-block;\\n    font-weight: bold;\\n    font-style: italic;\\n    font-size: 1.5em;\\n    margin-top: 0.7em;\\n    padding-bottom: 0.5em;\\n    margin-bottom: 0.5em;\\n    border-bottom: #000000 solid 1px;\\n    color: darkgoldenrod;\\n  }\\n\\n  .skills-container {\\n    display: flex;\\n    margin-top: 2em; \\n    margin-left: 4em;\\n    margin-right: 4em;\\n    margin-bottom: 4em;\\n  }\\n\\n  .skills-list {\\n    display: flex;\\n    flex-direction: column;\\n    width: 50%;\\n  }\\n\\n  .skills-item {\\n    margin-top: 1em;\\n  }\\n\\n  @media (max-width: 500px), (max-height: 800px) {\\n    .skills-container {\\n      display: flex;\\n      flex-direction: column;\\n      margin-left: 4em;\\n      margin-right: 4em;\\n      margin-bottom: 4em;\\n    }\\n\\n    .skills-list {\\n      width: 100%;\\n    }\\n  }\\n</style>\\n\\n<span class=\\\"skills-title\\\">Skills</span>\\n<div class=\\\"skills-container\\\">\\n  <div class=\\\"skills-list\\\">\\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span> \\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span>\\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span> \\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span>\\n  </div>\\n  <div class=\\\"skills-list\\\">\\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span> \\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span>\\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span> \\n    <span class=\\\"skills-item\\\">Javascript - <Ratings ratings={5} /> </span>\\n  </div>\\n</div>\\n<hr />\\n\"],\"names\":[],\"mappings\":\"AAKE,aAAa,cAAC,CAAC,AACb,OAAO,CAAE,YAAY,CACrB,WAAW,CAAE,IAAI,CACjB,UAAU,CAAE,MAAM,CAClB,SAAS,CAAE,KAAK,CAChB,UAAU,CAAE,KAAK,CACjB,cAAc,CAAE,KAAK,CACrB,aAAa,CAAE,KAAK,CACpB,aAAa,CAAE,OAAO,CAAC,KAAK,CAAC,GAAG,CAChC,KAAK,CAAE,aAAa,AACtB,CAAC,AAED,iBAAiB,cAAC,CAAC,AACjB,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,GAAG,CACf,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,YAAY,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,KAAK,CAAE,GAAG,AACZ,CAAC,AAED,YAAY,cAAC,CAAC,AACZ,UAAU,CAAE,GAAG,AACjB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,EAAE,aAAa,KAAK,CAAC,AAAC,CAAC,AAC9C,iBAAiB,cAAC,CAAC,AACjB,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,CACjB,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,YAAY,cAAC,CAAC,AACZ,KAAK,CAAE,IAAI,AACb,CAAC,AACH,CAAC\"}"
};

const Skills = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css$4);

	return `<span class="${"skills-title svelte-hs9aqk"}">Skills</span>
<div class="${"skills-container svelte-hs9aqk"}"><div class="${"skills-list svelte-hs9aqk"}"><span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span> 
    <span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span>
    <span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span> 
    <span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span></div>
  <div class="${"skills-list svelte-hs9aqk"}"><span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span> 
    <span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span>
    <span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span> 
    <span class="${"skills-item svelte-hs9aqk"}">Javascript - ${validate_component(Ratings, "Ratings").$$render($$result, { ratings: 5 }, {}, {})}</span></div></div>
<hr>`;
});

/* src/pages/resume/Resume.svelte generated by Svelte v3.23.2 */

const css$5 = {
	code: ".resume-container.svelte-1of3sa1{width:100%;height:100%}@media(max-width: 500px), (max-height: 800px){.resume-container.svelte-1of3sa1{display:flex;flex-direction:column;width:100%;height:100%}}",
	map: "{\"version\":3,\"file\":\"Resume.svelte\",\"sources\":[\"Resume.svelte\"],\"sourcesContent\":[\"<script>\\n  import Transition from 'components/Transition.svelte';\\n  import MainInfo from 'pages/resume/components/MainInfo.svelte';\\n  import Experience from 'pages/resume/components/Experience.svelte';\\n  import Education from 'pages/resume/components/Education.svelte';\\n  import Skills from 'pages/resume/components/Skills.svelte';\\n\\n  export let location;\\n</script>\\n\\n<style>\\n  .resume-container {\\n    width: 100%;\\n    height: 100%;\\n  }\\n\\n  @media (max-width: 500px), (max-height: 800px) {\\n    .resume-container {\\n      display: flex;\\n      flex-direction: column;\\n      width: 100%;\\n      height: 100%;\\n    }\\n  }\\n</style>\\n\\n<Transition>\\n  <div class=\\\"resume-container\\\">\\n    <MainInfo />\\n    <Experience first={true} />\\n    <Experience />\\n    <Experience last={true} />\\n    <Education first={true} last={true} />\\n    <Skills />\\n  </div>\\n</Transition>\\n\"],\"names\":[],\"mappings\":\"AAWE,iBAAiB,eAAC,CAAC,AACjB,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,AACd,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,EAAE,aAAa,KAAK,CAAC,AAAC,CAAC,AAC9C,iBAAiB,eAAC,CAAC,AACjB,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,AACd,CAAC,AACH,CAAC\"}"
};

const Resume = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { location } = $$props;
	if ($$props.location === void 0 && $$bindings.location && location !== void 0) $$bindings.location(location);
	$$result.css.add(css$5);

	return `${validate_component(Transition, "Transition").$$render($$result, {}, {}, {
		default: () => `<div class="${"resume-container svelte-1of3sa1"}">${validate_component(MainInfo, "MainInfo").$$render($$result, {}, {}, {})}
    ${validate_component(Experience, "Experience").$$render($$result, { first: true }, {}, {})}
    ${validate_component(Experience, "Experience").$$render($$result, {}, {}, {})}
    ${validate_component(Experience, "Experience").$$render($$result, { last: true }, {}, {})}
    ${validate_component(Education, "Education").$$render($$result, { first: true, last: true }, {}, {})}
    ${validate_component(Skills, "Skills").$$render($$result, {}, {}, {})}</div>`
	})}`;
});

/* src/pages/Blog.svelte generated by Svelte v3.23.2 */

const Blog = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const { test } = getContext("store");

	return `${validate_component(Transition, "Transition").$$render($$result, {}, {}, {
		default: () => `<h1>My Blog</h1>
  ${escape(test)}`
	})}`;
});

/* src/pages/Pdf.svelte generated by Svelte v3.23.2 */

const css$6 = {
	code: "#pdf-page.svelte-11ywi0t{width:100%;height:100%;position:absolute;z-index:99999999;background-color:#ffffff;text-align:center}#pdf-format.svelte-11ywi0t{display:flex;flex-direction:column;margin-left:10%;margin-right:10%}",
	map: "{\"version\":3,\"file\":\"Pdf.svelte\",\"sources\":[\"Pdf.svelte\"],\"sourcesContent\":[\"<script>\\n  import Resume from 'pages/resume/Resume.svelte';\\n</script>\\n\\n<style>\\n  #pdf-page {\\n    width: 100%;\\n    height: 100%;\\n    position: absolute;\\n    z-index: 99999999;\\n    background-color: #ffffff;\\n    text-align: center;\\n  }\\n\\n  #pdf-format {\\n    display: flex;\\n    flex-direction: column;\\n    margin-left: 10%;\\n    margin-right: 10%;\\n  }\\n</style>\\n\\n<div id=\\\"pdf-page\\\">\\n  <div id=\\\"pdf-format\\\">\\n    <Resume />\\n  </div>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAKE,SAAS,eAAC,CAAC,AACT,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,QAAQ,CACjB,gBAAgB,CAAE,OAAO,CACzB,UAAU,CAAE,MAAM,AACpB,CAAC,AAED,WAAW,eAAC,CAAC,AACX,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,GAAG,CAChB,YAAY,CAAE,GAAG,AACnB,CAAC\"}"
};

const Pdf = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css$6);
	return `<div id="${"pdf-page"}" class="${"svelte-11ywi0t"}"><div id="${"pdf-format"}" class="${"svelte-11ywi0t"}">${validate_component(Resume, "Resume").$$render($$result, {}, {}, {})}</div></div>`;
});

/* src/containers/content/Content.svelte generated by Svelte v3.23.2 */

const css$7 = {
	code: ".bg-content.svelte-5g9zn3.svelte-5g9zn3{display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%}#main-content.svelte-5g9zn3.svelte-5g9zn3{background-color:#ffffff;box-shadow:0px 0px 60px 10px;text-align:center;width:75%;height:90%}#main-nav.svelte-5g9zn3.svelte-5g9zn3{margin-top:2em;margin-bottom:2em}nav#main-nav.svelte-5g9zn3>.svelte-5g9zn3{font-weight:100;color:inherit}nav#main-nav.svelte-5g9zn3>a.svelte-5g9zn3:nth-child(1){margin-right:1em}nav#main-nav.svelte-5g9zn3>a.svelte-5g9zn3:nth-child(2){margin-right:1em}.current-content.svelte-5g9zn3.svelte-5g9zn3{height:85%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow-y:scroll}",
	map: "{\"version\":3,\"file\":\"Content.svelte\",\"sources\":[\"Content.svelte\"],\"sourcesContent\":[\"<script>\\n  import { getContext } from 'svelte';\\n  import { Route, link } from 'svelte-routing';\\n  import Home from 'pages/Home.svelte';\\n  import Resume from 'pages/resume/Resume.svelte';\\n  import Blog from 'pages/Blog.svelte';\\n  import Pdf from 'pages/Pdf.svelte';\\n\\n  const { test } = getContext('store');\\n\\n  console.log('COntent component', test)\\n</script>\\n\\n<style>\\n  .bg-content {\\n    display: flex;\\n    flex-direction: column;\\n    justify-content: center;\\n    align-items: center;\\n    height: 100%;\\n  }\\n\\n  #main-content {\\n    background-color: #ffffff;\\n    box-shadow: 0px 0px 60px 10px;\\n    text-align: center;\\n    width: 75%;\\n    height: 90%;\\n  }\\n\\n  #main-nav {\\n    margin-top: 2em;\\n    margin-bottom: 2em; \\n  }\\n\\n  nav#main-nav > * {\\n    font-weight: 100;\\n    color: inherit;\\n  }\\n\\n  nav#main-nav > a:nth-child(1) {\\n    margin-right: 1em;\\n  }\\n\\n  nav#main-nav > a:nth-child(2) {\\n    margin-right: 1em;\\n  }\\n \\n  .current-content {\\n    height: 85%;\\n    display: flex;\\n    flex-direction: column;\\n    align-items: center;\\n    justify-content: center;\\n    overflow-y: scroll;\\n  }\\n</style>\\n\\n<Route path=\\\"pdf\\\" component=\\\"{Pdf}\\\" />\\n<div class=\\\"bg-content\\\">\\n  <div id=\\\"main-content\\\">\\n    <nav id=\\\"main-nav\\\">\\n      <a href=\\\"blog\\\" use:link>Blog</a>\\n      <a href=\\\"resume\\\" use:link>Resume</a>\\n    </nav>\\n    <div class=\\\"current-content\\\">\\n      <Route path=\\\"/\\\" component=\\\"{Home}\\\" />\\n      <Route path=\\\"blog\\\" component=\\\"{Blog}\\\" />\\n      <Route path=\\\"resume\\\" component=\\\"{Resume}\\\" />\\n    </div>\\n  </div>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAcE,WAAW,4BAAC,CAAC,AACX,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,CACnB,MAAM,CAAE,IAAI,AACd,CAAC,AAED,aAAa,4BAAC,CAAC,AACb,gBAAgB,CAAE,OAAO,CACzB,UAAU,CAAE,GAAG,CAAC,GAAG,CAAC,IAAI,CAAC,IAAI,CAC7B,UAAU,CAAE,MAAM,CAClB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACb,CAAC,AAED,SAAS,4BAAC,CAAC,AACT,UAAU,CAAE,GAAG,CACf,aAAa,CAAE,GAAG,AACpB,CAAC,AAED,GAAG,uBAAS,CAAG,cAAE,CAAC,AAChB,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,AAChB,CAAC,AAED,GAAG,uBAAS,CAAG,eAAC,WAAW,CAAC,CAAC,AAAC,CAAC,AAC7B,YAAY,CAAE,GAAG,AACnB,CAAC,AAED,GAAG,uBAAS,CAAG,eAAC,WAAW,CAAC,CAAC,AAAC,CAAC,AAC7B,YAAY,CAAE,GAAG,AACnB,CAAC,AAED,gBAAgB,4BAAC,CAAC,AAChB,MAAM,CAAE,GAAG,CACX,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,MAAM,CACnB,eAAe,CAAE,MAAM,CACvB,UAAU,CAAE,MAAM,AACpB,CAAC\"}"
};

const Content = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const { test } = getContext("store");
	console.log("COntent component", test);
	$$result.css.add(css$7);

	return `${validate_component(Route, "Route").$$render($$result, { path: "pdf", component: Pdf }, {}, {})}
<div class="${"bg-content svelte-5g9zn3"}"><div id="${"main-content"}" class="${"svelte-5g9zn3"}"><nav id="${"main-nav"}" class="${"svelte-5g9zn3"}"><a href="${"blog"}" class="${"svelte-5g9zn3"}">Blog</a>
      <a href="${"resume"}" class="${"svelte-5g9zn3"}">Resume</a></nav>
    <div class="${"current-content svelte-5g9zn3"}">${validate_component(Route, "Route").$$render($$result, { path: "/", component: Home }, {}, {})}
      ${validate_component(Route, "Route").$$render($$result, { path: "blog", component: Blog }, {}, {})}
      ${validate_component(Route, "Route").$$render($$result, { path: "resume", component: Resume }, {}, {})}</div></div></div>`;
});

/* src/containers/background/Canvas.svelte generated by Svelte v3.23.2 */

const css$8 = {
	code: "#bg-canvas.svelte-1u0ci20{height:100%}",
	map: "{\"version\":3,\"file\":\"Canvas.svelte\",\"sources\":[\"Canvas.svelte\"],\"sourcesContent\":[\"<script>\\n\\timport { onMount } from \\\"svelte\\\";\\n\\n\\texport let sketch;\\n\\t\\n  onMount(function() {\\n\\t  new p5(sketch, 'bg-canvas');\\n\\t});\\n</script>\\n\\n<style>\\n  #bg-canvas {\\n    height: 100%;\\n  }\\n</style>\\n\\n<div id='bg-canvas'></div>\\n\"],\"names\":[],\"mappings\":\"AAWE,UAAU,eAAC,CAAC,AACV,MAAM,CAAE,IAAI,AACd,CAAC\"}"
};

const Canvas = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { sketch } = $$props;

	onMount(function () {
		new p5(sketch, "bg-canvas");
	});

	if ($$props.sketch === void 0 && $$bindings.sketch && sketch !== void 0) $$bindings.sketch(sketch);
	$$result.css.add(css$8);
	return `<div id="${"bg-canvas"}" class="${"svelte-1u0ci20"}"></div>`;
});

/* src/containers/background/Background.svelte generated by Svelte v3.23.2 */

const css$9 = {
	code: ".bg-container.svelte-1ud6vvd{position:absolute;z-index:-99999;width:100%;height:100%;margin:0}",
	map: "{\"version\":3,\"file\":\"Background.svelte\",\"sources\":[\"Background.svelte\"],\"sourcesContent\":[\"<script>\\n  import Canvas from 'containers/background/Canvas.svelte';\\n  \\nconst sketch = p5 => {\\n    const barWidth = 10;\\n    let lastBar = -1;\\n\\n    p5.setup = () => {\\n      const {\\n        displayWidth: width, \\n        displayHeight: height, \\n        HSB\\n      } = p5;\\n\\n      p5.createCanvas(width, height);\\n      p5.colorMode(HSB, height, height, height);\\n      p5.background(255);\\n    };\\n\\n    p5.windowResize = () => {\\n      const {\\n        displayWidth: width, \\n        displayHeight: height\\n      } = p5;\\n\\n      p5.resizeCanvas(width, height);\\n    };\\n\\n    p5.draw = () => {\\n      const {\\n        displayHeight: height, \\n        mouseX, \\n        mouseY\\n      } = p5;\\n\\n      let whichBar = mouseX / barWidth;\\n      \\n      if (whichBar !== lastBar) {\\n        let barX = whichBar * barWidth;\\n\\n        p5.noStroke();\\n        p5.fill(mouseY, height, height);\\n        p5.rect(barX, 0, height, height);\\n\\n        lastBar = whichBar;\\n      }\\n    };\\n  }; \\n</script>\\n\\n<style>\\n  .bg-container {\\n    position: absolute;\\n    z-index: -99999;\\n    width: 100%;\\n    height: 100%;\\n    margin: 0;\\n  }\\n</style>\\n\\n<div class=\\\"bg-container\\\">\\n  <Canvas sketch={sketch} />\\n</div>\\n\"],\"names\":[],\"mappings\":\"AAmDE,aAAa,eAAC,CAAC,AACb,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,MAAM,CACf,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,MAAM,CAAE,CAAC,AACX,CAAC\"}"
};

const Background = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const sketch = p5 => {
		const barWidth = 10;
		let lastBar = -1;

		p5.setup = () => {
			const { displayWidth: width, displayHeight: height, HSB } = p5;
			p5.createCanvas(width, height);
			p5.colorMode(HSB, height, height, height);
			p5.background(255);
		};

		p5.windowResize = () => {
			const { displayWidth: width, displayHeight: height } = p5;
			p5.resizeCanvas(width, height);
		};

		p5.draw = () => {
			const { displayHeight: height, mouseX, mouseY } = p5;
			let whichBar = mouseX / barWidth;

			if (whichBar !== lastBar) {
				let barX = whichBar * barWidth;
				p5.noStroke();
				p5.fill(mouseY, height, height);
				p5.rect(barX, 0, height, height);
				lastBar = whichBar;
			}
		};
	};

	$$result.css.add(css$9);
	return `<div class="${"bg-container svelte-1ud6vvd"}">${validate_component(Canvas, "Canvas").$$render($$result, { sketch }, {}, {})}</div>`;
});

/* src/App.svelte generated by Svelte v3.23.2 */

const App = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { url } = $$props;
	let { test } = $$props;
	const store = writable({ test });
	setContext("store", store);
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);
	if ($$props.test === void 0 && $$bindings.test && test !== void 0) $$bindings.test(test);

	return `${validate_component(Router, "Router").$$render($$result, { url }, {}, {
		default: () => `${validate_component(Background, "Background").$$render($$result, {}, {}, {})}
  ${validate_component(Content, "Content").$$render($$result, {}, {}, {})}`
	})}`;
});

module.exports = App;
//# sourceMappingURL=ssr.js.map
