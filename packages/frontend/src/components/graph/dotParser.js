import { parse as graphvizParse } from '@ts-graphviz/parser';

export const parse = (dotSrc) => {
  const result = graphvizParse(dotSrc);
  // Ensure we return an array to match the sample code's expected format
  return Array.isArray(result) ? result : [result];
};