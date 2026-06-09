/**
 * Manual mock for the 'canvas' npm package.
 * Used for testing on Windows where the real canvas package
 * cannot be installed without GTK/Cairo system libraries.
 */

class MockCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fillText: () => {},
      drawImage: () => {},
      globalCompositeOperation: ''
    };
  }

  toBuffer() {
    return Promise.resolve(Buffer.from('fake-image'));
  }
}

class MockImage {
  constructor() {
    this.src = null;
  }
}

module.exports = {
  createCanvas: (width, height) => new MockCanvas(width, height),
  Image: MockImage
};
