// Each material is 106x106 pixels
const MATERIAL_W = 106;
const MATERIAL_H = 106;
// There are 5x5 materials: 25 total.
const MATERIAL_W_COUNT = 5;
const MATERIAL_H_COUNT = 5;
// Key: image width
// Value: cropped dimensions that only shows the 5x5 grid of materials
const MATERIALS_FRAME = {
  1280: {
      SX: 83,                               // TOP LEFT
      SY: 105,                              // TOP RIGHT
      SW: MATERIAL_W * MATERIAL_W_COUNT,    // WIDTH
      SH: MATERIAL_H * MATERIAL_H_COUNT,    // HEIGHT
  },
};
// Inside each 106x106 pixel square, there should be an additional 23px of
// padding to further isolate the material icon.
const MATERIAL_W_PADDING = 23;
const MATERIAL_H_PADDING = 23;
// The total computed height and width of the material icon.
const MATERIAL_W_CROPPED = MATERIAL_W - MATERIAL_W_PADDING * 2;
const MATERIAL_H_CROPPED = MATERIAL_H - MATERIAL_H_PADDING * 2;
// Each pixel consists of 4 total values modeled in an array of length 4.
const PIXEL_WIDTH = 4;  // RGBA

const itemLookups = localStorage.getItem('itemLookups', []);


/*
 * Getting a pixel from ImageData is a little messy, so here is a helper
 * function to make things a little easier.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData
 */
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

/*
 * Takes image and generates a lookup matrix for each material in the image.
 *
 * See steps:
 *   - 0.A: Load the image (pt1)
 *   - 0.B: Load the image (pt2)
 *   - 1: Make a canvas so we can process the training image
 *   - 2: Crop the image into just the materials section
 *   - 3: Go through our 5x5 grid and isolate each material (25 total)
 *   - TODO: Transform the image into a lookup matrix
 *   - TEMPORARY DEBUG: Display image
 */
function generateLookups(imgSrc) {

    // 0.A: Load the image
    const img = new Image();
    img.onload = function() {

        ///////////////////////////////////////////////////////////////////////
        // 1: Make a canvas so we can process the training image
        const canvas     = document.createElement('canvas');
        canvas.height  = img.height;
        canvas.width   = img.width;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        ///////////////////////////////////////////////////////////////////////
        // 2: Crop the image into just the materials section
        const trim = MATERIALS_FRAME[img.width];
        if (!trim) {
            throw `Invalid image dimensions ${img.width}x${img.height}`;
        }
        const pixels = (
            canvas
            .getContext('2d')
            .getImageData(trim.SX, trim.SY, trim.SW, trim.SH)
        );

        ///////////////////////////////////////////////////////////////////////
        // 3: Go through our 5x5 grid and isolate each material (25 total)
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

        ///////////////////////////////////////////////////////////////////////
        // TODO: Transform the image into a lookup matrix

        ///////////////////////////////////////////////////////////////////////
        // TEMPORARY DEBUG: Display image
        const displayCanvas = document.getElementById('training');
        // repaint the image on the canvas
        displayCanvas.height = trim.SH;
        displayCanvas.width = trim.SW;
        displayCanvas.getContext('2d').putImageData(pixels, 0, 0);

    };

    // 0.B: Load the image
    img.src = imgSrc;
}

// "Run main"
generateLookups("./media/answers/img.JPG");
