var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                const remove = [];
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j++];
                    if (!attributes[attribute.name]) {
                        remove.push(attribute.name);
                    }
                }
                for (let k = 0; k < remove.length; k++) {
                    node.removeAttribute(remove[k]);
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
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
    const { navigate } = globalHistory;

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

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    function hostMatches(anchor) {
      const host = location.host;
      return (
        anchor.host == host ||
        // svelte seems to kill anchor.host value in ie11, so fall back to checking href
        anchor.href.indexOf(`https://${host}`) === 0 ||
        anchor.href.indexOf(`http://${host}`) === 0
      )
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.23.2 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(10, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(9, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(8, $base = value));

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

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$base,
    		$location,
    		$routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 256) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 1536) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [routes, location, base, basepath, url, $$scope, $$slots];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.23.2 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 2,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[1],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, routeParams, $location*/ 530) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[1],
    		/*routeProps*/ ctx[2]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 22)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 2 && get_spread_object(/*routeParams*/ ctx[1]),
    					dirty & /*routeProps*/ 4 && get_spread_object(/*routeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

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

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Route", $$slots, ['default']);

    	$$self.$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(1, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(2, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(1, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(2, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          hostMatches(anchor) &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname + anchor.search, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    /* src/pages/Home.svelte generated by Svelte v3.23.2 */

    const file = "src/pages/Home.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let p0;
    	let t2;
    	let t3;
    	let p1;
    	let t4;
    	let t5;
    	let p2;
    	let t6;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text("Hello World!");
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Thanks for visiting my webpage.");
    			t3 = space();
    			p1 = element("p");
    			t4 = text("You can checkout my resume through the tab above.");
    			t5 = space();
    			p2 = element("p");
    			t6 = text("Have a good one! :)");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			h1 = claim_element(div_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Hello World!");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(div_nodes);
    			p0 = claim_element(div_nodes, "P", {});
    			var p0_nodes = children(p0);
    			t2 = claim_text(p0_nodes, "Thanks for visiting my webpage.");
    			p0_nodes.forEach(detach_dev);
    			t3 = claim_space(div_nodes);
    			p1 = claim_element(div_nodes, "P", {});
    			var p1_nodes = children(p1);
    			t4 = claim_text(p1_nodes, "You can checkout my resume through the tab above.");
    			p1_nodes.forEach(detach_dev);
    			t5 = claim_space(div_nodes);
    			p2 = claim_element(div_nodes, "P", {});
    			var p2_nodes = children(p2);
    			t6 = claim_text(p2_nodes, "Have a good one! :)");
    			p2_nodes.forEach(detach_dev);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file, 5, 2, 51);
    			add_location(p0, file, 7, 2, 76);
    			add_location(p1, file, 8, 2, 117);
    			add_location(p2, file, 9, 2, 176);
    			add_location(div, file, 4, 0, 43);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(p0, t2);
    			append_dev(div, t3);
    			append_dev(div, p1);
    			append_dev(p1, t4);
    			append_dev(div, t5);
    			append_dev(div, p2);
    			append_dev(p2, t6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { location } = $$props;
    	const writable_props = ["location"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    	};

    	$$self.$capture_state = () => ({ location });

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [location];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { location: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[0] === undefined && !("location" in props)) {
    			console.warn("<Home> was created without expected prop 'location'");
    		}
    	}

    	get location() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/components/Transition.svelte generated by Svelte v3.23.2 */
    const file$1 = "src/components/Transition.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let div_intro;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if (default_slot) default_slot.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "svelte-8sihx2");
    			add_location(div, file$1, 10, 0, 112);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fade, { duration: 1000 });
    					div_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Transition> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Transition", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ fade });
    	return [$$scope, $$slots];
    }

    class Transition extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Transition",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/pages/resume/components/MainInfo.svelte generated by Svelte v3.23.2 */

    const file$2 = "src/pages/resume/components/MainInfo.svelte";

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t0;
    	let t1;
    	let span0;
    	let t2;
    	let t3;
    	let span1;
    	let t4;
    	let t5;
    	let span2;
    	let t6;
    	let t7;
    	let hr0;
    	let t8;
    	let div1;
    	let span3;
    	let t9;
    	let t10;
    	let hr1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text("Diego Braga");
    			t1 = space();
    			span0 = element("span");
    			t2 = text("Porto, Portugal");
    			t3 = space();
    			span1 = element("span");
    			t4 = text("//");
    			t5 = space();
    			span2 = element("span");
    			t6 = text("dsbrgg@gmail.com");
    			t7 = space();
    			hr0 = element("hr");
    			t8 = space();
    			div1 = element("div");
    			span3 = element("span");
    			t9 = text("This is a very fucking short description for you.\n      Just so you fucking hire me and stop the fucking bullshit.");
    			t10 = space();
    			hr1 = element("hr");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div2 = claim_element(nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			div0 = claim_element(div2_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			h2 = claim_element(div0_nodes, "H2", { id: true, class: true });
    			var h2_nodes = children(h2);
    			t0 = claim_text(h2_nodes, "Diego Braga");
    			h2_nodes.forEach(detach_dev);
    			t1 = claim_space(div0_nodes);
    			span0 = claim_element(div0_nodes, "SPAN", {});
    			var span0_nodes = children(span0);
    			t2 = claim_text(span0_nodes, "Porto, Portugal");
    			span0_nodes.forEach(detach_dev);
    			t3 = claim_space(div0_nodes);
    			span1 = claim_element(div0_nodes, "SPAN", {});
    			var span1_nodes = children(span1);
    			t4 = claim_text(span1_nodes, "//");
    			span1_nodes.forEach(detach_dev);
    			t5 = claim_space(div0_nodes);
    			span2 = claim_element(div0_nodes, "SPAN", {});
    			var span2_nodes = children(span2);
    			t6 = claim_text(span2_nodes, "dsbrgg@gmail.com");
    			span2_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			t7 = claim_space(div2_nodes);
    			hr0 = claim_element(div2_nodes, "HR", {});
    			t8 = claim_space(div2_nodes);
    			div1 = claim_element(div2_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			span3 = claim_element(div1_nodes, "SPAN", {});
    			var span3_nodes = children(span3);
    			t9 = claim_text(span3_nodes, "This is a very fucking short description for you.\n      Just so you fucking hire me and stop the fucking bullshit.");
    			span3_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			t10 = claim_space(div2_nodes);
    			hr1 = claim_element(div2_nodes, "HR", {});
    			div2_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h2, "id", "main-info-name");
    			attr_dev(h2, "class", "svelte-vcwx8e");
    			add_location(h2, file$2, 37, 4, 631);
    			add_location(span0, file$2, 38, 4, 676);
    			add_location(span1, file$2, 39, 4, 709);
    			add_location(span2, file$2, 40, 4, 729);
    			attr_dev(div0, "class", "main-info-data svelte-vcwx8e");
    			add_location(div0, file$2, 36, 2, 598);
    			add_location(hr0, file$2, 43, 2, 771);
    			add_location(span3, file$2, 46, 4, 821);
    			attr_dev(div1, "class", "main-info-description svelte-vcwx8e");
    			add_location(div1, file$2, 45, 2, 781);
    			add_location(hr1, file$2, 52, 2, 973);
    			attr_dev(div2, "class", "main-info-container svelte-vcwx8e");
    			add_location(div2, file$2, 35, 0, 562);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(div0, t1);
    			append_dev(div0, span0);
    			append_dev(span0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(span1, t4);
    			append_dev(div0, t5);
    			append_dev(div0, span2);
    			append_dev(span2, t6);
    			append_dev(div2, t7);
    			append_dev(div2, hr0);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			append_dev(div1, span3);
    			append_dev(span3, t9);
    			append_dev(div2, t10);
    			append_dev(div2, hr1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MainInfo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MainInfo", $$slots, []);
    	return [];
    }

    class MainInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MainInfo",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/pages/resume/components/Experience.svelte generated by Svelte v3.23.2 */

    const file$3 = "src/pages/resume/components/Experience.svelte";

    // (81:0) {#if first}
    function create_if_block_1$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Experience");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Experience");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "experience-title svelte-1gkymnu");
    			add_location(span, file$3, 81, 2, 1427);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(81:0) {#if first}",
    		ctx
    	});

    	return block;
    }

    // (105:0) {#if last}
    function create_if_block$1(ctx) {
    	let hr;

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			this.h();
    		},
    		l: function claim(nodes) {
    			hr = claim_element(nodes, "HR", {});
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(hr, file$3, 105, 2, 2180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(105:0) {#if last}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let t0;
    	let div4;
    	let div0;
    	let h3;
    	let t1;
    	let t2;
    	let span0;
    	let t3;
    	let t4;
    	let span1;
    	let t5;
    	let t6;
    	let div3;
    	let div1;
    	let t7;
    	let t8;
    	let hr;
    	let t9;
    	let div2;
    	let b;
    	let t10;
    	let t11;
    	let span2;
    	let t12;
    	let t13;
    	let if_block1_anchor;
    	let if_block0 = /*first*/ ctx[0] && create_if_block_1$1(ctx);
    	let if_block1 = /*last*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t1 = text("Seegno");
    			t2 = space();
    			span0 = element("span");
    			t3 = text("Backend Engineer");
    			t4 = space();
    			span1 = element("span");
    			t5 = text("Oct|2019 - Present");
    			t6 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t7 = text("Huge description to make sure you understand I'm great and you should really hire me.\n      Just trying a simple text to see how much this can handle right here.");
    			t8 = space();
    			hr = element("hr");
    			t9 = space();
    			div2 = element("div");
    			b = element("b");
    			t10 = text("Technologies used:");
    			t11 = space();
    			span2 = element("span");
    			t12 = text("tech1, tech2, tech3, tech4");
    			t13 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			this.h();
    		},
    		l: function claim(nodes) {
    			if (if_block0) if_block0.l(nodes);
    			t0 = claim_space(nodes);
    			div4 = claim_element(nodes, "DIV", { class: true });
    			var div4_nodes = children(div4);
    			div0 = claim_element(div4_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			h3 = claim_element(div0_nodes, "H3", { class: true });
    			var h3_nodes = children(h3);
    			t1 = claim_text(h3_nodes, "Seegno");
    			h3_nodes.forEach(detach_dev);
    			t2 = claim_space(div0_nodes);
    			span0 = claim_element(div0_nodes, "SPAN", {});
    			var span0_nodes = children(span0);
    			t3 = claim_text(span0_nodes, "Backend Engineer");
    			span0_nodes.forEach(detach_dev);
    			t4 = claim_space(div0_nodes);
    			span1 = claim_element(div0_nodes, "SPAN", {});
    			var span1_nodes = children(span1);
    			t5 = claim_text(span1_nodes, "Oct|2019 - Present");
    			span1_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			t6 = claim_space(div4_nodes);
    			div3 = claim_element(div4_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			div1 = claim_element(div3_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			t7 = claim_text(div1_nodes, "Huge description to make sure you understand I'm great and you should really hire me.\n      Just trying a simple text to see how much this can handle right here.");
    			div1_nodes.forEach(detach_dev);
    			t8 = claim_space(div3_nodes);
    			hr = claim_element(div3_nodes, "HR", {});
    			t9 = claim_space(div3_nodes);
    			div2 = claim_element(div3_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			b = claim_element(div2_nodes, "B", {});
    			var b_nodes = children(b);
    			t10 = claim_text(b_nodes, "Technologies used:");
    			b_nodes.forEach(detach_dev);
    			t11 = claim_space(div2_nodes);
    			span2 = claim_element(div2_nodes, "SPAN", { class: true });
    			var span2_nodes = children(span2);
    			t12 = claim_text(span2_nodes, "tech1, tech2, tech3, tech4");
    			span2_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			div4_nodes.forEach(detach_dev);
    			t13 = claim_space(nodes);
    			if (if_block1) if_block1.l(nodes);
    			if_block1_anchor = empty();
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h3, "class", "experience-name svelte-1gkymnu");
    			add_location(h3, file$3, 85, 4, 1557);
    			add_location(span0, file$3, 86, 4, 1601);
    			add_location(span1, file$3, 87, 4, 1635);
    			attr_dev(div0, "class", "experience-general svelte-1gkymnu");
    			add_location(div0, file$3, 84, 2, 1520);
    			attr_dev(div1, "class", "experience-description-main svelte-1gkymnu");
    			add_location(div1, file$3, 91, 4, 1722);
    			add_location(hr, file$3, 95, 4, 1947);
    			add_location(b, file$3, 97, 6, 2006);
    			attr_dev(span2, "class", "experience-description-tech-label svelte-1gkymnu");
    			add_location(span2, file$3, 98, 6, 2039);
    			attr_dev(div2, "class", "experience-description-tech svelte-1gkymnu");
    			add_location(div2, file$3, 96, 4, 1958);
    			attr_dev(div3, "class", "experience-description svelte-1gkymnu");
    			add_location(div3, file$3, 90, 2, 1681);
    			attr_dev(div4, "class", "experience-container svelte-1gkymnu");
    			add_location(div4, file$3, 83, 0, 1482);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t1);
    			append_dev(div0, t2);
    			append_dev(div0, span0);
    			append_dev(span0, t3);
    			append_dev(div0, t4);
    			append_dev(div0, span1);
    			append_dev(span1, t5);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t7);
    			append_dev(div3, t8);
    			append_dev(div3, hr);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, b);
    			append_dev(b, t10);
    			append_dev(div2, t11);
    			append_dev(div2, span2);
    			append_dev(span2, t12);
    			insert_dev(target, t13, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*first*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*last*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t13);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { first = false } = $$props;
    	let { last = false } = $$props;
    	const writable_props = ["first", "last"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Experience> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Experience", $$slots, []);

    	$$self.$set = $$props => {
    		if ("first" in $$props) $$invalidate(0, first = $$props.first);
    		if ("last" in $$props) $$invalidate(1, last = $$props.last);
    	};

    	$$self.$capture_state = () => ({ first, last });

    	$$self.$inject_state = $$props => {
    		if ("first" in $$props) $$invalidate(0, first = $$props.first);
    		if ("last" in $$props) $$invalidate(1, last = $$props.last);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [first, last];
    }

    class Experience extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { first: 0, last: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Experience",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get first() {
    		throw new Error("<Experience>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<Experience>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<Experience>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<Experience>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/resume/components/Education.svelte generated by Svelte v3.23.2 */

    const file$4 = "src/pages/resume/components/Education.svelte";

    // (82:0) {#if first}
    function create_if_block_1$2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Education");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Education");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "education-title svelte-xds0pg");
    			add_location(span, file$4, 82, 2, 1438);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(82:0) {#if first}",
    		ctx
    	});

    	return block;
    }

    // (106:0) {#if last}
    function create_if_block$2(ctx) {
    	let hr;

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			this.h();
    		},
    		l: function claim(nodes) {
    			hr = claim_element(nodes, "HR", {});
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(hr, file$4, 106, 2, 2179);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(106:0) {#if last}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let t0;
    	let div4;
    	let div0;
    	let h3;
    	let t1;
    	let t2;
    	let span0;
    	let t3;
    	let t4;
    	let span1;
    	let t5;
    	let t6;
    	let div3;
    	let div1;
    	let t7;
    	let t8;
    	let hr;
    	let t9;
    	let div2;
    	let b;
    	let t10;
    	let t11;
    	let span2;
    	let t12;
    	let t13;
    	let if_block1_anchor;
    	let if_block0 = /*first*/ ctx[0] && create_if_block_1$2(ctx);
    	let if_block1 = /*last*/ ctx[1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t1 = text("ISLA");
    			t2 = space();
    			span0 = element("span");
    			t3 = text("Web Development");
    			t4 = space();
    			span1 = element("span");
    			t5 = text("Sep|2017 - Incomplete");
    			t6 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t7 = text("Huge description to make sure you understand I'm great and you should really hire me.\n      Just trying a simple text to see how much this can handle right here.");
    			t8 = space();
    			hr = element("hr");
    			t9 = space();
    			div2 = element("div");
    			b = element("b");
    			t10 = text("Technologies used:");
    			t11 = space();
    			span2 = element("span");
    			t12 = text("tech1, tech2, tech3, tech4");
    			t13 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			this.h();
    		},
    		l: function claim(nodes) {
    			if (if_block0) if_block0.l(nodes);
    			t0 = claim_space(nodes);
    			div4 = claim_element(nodes, "DIV", { class: true });
    			var div4_nodes = children(div4);
    			div0 = claim_element(div4_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			h3 = claim_element(div0_nodes, "H3", { class: true });
    			var h3_nodes = children(h3);
    			t1 = claim_text(h3_nodes, "ISLA");
    			h3_nodes.forEach(detach_dev);
    			t2 = claim_space(div0_nodes);
    			span0 = claim_element(div0_nodes, "SPAN", {});
    			var span0_nodes = children(span0);
    			t3 = claim_text(span0_nodes, "Web Development");
    			span0_nodes.forEach(detach_dev);
    			t4 = claim_space(div0_nodes);
    			span1 = claim_element(div0_nodes, "SPAN", {});
    			var span1_nodes = children(span1);
    			t5 = claim_text(span1_nodes, "Sep|2017 - Incomplete");
    			span1_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			t6 = claim_space(div4_nodes);
    			div3 = claim_element(div4_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			div1 = claim_element(div3_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			t7 = claim_text(div1_nodes, "Huge description to make sure you understand I'm great and you should really hire me.\n      Just trying a simple text to see how much this can handle right here.");
    			div1_nodes.forEach(detach_dev);
    			t8 = claim_space(div3_nodes);
    			hr = claim_element(div3_nodes, "HR", {});
    			t9 = claim_space(div3_nodes);
    			div2 = claim_element(div3_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			b = claim_element(div2_nodes, "B", {});
    			var b_nodes = children(b);
    			t10 = claim_text(b_nodes, "Technologies used:");
    			b_nodes.forEach(detach_dev);
    			t11 = claim_space(div2_nodes);
    			span2 = claim_element(div2_nodes, "SPAN", { class: true });
    			var span2_nodes = children(span2);
    			t12 = claim_text(span2_nodes, "tech1, tech2, tech3, tech4");
    			span2_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			div4_nodes.forEach(detach_dev);
    			t13 = claim_space(nodes);
    			if (if_block1) if_block1.l(nodes);
    			if_block1_anchor = empty();
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h3, "class", "education-name svelte-xds0pg");
    			add_location(h3, file$4, 86, 4, 1563);
    			add_location(span0, file$4, 87, 4, 1604);
    			add_location(span1, file$4, 88, 4, 1637);
    			attr_dev(div0, "class", "education-general svelte-xds0pg");
    			add_location(div0, file$4, 85, 2, 1527);
    			attr_dev(div1, "class", "education-description-main svelte-xds0pg");
    			add_location(div1, file$4, 92, 4, 1726);
    			add_location(hr, file$4, 96, 4, 1950);
    			add_location(b, file$4, 98, 6, 2008);
    			attr_dev(span2, "class", "education-description-tech-label svelte-xds0pg");
    			add_location(span2, file$4, 99, 6, 2041);
    			attr_dev(div2, "class", "education-description-tech svelte-xds0pg");
    			add_location(div2, file$4, 97, 4, 1961);
    			attr_dev(div3, "class", "education-description svelte-xds0pg");
    			add_location(div3, file$4, 91, 2, 1686);
    			attr_dev(div4, "class", "education-container svelte-xds0pg");
    			add_location(div4, file$4, 84, 0, 1491);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t1);
    			append_dev(div0, t2);
    			append_dev(div0, span0);
    			append_dev(span0, t3);
    			append_dev(div0, t4);
    			append_dev(div0, span1);
    			append_dev(span1, t5);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t7);
    			append_dev(div3, t8);
    			append_dev(div3, hr);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, b);
    			append_dev(b, t10);
    			append_dev(div2, t11);
    			append_dev(div2, span2);
    			append_dev(span2, t12);
    			insert_dev(target, t13, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*first*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*last*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t13);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { first = false } = $$props;
    	let { last = false } = $$props;
    	const writable_props = ["first", "last"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Education> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Education", $$slots, []);

    	$$self.$set = $$props => {
    		if ("first" in $$props) $$invalidate(0, first = $$props.first);
    		if ("last" in $$props) $$invalidate(1, last = $$props.last);
    	};

    	$$self.$capture_state = () => ({ first, last });

    	$$self.$inject_state = $$props => {
    		if ("first" in $$props) $$invalidate(0, first = $$props.first);
    		if ("last" in $$props) $$invalidate(1, last = $$props.last);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [first, last];
    }

    class Education extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { first: 0, last: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Education",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get first() {
    		throw new Error("<Education>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<Education>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<Education>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<Education>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Ratings.svelte generated by Svelte v3.23.2 */

    const file$5 = "src/components/Ratings.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (9:2) {#each Array(ratings) as _}
    function create_each_block(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			this.h();
    		},
    		l: function claim(nodes) {
    			i = claim_element(nodes, "I", { class: true });
    			children(i).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(i, "class", "fas fa-star");
    			add_location(i, file$5, 9, 4, 101);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(9:2) {#each Array(ratings) as _}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let span;
    	let each_value = Array(/*ratings*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			span = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", {});
    			var span_nodes = children(span);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(span_nodes);
    			}

    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(span, file$5, 7, 0, 60);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ratings*/ 1) {
    				const old_length = each_value.length;
    				each_value = Array(/*ratings*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = old_length; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (!each_blocks[i]) {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(span, null);
    					}
    				}

    				for (i = each_value.length; i < old_length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { ratings } = $$props;
    	const writable_props = ["ratings"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ratings> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Ratings", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ratings" in $$props) $$invalidate(0, ratings = $$props.ratings);
    	};

    	$$self.$capture_state = () => ({ ratings });

    	$$self.$inject_state = $$props => {
    		if ("ratings" in $$props) $$invalidate(0, ratings = $$props.ratings);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ratings];
    }

    class Ratings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { ratings: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ratings",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ratings*/ ctx[0] === undefined && !("ratings" in props)) {
    			console.warn("<Ratings> was created without expected prop 'ratings'");
    		}
    	}

    	get ratings() {
    		throw new Error("<Ratings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ratings(value) {
    		throw new Error("<Ratings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/resume/components/Skills.svelte generated by Svelte v3.23.2 */
    const file$6 = "src/pages/resume/components/Skills.svelte";

    function create_fragment$8(ctx) {
    	let span0;
    	let t0;
    	let t1;
    	let div2;
    	let div0;
    	let span1;
    	let t2;
    	let ratings0;
    	let t3;
    	let span2;
    	let t4;
    	let ratings1;
    	let t5;
    	let span3;
    	let t6;
    	let ratings2;
    	let t7;
    	let span4;
    	let t8;
    	let ratings3;
    	let t9;
    	let div1;
    	let span5;
    	let t10;
    	let ratings4;
    	let t11;
    	let span6;
    	let t12;
    	let ratings5;
    	let t13;
    	let span7;
    	let t14;
    	let ratings6;
    	let t15;
    	let span8;
    	let t16;
    	let ratings7;
    	let t17;
    	let hr;
    	let current;
    	ratings0 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings1 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings2 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings3 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings4 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings5 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings6 = new Ratings({ props: { ratings: 5 }, $$inline: true });
    	ratings7 = new Ratings({ props: { ratings: 5 }, $$inline: true });

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			t0 = text("Skills");
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			span1 = element("span");
    			t2 = text("Javascript - ");
    			create_component(ratings0.$$.fragment);
    			t3 = space();
    			span2 = element("span");
    			t4 = text("Javascript - ");
    			create_component(ratings1.$$.fragment);
    			t5 = space();
    			span3 = element("span");
    			t6 = text("Javascript - ");
    			create_component(ratings2.$$.fragment);
    			t7 = space();
    			span4 = element("span");
    			t8 = text("Javascript - ");
    			create_component(ratings3.$$.fragment);
    			t9 = space();
    			div1 = element("div");
    			span5 = element("span");
    			t10 = text("Javascript - ");
    			create_component(ratings4.$$.fragment);
    			t11 = space();
    			span6 = element("span");
    			t12 = text("Javascript - ");
    			create_component(ratings5.$$.fragment);
    			t13 = space();
    			span7 = element("span");
    			t14 = text("Javascript - ");
    			create_component(ratings6.$$.fragment);
    			t15 = space();
    			span8 = element("span");
    			t16 = text("Javascript - ");
    			create_component(ratings7.$$.fragment);
    			t17 = space();
    			hr = element("hr");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span0 = claim_element(nodes, "SPAN", { class: true });
    			var span0_nodes = children(span0);
    			t0 = claim_text(span0_nodes, "Skills");
    			span0_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			div2 = claim_element(nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			div0 = claim_element(div2_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			span1 = claim_element(div0_nodes, "SPAN", { class: true });
    			var span1_nodes = children(span1);
    			t2 = claim_text(span1_nodes, "Javascript - ");
    			claim_component(ratings0.$$.fragment, span1_nodes);
    			span1_nodes.forEach(detach_dev);
    			t3 = claim_space(div0_nodes);
    			span2 = claim_element(div0_nodes, "SPAN", { class: true });
    			var span2_nodes = children(span2);
    			t4 = claim_text(span2_nodes, "Javascript - ");
    			claim_component(ratings1.$$.fragment, span2_nodes);
    			span2_nodes.forEach(detach_dev);
    			t5 = claim_space(div0_nodes);
    			span3 = claim_element(div0_nodes, "SPAN", { class: true });
    			var span3_nodes = children(span3);
    			t6 = claim_text(span3_nodes, "Javascript - ");
    			claim_component(ratings2.$$.fragment, span3_nodes);
    			span3_nodes.forEach(detach_dev);
    			t7 = claim_space(div0_nodes);
    			span4 = claim_element(div0_nodes, "SPAN", { class: true });
    			var span4_nodes = children(span4);
    			t8 = claim_text(span4_nodes, "Javascript - ");
    			claim_component(ratings3.$$.fragment, span4_nodes);
    			span4_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			t9 = claim_space(div2_nodes);
    			div1 = claim_element(div2_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			span5 = claim_element(div1_nodes, "SPAN", { class: true });
    			var span5_nodes = children(span5);
    			t10 = claim_text(span5_nodes, "Javascript - ");
    			claim_component(ratings4.$$.fragment, span5_nodes);
    			span5_nodes.forEach(detach_dev);
    			t11 = claim_space(div1_nodes);
    			span6 = claim_element(div1_nodes, "SPAN", { class: true });
    			var span6_nodes = children(span6);
    			t12 = claim_text(span6_nodes, "Javascript - ");
    			claim_component(ratings5.$$.fragment, span6_nodes);
    			span6_nodes.forEach(detach_dev);
    			t13 = claim_space(div1_nodes);
    			span7 = claim_element(div1_nodes, "SPAN", { class: true });
    			var span7_nodes = children(span7);
    			t14 = claim_text(span7_nodes, "Javascript - ");
    			claim_component(ratings6.$$.fragment, span7_nodes);
    			span7_nodes.forEach(detach_dev);
    			t15 = claim_space(div1_nodes);
    			span8 = claim_element(div1_nodes, "SPAN", { class: true });
    			var span8_nodes = children(span8);
    			t16 = claim_text(span8_nodes, "Javascript - ");
    			claim_component(ratings7.$$.fragment, span8_nodes);
    			span8_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			t17 = claim_space(nodes);
    			hr = claim_element(nodes, "HR", {});
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span0, "class", "skills-title svelte-hs9aqk");
    			add_location(span0, file$6, 50, 0, 869);
    			attr_dev(span1, "class", "skills-item svelte-hs9aqk");
    			add_location(span1, file$6, 53, 4, 973);
    			attr_dev(span2, "class", "skills-item svelte-hs9aqk");
    			add_location(span2, file$6, 54, 4, 1049);
    			attr_dev(span3, "class", "skills-item svelte-hs9aqk");
    			add_location(span3, file$6, 55, 4, 1124);
    			attr_dev(span4, "class", "skills-item svelte-hs9aqk");
    			add_location(span4, file$6, 56, 4, 1200);
    			attr_dev(div0, "class", "skills-list svelte-hs9aqk");
    			add_location(div0, file$6, 52, 2, 943);
    			attr_dev(span5, "class", "skills-item svelte-hs9aqk");
    			add_location(span5, file$6, 59, 4, 1312);
    			attr_dev(span6, "class", "skills-item svelte-hs9aqk");
    			add_location(span6, file$6, 60, 4, 1388);
    			attr_dev(span7, "class", "skills-item svelte-hs9aqk");
    			add_location(span7, file$6, 61, 4, 1463);
    			attr_dev(span8, "class", "skills-item svelte-hs9aqk");
    			add_location(span8, file$6, 62, 4, 1539);
    			attr_dev(div1, "class", "skills-list svelte-hs9aqk");
    			add_location(div1, file$6, 58, 2, 1282);
    			attr_dev(div2, "class", "skills-container svelte-hs9aqk");
    			add_location(div2, file$6, 51, 0, 910);
    			add_location(hr, file$6, 65, 0, 1626);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			append_dev(span0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			mount_component(ratings0, span1, null);
    			append_dev(div0, t3);
    			append_dev(div0, span2);
    			append_dev(span2, t4);
    			mount_component(ratings1, span2, null);
    			append_dev(div0, t5);
    			append_dev(div0, span3);
    			append_dev(span3, t6);
    			mount_component(ratings2, span3, null);
    			append_dev(div0, t7);
    			append_dev(div0, span4);
    			append_dev(span4, t8);
    			mount_component(ratings3, span4, null);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div1, span5);
    			append_dev(span5, t10);
    			mount_component(ratings4, span5, null);
    			append_dev(div1, t11);
    			append_dev(div1, span6);
    			append_dev(span6, t12);
    			mount_component(ratings5, span6, null);
    			append_dev(div1, t13);
    			append_dev(div1, span7);
    			append_dev(span7, t14);
    			mount_component(ratings6, span7, null);
    			append_dev(div1, t15);
    			append_dev(div1, span8);
    			append_dev(span8, t16);
    			mount_component(ratings7, span8, null);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, hr, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(ratings0.$$.fragment, local);
    			transition_in(ratings1.$$.fragment, local);
    			transition_in(ratings2.$$.fragment, local);
    			transition_in(ratings3.$$.fragment, local);
    			transition_in(ratings4.$$.fragment, local);
    			transition_in(ratings5.$$.fragment, local);
    			transition_in(ratings6.$$.fragment, local);
    			transition_in(ratings7.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(ratings0.$$.fragment, local);
    			transition_out(ratings1.$$.fragment, local);
    			transition_out(ratings2.$$.fragment, local);
    			transition_out(ratings3.$$.fragment, local);
    			transition_out(ratings4.$$.fragment, local);
    			transition_out(ratings5.$$.fragment, local);
    			transition_out(ratings6.$$.fragment, local);
    			transition_out(ratings7.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			destroy_component(ratings0);
    			destroy_component(ratings1);
    			destroy_component(ratings2);
    			destroy_component(ratings3);
    			destroy_component(ratings4);
    			destroy_component(ratings5);
    			destroy_component(ratings6);
    			destroy_component(ratings7);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Skills> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Skills", $$slots, []);
    	$$self.$capture_state = () => ({ Ratings });
    	return [];
    }

    class Skills extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skills",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/pages/resume/Resume.svelte generated by Svelte v3.23.2 */
    const file$7 = "src/pages/resume/Resume.svelte";

    // (27:0) <Transition>
    function create_default_slot(ctx) {
    	let div;
    	let maininfo;
    	let t0;
    	let experience0;
    	let t1;
    	let experience1;
    	let t2;
    	let experience2;
    	let t3;
    	let education;
    	let t4;
    	let skills;
    	let current;
    	maininfo = new MainInfo({ $$inline: true });
    	experience0 = new Experience({ props: { first: true }, $$inline: true });
    	experience1 = new Experience({ $$inline: true });
    	experience2 = new Experience({ props: { last: true }, $$inline: true });

    	education = new Education({
    			props: { first: true, last: true },
    			$$inline: true
    		});

    	skills = new Skills({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(maininfo.$$.fragment);
    			t0 = space();
    			create_component(experience0.$$.fragment);
    			t1 = space();
    			create_component(experience1.$$.fragment);
    			t2 = space();
    			create_component(experience2.$$.fragment);
    			t3 = space();
    			create_component(education.$$.fragment);
    			t4 = space();
    			create_component(skills.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			claim_component(maininfo.$$.fragment, div_nodes);
    			t0 = claim_space(div_nodes);
    			claim_component(experience0.$$.fragment, div_nodes);
    			t1 = claim_space(div_nodes);
    			claim_component(experience1.$$.fragment, div_nodes);
    			t2 = claim_space(div_nodes);
    			claim_component(experience2.$$.fragment, div_nodes);
    			t3 = claim_space(div_nodes);
    			claim_component(education.$$.fragment, div_nodes);
    			t4 = claim_space(div_nodes);
    			claim_component(skills.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "resume-container svelte-1of3sa1");
    			add_location(div, file$7, 27, 2, 637);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(maininfo, div, null);
    			append_dev(div, t0);
    			mount_component(experience0, div, null);
    			append_dev(div, t1);
    			mount_component(experience1, div, null);
    			append_dev(div, t2);
    			mount_component(experience2, div, null);
    			append_dev(div, t3);
    			mount_component(education, div, null);
    			append_dev(div, t4);
    			mount_component(skills, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(maininfo.$$.fragment, local);
    			transition_in(experience0.$$.fragment, local);
    			transition_in(experience1.$$.fragment, local);
    			transition_in(experience2.$$.fragment, local);
    			transition_in(education.$$.fragment, local);
    			transition_in(skills.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(maininfo.$$.fragment, local);
    			transition_out(experience0.$$.fragment, local);
    			transition_out(experience1.$$.fragment, local);
    			transition_out(experience2.$$.fragment, local);
    			transition_out(education.$$.fragment, local);
    			transition_out(skills.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(maininfo);
    			destroy_component(experience0);
    			destroy_component(experience1);
    			destroy_component(experience2);
    			destroy_component(education);
    			destroy_component(skills);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(27:0) <Transition>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let transition;
    	let current;

    	transition = new Transition({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(transition.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(transition.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(transition, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const transition_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				transition_changes.$$scope = { dirty, ctx };
    			}

    			transition.$set(transition_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(transition.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(transition.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(transition, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { location } = $$props;
    	const writable_props = ["location"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Resume> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Resume", $$slots, []);

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    	};

    	$$self.$capture_state = () => ({
    		Transition,
    		MainInfo,
    		Experience,
    		Education,
    		Skills,
    		location
    	});

    	$$self.$inject_state = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [location];
    }

    class Resume extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { location: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Resume",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[0] === undefined && !("location" in props)) {
    			console.warn("<Resume> was created without expected prop 'location'");
    		}
    	}

    	get location() {
    		throw new Error("<Resume>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Resume>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Blog.svelte generated by Svelte v3.23.2 */
    const file$8 = "src/pages/Blog.svelte";

    // (8:0) <Transition>
    function create_default_slot$1(ctx) {
    	let h1;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("My Blog");
    			t1 = space();
    			t2 = text(/*test*/ ctx[0]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			h1 = claim_element(nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "My Blog");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			t2 = claim_text(nodes, /*test*/ ctx[0]);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$8, 8, 2, 172);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(8:0) <Transition>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let transition;
    	let current;

    	transition = new Transition({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(transition.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(transition.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(transition, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const transition_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				transition_changes.$$scope = { dirty, ctx };
    			}

    			transition.$set(transition_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(transition.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(transition.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(transition, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const { test } = getContext("store");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Blog> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Blog", $$slots, []);
    	$$self.$capture_state = () => ({ getContext, Transition, test });
    	return [test];
    }

    class Blog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Blog",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/pages/Pdf.svelte generated by Svelte v3.23.2 */
    const file$9 = "src/pages/Pdf.svelte";

    function create_fragment$b(ctx) {
    	let div1;
    	let div0;
    	let resume;
    	let current;
    	resume = new Resume({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(resume.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div1 = claim_element(nodes, "DIV", { id: true, class: true });
    			var div1_nodes = children(div1);
    			div0 = claim_element(div1_nodes, "DIV", { id: true, class: true });
    			var div0_nodes = children(div0);
    			claim_component(resume.$$.fragment, div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div0, "id", "pdf-format");
    			attr_dev(div0, "class", "svelte-11ywi0t");
    			add_location(div0, file$9, 23, 2, 379);
    			attr_dev(div1, "id", "pdf-page");
    			attr_dev(div1, "class", "svelte-11ywi0t");
    			add_location(div1, file$9, 22, 0, 357);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(resume, div0, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(resume.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(resume.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(resume);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Pdf> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Pdf", $$slots, []);
    	$$self.$capture_state = () => ({ Resume });
    	return [];
    }

    class Pdf extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pdf",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/containers/content/Content.svelte generated by Svelte v3.23.2 */

    const { console: console_1 } = globals;
    const file$a = "src/containers/content/Content.svelte";

    function create_fragment$c(ctx) {
    	let route0;
    	let t0;
    	let div2;
    	let div1;
    	let nav;
    	let a0;
    	let t1;
    	let link_action;
    	let t2;
    	let a1;
    	let t3;
    	let link_action_1;
    	let t4;
    	let div0;
    	let route1;
    	let t5;
    	let route2;
    	let t6;
    	let route3;
    	let current;
    	let mounted;
    	let dispose;

    	route0 = new Route({
    			props: { path: "pdf", component: Pdf },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "blog", component: Blog },
    			$$inline: true
    		});

    	route3 = new Route({
    			props: { path: "resume", component: Resume },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			nav = element("nav");
    			a0 = element("a");
    			t1 = text("Blog");
    			t2 = space();
    			a1 = element("a");
    			t3 = text("Resume");
    			t4 = space();
    			div0 = element("div");
    			create_component(route1.$$.fragment);
    			t5 = space();
    			create_component(route2.$$.fragment);
    			t6 = space();
    			create_component(route3.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			claim_component(route0.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			div2 = claim_element(nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			div1 = claim_element(div2_nodes, "DIV", { id: true, class: true });
    			var div1_nodes = children(div1);
    			nav = claim_element(div1_nodes, "NAV", { id: true, class: true });
    			var nav_nodes = children(nav);
    			a0 = claim_element(nav_nodes, "A", { href: true, class: true });
    			var a0_nodes = children(a0);
    			t1 = claim_text(a0_nodes, "Blog");
    			a0_nodes.forEach(detach_dev);
    			t2 = claim_space(nav_nodes);
    			a1 = claim_element(nav_nodes, "A", { href: true, class: true });
    			var a1_nodes = children(a1);
    			t3 = claim_text(a1_nodes, "Resume");
    			a1_nodes.forEach(detach_dev);
    			nav_nodes.forEach(detach_dev);
    			t4 = claim_space(div1_nodes);
    			div0 = claim_element(div1_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			claim_component(route1.$$.fragment, div0_nodes);
    			t5 = claim_space(div0_nodes);
    			claim_component(route2.$$.fragment, div0_nodes);
    			t6 = claim_space(div0_nodes);
    			claim_component(route3.$$.fragment, div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			div1_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(a0, "href", "blog");
    			attr_dev(a0, "class", "svelte-5g9zn3");
    			add_location(a0, file$a, 62, 6, 1208);
    			attr_dev(a1, "href", "resume");
    			attr_dev(a1, "class", "svelte-5g9zn3");
    			add_location(a1, file$a, 63, 6, 1247);
    			attr_dev(nav, "id", "main-nav");
    			attr_dev(nav, "class", "svelte-5g9zn3");
    			add_location(nav, file$a, 61, 4, 1182);
    			attr_dev(div0, "class", "current-content svelte-5g9zn3");
    			add_location(div0, file$a, 65, 4, 1299);
    			attr_dev(div1, "id", "main-content");
    			attr_dev(div1, "class", "svelte-5g9zn3");
    			add_location(div1, file$a, 60, 2, 1154);
    			attr_dev(div2, "class", "bg-content svelte-5g9zn3");
    			add_location(div2, file$a, 59, 0, 1127);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, nav);
    			append_dev(nav, a0);
    			append_dev(a0, t1);
    			append_dev(nav, t2);
    			append_dev(nav, a1);
    			append_dev(a1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			mount_component(route1, div0, null);
    			append_dev(div0, t5);
    			mount_component(route2, div0, null);
    			append_dev(div0, t6);
    			mount_component(route3, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link_action = link.call(null, a0)),
    					action_destroyer(link_action_1 = link.call(null, a1))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			destroy_component(route1);
    			destroy_component(route2);
    			destroy_component(route3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	const { test } = getContext("store");
    	console.log("COntent component", test);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Content> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Content", $$slots, []);

    	$$self.$capture_state = () => ({
    		getContext,
    		Route,
    		link,
    		Home,
    		Resume,
    		Blog,
    		Pdf,
    		test
    	});

    	return [];
    }

    class Content extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Content",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/containers/background/Canvas.svelte generated by Svelte v3.23.2 */
    const file$b = "src/containers/background/Canvas.svelte";

    function create_fragment$d(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { id: true, class: true });
    			children(div).forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "id", "bg-canvas");
    			attr_dev(div, "class", "svelte-1u0ci20");
    			add_location(div, file$b, 16, 0, 193);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { sketch } = $$props;

    	onMount(function () {
    		new p5(sketch, "bg-canvas");
    	});

    	const writable_props = ["sketch"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", $$slots, []);

    	$$self.$set = $$props => {
    		if ("sketch" in $$props) $$invalidate(0, sketch = $$props.sketch);
    	};

    	$$self.$capture_state = () => ({ onMount, sketch });

    	$$self.$inject_state = $$props => {
    		if ("sketch" in $$props) $$invalidate(0, sketch = $$props.sketch);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [sketch];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { sketch: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*sketch*/ ctx[0] === undefined && !("sketch" in props)) {
    			console.warn("<Canvas> was created without expected prop 'sketch'");
    		}
    	}

    	get sketch() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sketch(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/containers/background/Background.svelte generated by Svelte v3.23.2 */
    const file$c = "src/containers/background/Background.svelte";

    function create_fragment$e(ctx) {
    	let div;
    	let canvas;
    	let current;

    	canvas = new Canvas({
    			props: { sketch: /*sketch*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(canvas.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			claim_component(canvas.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "bg-container svelte-1ud6vvd");
    			add_location(div, file$c, 60, 0, 1094);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(canvas, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(canvas);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
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

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Background> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Background", $$slots, []);
    	$$self.$capture_state = () => ({ Canvas, sketch });
    	return [sketch];
    }

    class Background extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Background",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.23.2 */

    // (17:0) <Router url="{url}">
    function create_default_slot$2(ctx) {
    	let background;
    	let t;
    	let content;
    	let current;
    	background = new Background({ $$inline: true });
    	content = new Content({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(background.$$.fragment);
    			t = space();
    			create_component(content.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(background.$$.fragment, nodes);
    			t = claim_space(nodes);
    			claim_component(content.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(background, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(content, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(background.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(background.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(background, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(content, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(17:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(router.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 8) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { url } = $$props;
    	let { test } = $$props;
    	const store = writable({ test });
    	setContext("store", store);
    	const writable_props = ["url", "test"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("test" in $$props) $$invalidate(1, test = $$props.test);
    	};

    	$$self.$capture_state = () => ({
    		setContext,
    		writable,
    		Router,
    		Content,
    		Background,
    		url,
    		test,
    		store
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("test" in $$props) $$invalidate(1, test = $$props.test);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url, test];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { url: 0, test: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$f.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*url*/ ctx[0] === undefined && !("url" in props)) {
    			console.warn("<App> was created without expected prop 'url'");
    		}

    		if (/*test*/ ctx[1] === undefined && !("test" in props)) {
    			console.warn("<App> was created without expected prop 'test'");
    		}
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get test() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set test(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var app = new App({
    	target: document.body,
      hydrate: true,
      props: window.__PRELOADED_STATE__
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
