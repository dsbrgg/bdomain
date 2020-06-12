<script>
  import Resume from 'pages/resume/Resume.svelte';
</script>

<style>
  #pdf-page {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 99999999;
    background-color: #ffffff;
    text-align: center;
  }

  #pdf-format {
    display: flex;
    flex-direction: column;
    margin-left: 10%;
    margin-right: 10%;
  }
</style>

<div id="pdf-page">
  <div id="pdf-format">
    <Resume />
  </div>
</div>
