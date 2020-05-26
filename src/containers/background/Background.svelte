<script>
  import Canvas from 'containers/background/Canvas.svelte';

  const sketch = p5 => {
    p5.setup = () => {
      const {windowWidth, windowHeight} = p5;
      p5.createCanvas(windowWidth, windowHeight);
    };

    p5.windowResize = () => {
      const {windowWidth, windowHeight} = p5;
      p5.resizeCanvas(windowWidth, windowHeight);
    };

    p5.draw = () => {
      const {windowWidth, windowHeight} = p5;

      p5.background(127);
      p5.noStroke();

      // for (let i = 0; i < windowHeight; i += 20) {
      //   p5.fill(129, 206, 15);
      //   p5.rect(0, i, windowWidth, 10);
      //   p5.fill(255);
      //   p5.rect(i, 0, 10, windowHeight);
      // }
    };
  }; 
</script>

<style>
  .bg-container {
    position: absolute;
    z-index: -99999;
    width: 100%;
    height: 100%;
  }
</style>

<div class="bg-container">
  <Canvas sketch={sketch} />
</div>
