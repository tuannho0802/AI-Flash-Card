declare module 'partial-json-parser' {
  /**
   * Parses a partial JSON string and returns the object it represents as far as it can.
   * @param jsonString The partial JSON string to parse.
   * @returns A partial object representing the data parsed so far.
   */
  function parse(jsonString: string): any;
  export default parse;
}
