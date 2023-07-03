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
// The matrix lookup needs a size
const MATRIX_WIDTH = 10;
const MATRIX_HEIGHT = 10;
// Any score less than this will qualify as a match between a source image
// material and a matrix representation of a material.
const SCORE_CUTOFF = 1000;

const MATERIALS_ALREADY_ONSCREEN = new Set();


/*
 * Getting a pixel from ImageData is a little messy, so here is a helper
 * function to make things a little easier.
 *
 * In addition to getting the pixel, it "rounds" the color to black or white
 * if the color value is already "pretty close" to one of those colors.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData
 */
ImageData.prototype.getRoundedPixel = function (x, y) {
  // IMPORTANT: there was a bug in the code. Swapping these values worked.
  const i = (y * PIXEL_WIDTH) + (x * this.width * PIXEL_WIDTH);
  let [r, g, b, a] = [
    this.data[i + 0],
    this.data[i + 1],
    this.data[i + 2],
    this.data[i + 3],
  ]
  if ([r, g, b].every(v => v < 64)) {
    r = g = b = 0;
  }
  if ([r, g, b].every(v => v > 255 - 64)) {
    r = g = b = 0;
  }
  return [r, g, b, a];
}


/*
 * Similar to getting a pixel from ImageData, this sets a pixel to ImageData
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData
 */
ImageData.prototype.setPixel = function (x, y, pix) {
  // IMPORTANT: there was a bug in the code. Swapping these values worked.
  const i = (y * PIXEL_WIDTH) + (x * this.width * PIXEL_WIDTH);
  this.data[i + 0] = pix[0];
  this.data[i + 1] = pix[1];
  this.data[i + 2] = pix[2];
  this.data[i + 3] = pix[3];
}

/*
 * Give this function a matrix representation of a material and determine if
 * there are any potential matches.
 *
 * NOTE: Ideally there is exactly 1 match; however, there could be multiple or
 *       none.
 */
function getMatches(inputMatrix) {
  const scoresLookup = JSON.parse(JSON.stringify(MATRIX_LOOKUP));
  for(const [mat, matMatrix] of Object.entries(scoresLookup)) {
    let score = 0;
    for(let y = 0; y < inputMatrix.length; y++) {
      for(let x = 0; x < inputMatrix[y].length; x++) {
        score += (
          Math.abs(inputMatrix[y][x][0] - matMatrix[y][x][0]) +
          Math.abs(inputMatrix[y][x][1] - matMatrix[y][x][1]) +
          Math.abs(inputMatrix[y][x][2] - matMatrix[y][x][2]) +
          Math.abs(inputMatrix[y][x][3] - matMatrix[y][x][3])
        );
      }
    }
    scoresLookup[mat] = score;
  }
  console.log(scoresLookup)
  return Object.entries(scoresLookup).filter(arr => arr[1] < SCORE_CUTOFF);
}


/*
 * Takes image and generates a lookup matrix for each material in the image.
 *
 * See steps:
 *   - 0.A: Load the image (pt1)
 *   - 0.B: Load the image (pt2)
 *   - 1: Make a canvas so we can process the training image
 *   - 2: Crop the image into just the materials section
 *   - 3: Go through the 5x5 grid and isolate each mat (material, 25 total)
 *   - 4: Transform the image into a lookup matrix
 *   - 5: Visualize lookup matrix
 *   - 6: See if there is already a match
 *   - 7: Display results and log the lookup matrix
 */
