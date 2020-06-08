<script>
  import Transition from 'components/Transition.svelte';
  import MainInfo from 'pages/resume/components/MainInfo.svelte';
  import Experience from 'pages/resume/components/Experience.svelte';
  import Education from 'pages/resume/components/Education.svelte';
  import Skills from 'pages/resume/components/Skills.svelte';

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

<Transition>
  <div class="resume-container">
    <MainInfo />
    <Experience first={true} />
    <Experience />
    <Experience last={true} />
    <Education first={true} last={true} />
    <Skills />
    <button>Click</button>
  </div>
</Transition>
