<script>
  import { Router, Link, Route } from "svelte-routing";
  import Home from "pages/Home.svelte";
  import Resume from "pages/Resume.svelte";
  import Blog from "pages/Blog.svelte";
  import Background from 'containers/background/Background.svelte';
</script>

<Router>
  <Background />
  <nav>
    <Link to="/">Home</Link>
    <Link to="blog">Blog</Link>
    <Link to="resume">Resume</Link>
  </nav>
  <div>
    <Route path="/" component="{Home}" />
    <Route path="blog" component="{Blog}" />
    <Route path="resume" component="{Resume}" />
  </div>
</Router>