function processImageOnLoad() {

    ///////////////////////////////////////////////////////////////////////
    // 1: Make a canvas so we can process the training image
    const canvas = document.createElement('canvas');
    canvas.height = this.height;
    canvas.width = this.width;
    canvas.getContext('2d').drawImage(this, 0, 0, canvas.width, canvas.height);

    ///////////////////////////////////////////////////////////////////////
    // 2: Crop the image into just the materials section
    const trim = MATERIALS_FRAME[this.width];
    if (!trim) {
      throw `Invalid image dimensions ${this.width}x${this.height}`;
    }
    const pixels = (
      canvas
      .getContext('2d')
      .getImageData(trim.SX, trim.SY, trim.SW, trim.SH)
    );

    for(let i = 0; i < 25; i++) {

      /////////////////////////////////////////////////////////////////////
      // 3: Go through the 5x5 grid and isolate each mat
      //    (material, 25 total)
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
          const pixel = pixels.getRoundedPixel(sx + j, sy + k);
          // Write pixel to new image
          while (pixel.length) {
            mat.data[matPtr] = pixel.shift();
            matPtr++;
          }
        }
      }

      /////////////////////////////////////////////////////////////////////
      // 4: Transform the image into a lookup matrix
      const subImgPixWidth = Math.floor(MATERIAL_W_CROPPED / MATRIX_WIDTH);
      const subImgPixHeight = Math.floor(MATERIAL_H_CROPPED / MATRIX_HEIGHT);
      const generatedItemLookup = [];

      // Go through and initialize each matrix lookup (4x4)
      for(let k = 0; k < MATRIX_HEIGHT; k++) {
        if (!generatedItemLookup[k]) generatedItemLookup[k] = [];
        for(let j = 0; j < MATRIX_WIDTH; j++) {
          generatedItemLookup[k][j] = [0, 0, 0, 0];  // PIXEL_WIDTH

          // Now go through each matrix portion of the mat image.
          const xDelta = subImgPixWidth * j;
          const yDelta = subImgPixHeight * k;
          let count = 0;
          for(let a = 0; a < subImgPixWidth; a++) {
            for(let b = 0; b < subImgPixHeight; b++) {
              const tPix = mat.getRoundedPixel(xDelta + a, yDelta + b);
              // PIXEL_WIDTH
              generatedItemLookup[k][j][0] += tPix[0];
              generatedItemLookup[k][j][1] += tPix[1];
              generatedItemLookup[k][j][2] += tPix[2];
              generatedItemLookup[k][j][3] += tPix[3];
              count += 1;
            }
          }
          generatedItemLookup[k][j][0] /= count;
          generatedItemLookup[k][j][1] /= count;
          generatedItemLookup[k][j][2] /= count;
          generatedItemLookup[k][j][3] /= count;
        }
      }

      /////////////////////////////////////////////////////////////////////
      // 5: Visualize lookup matrix
      const matrix = new ImageData(MATERIAL_W_CROPPED, MATERIAL_H_CROPPED);
      for(let j = 0; j < MATERIAL_W_CROPPED; j++) {
        for(let k = 0; k < MATERIAL_H_CROPPED; k++) {
          const pixel = matrix.setPixel(j, k, generatedItemLookup[4][4]);
        }
      }

      /////////////////////////////////////////////////////////////////////
      // 6: See if there is already a match
      const matches = getMatches(generatedItemLookup);

      /////////////////////////////////////////////////////////////////////
      // 7: Display results and log the lookup matrix
      const trainingContainer = document.getElementById('training');
      const div = document.createElement('div');

      const materialCanvas = document.createElement('canvas');
      materialCanvas.height = MATERIAL_W_CROPPED;
      materialCanvas.width = MATERIAL_H_CROPPED;
      materialCanvas.getContext('2d').putImageData(mat, 0, 0);

      const matrixCanvas = document.createElement('canvas');
      matrixCanvas.height = MATERIAL_W_CROPPED;
      matrixCanvas.width = MATERIAL_H_CROPPED;
      matrixCanvas.getContext('2d').putImageData(matrix, 0, 0);

      const description = document.createElement('span');
      if (matches.length === 0) {
        description.innerHTML = '<i>Unknown</i>';
        console.group(`Unrecognized material ${i}`);
        console.log(div);
        console.log(JSON.stringify(generatedItemLookup));
        console.groupEnd();
      } else if (matches.length === 1) {
        const materialName = matches[0][0];
        // IMPORTANT
        // if(MATERIALS_ALREADY_ONSCREEN.has(materialName)) {
        //   continue;
        // }
        description.innerHTML = materialName;
        MATERIALS_ALREADY_ONSCREEN.add(materialName);
      } else {
        description.innerHTML = '<span style="color: red;">Multiple</span>';
        console.group(`Multiple matches found ${i}`);
        console.log(div);
        console.log(JSON.stringify(matches));
        console.groupEnd();
      }

      div.appendChild(materialCanvas);
      div.appendChild(matrixCanvas);
      div.appendChild(description);
      trainingContainer.appendChild(div);
    }
}


///////////////////////////////////////////////////////////////////////////////
// "Run main"
const img = new Image();
img.onload = processImageOnLoad;
img.src = "./media/answers/img.JPG";
