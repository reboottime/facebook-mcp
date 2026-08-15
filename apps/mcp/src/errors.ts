export class InvalidToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidToolInputError";
  }
}

export class PageResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageResolutionError";
  }
}

export class MediaProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaProcessingError";
  }
}
