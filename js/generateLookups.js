const MATERIAL_W = 106;
const MATERIAL_H = 106;
const MATERIAL_W_COUNT = 5;
const MATERIAL_H_COUNT = 5;
const MATERIALS_FRAME = {
  1280: {
      SX: 83,                               // TOP LEFT
      SY: 105,                              // TOP RIGHT
      SW: MATERIAL_W * MATERIAL_W_COUNT,    // WIDTH
      SH: MATERIAL_H * MATERIAL_H_COUNT,    // HEIGHT
  },
};
const MATERIAL_W_PADDING = 23;
const MATERIAL_H_PADDING = 23;
const MATERIAL_W_CROPPED = MATERIAL_W - MATERIAL_W_PADDING * 2;
const MATERIAL_H_CROPPED = MATERIAL_H - MATERIAL_H_PADDING * 2;
const PIXEL_R = 0;
const PIXEL_G = 1;
const PIXEL_B = 2;
const PIXEL_A = 3;
const PIXEL_WIDTH = 4;

const itemLookups = localStorage.getItem('itemLookups', []);

let trainingImg;


ImageData.prototype.getPixel = function (x, y) {
  // IMPORTANT: there was a bug in the code. Swapping these values worked.
  const i = (y * PIXEL_WIDTH) + (x * this.width * PIXEL_WIDTH);
  return [
    this.data[i + 0],
    this.data[i + 1],
    this.data[i + 2],
    this.data[i + 3],
  ];
}


function generateLookups() {

    const img = new Image();
    img.onload = function() {
        // Make a canvas so we can process the image
        const canvas     = document.createElement('canvas');
        canvas.height  = img.height;
        canvas.width   = img.width;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        // Crop the image into just the materials section
        const trim = MATERIALS_FRAME[img.width];
        if (!trim) {
            throw `Invalid image dimensions ${img.width}x${img.height}`;
        }

        const pixels = (
            canvas
            .getContext('2d')
            .getImageData(trim.SX, trim.SY, trim.SW, trim.SH)
        );

        // This goes through our 5x5 grid and isolates each material (25 total)
        for(let i = 0; i < 25; i++) {
          // New image that will display the single material
          const mat = new ImageData(MATERIAL_W_CROPPED, MATERIAL_H_CROPPED);
          // Translate "i" to a material on the grid, going from l->r u->d
          const [x, y] = [i % 5, Math.floor(i / 5)];
          // Get the starting point "(sx, sy)" of the material
          const sx = (MATERIAL_W * x) + MATERIAL_W_PADDING;
          const sy = (MATERIAL_H * y) + MATERIAL_H_PADDING;
          // Go through all the pixels that belong to that material
          let matPtr = 0;
          for(let j = 0; j < MATERIAL_W_CROPPED; j++) {
            for(let k = 0; k < MATERIAL_H_CROPPED; k++) {
              const pixel = pixels.getPixel(sx + j, sy + k);
              // Write pixel to new image
              while (pixel.length) {
                mat.data[matPtr] = pixel.shift();
                matPtr++;
              }
            }
          }

          // Paint the cropped image on the canvas
          const displayCanvas = document.getElementById(`training${i}`);
          displayCanvas.height = MATERIAL_W_CROPPED;
          displayCanvas.width = MATERIAL_H_CROPPED;
          displayCanvas.getContext('2d').putImageData(mat, 0, 0);
        }

        // TODO
        console.log('onload')
        trainingImg = pixels;
        console.log(pixels);

        // Display image
        const displayCanvas = document.getElementById('training');
        // repaint the image on the canvas
        displayCanvas.height = trim.SH;
        displayCanvas.width = trim.SW;
        console.log(displayCanvas)
        displayCanvas.getContext('2d').putImageData(pixels, 0, 0);

    };
    img.src = "./media/answers/img.JPG";
    console.log('running');
}
console.log('running');
generateLookups();
