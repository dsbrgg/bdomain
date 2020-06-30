<script>
  import Canvas from 'containers/background/Canvas.svelte';
  
const sketch = p5 => {
    const barWidth = 10;
    let lastBar = -1;

    p5.setup = () => {
      const {
        displayWidth: width, 
        displayHeight: height, 
        HSB
      } = p5;

      p5.createCanvas(width, height);
      p5.colorMode(HSB, height, height, height);
      p5.background(255);
    };

    p5.windowResize = () => {
      const {
        displayWidth: width, 
        displayHeight: height
      } = p5;

      p5.resizeCanvas(width, height);
    };

    p5.draw = () => {
      const {
        displayHeight: height, 
        mouseX, 
        mouseY
      } = p5;

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
</script>

<style>
  .bg-container {
    position: absolute;
    z-index: -99999;
    width: 100%;
    height: 100%;
    margin: 0;
  }
</style>

<div class="bg-container">
  <Canvas sketch={sketch} />
</div>
