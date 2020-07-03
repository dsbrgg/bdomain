<script>
  import { getContext, onDestroy } from 'svelte';
  import Transition from 'components/Transition.svelte';
  import MainInfo from 'pages/resume/components/MainInfo.svelte';
  import Experience from 'pages/resume/components/Experience.svelte';
  import Education from 'pages/resume/components/Education.svelte';
  import Skills from 'pages/resume/components/Skills.svelte';

  export let location;

  let data;

  const store = getContext('initialState');
  const unsubscribe = store.subscribe(({ 
    mainInfo, 
    experience,
    education,
    skills
  }) => { 
    data = { 
      mainInfo,
      experience,
      education,
      skills
    }; 
  });

  onDestroy(() => { unsubscribe(); });
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
    <MainInfo {...data.mainInfo} />
    {#each data.experience as experience}
      <Experience {...experience} />
    {/each}
    {#each data.education as education}
      <Education {...education} />
    {/each}
    <Skills skills={data.skills} />
  </div>
</Transition>
