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
    padding-top: 1em;
    padding-bottom: 1em;
    margin-bottom: 1em;
    border-bottom: 1px solid #000000;
  }

  nav#main-nav > * {
    font-weight: 100;
    color: inherit;
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
{:else}
  <div class="bg-content">
    <div id="main-content">
      <nav id="main-nav">
        <a href="/" use:link>home</a>
        <span>//</span>
        <!-- <a href="blog" use:link>blog</a>
        <span>//</span> -->
        <a href="resume" use:link>resume</a>
      </nav>
      <div class="current-content">
        <Route path="/" component="{Home}" />
        <!-- <Route path="blog" component="{Blog}" /> -->
        <Route path="resume" component="{Resume}" />
      </div>
    </div>
  </div>
{/if}
