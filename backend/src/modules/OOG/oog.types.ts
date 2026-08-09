export class CustomError extends Error {
  constructor(public data: unknown) {
    super("A neverthrow error occurred: " + JSON.stringify(data));
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
