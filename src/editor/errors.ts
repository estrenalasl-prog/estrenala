export class EditorError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "EditorError";
  }
}
