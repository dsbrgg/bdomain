<script>
  import Experience from 'pages/resume/components/Experience.svelte';
  import MainInfo from 'pages/resume/components/MainInfo.svelte';

  export let location;
</script>

<style>
  .resume-container {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 500px), (max-height: 800px) {
    .resume-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
  }
</style>

<div class="resume-container">
  <MainInfo />
  <Experience />
  <Experience />
  <Experience />
  <Experience />
</div>
