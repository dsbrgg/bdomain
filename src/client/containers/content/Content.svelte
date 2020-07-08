<script>
  import { Route, link } from 'svelte-routing';
  import Home from 'pages/Home.svelte';
  import Resume from 'pages/resume/Resume.svelte';
  import Blog from 'pages/Blog.svelte';
  import Pdf from 'pages/Pdf.svelte';

  export let saveFile;
</script>

<style>
  .bg-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  #main-content {
    background-color: #ffffff;
    box-shadow: 0px 0px 60px 10px;
    text-align: center;
    width: 90%;
    height: 90%;
  }

  #main-nav {
    margin-top: 2em;
    margin-bottom: 2em; 
  }

  nav#main-nav > * {
    font-weight: 100;
    color: inherit;
  }

  nav#main-nav > a:nth-child(1) {
    margin-right: 1em;
  }

  nav#main-nav > a:nth-child(2) {
    margin-right: 1em;
  }
 
  .current-content {
    height: 85%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow-y: scroll;
  }
</style>

{#if saveFile}
  <Route path="pdf" component="{Pdf}" />
{/if}

{#if !saveFile}
  <div class="bg-content">
    <div id="main-content">
      <nav id="main-nav">
        <a href="blog" use:link>Blog</a>
        <a href="resume" use:link>Resume</a>
      </nav>
      <div class="current-content">
        <Route path="/" component="{Home}" />
        <Route path="blog" component="{Blog}" />
        <Route path="resume" component="{Resume}" />
      </div>
    </div>
  </div>
{/if}
