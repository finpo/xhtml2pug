import { encode } from "html-entities";

import { compileAttrs, formatAttrsForTag, wrapAttrs } from "./compile-attrs";
import {
  Comment,
  CompileOptions,
  ConvertOptions,
  Doctype,
  IndentOptions,
  Node,
  Nodes,
  Script,
  Style,
  Tag,
  Text,
} from "./models";

const getFirstText = (nodes: Nodes[]) => {
  const [textNode] = nodes;
  if (textNode && textNode.node === Node.Text) return textNode;
  return null;
};

const getNodesWithoutText = (nodes: Nodes[]) => {
  const [textNode, ...other] = nodes;
  if (textNode && textNode.node === Node.Text) return other;
  return nodes;
};

const getIndent = ({ level, symbol }: IndentOptions) => symbol.repeat(level);

const wrapPreformattedText = (str: string, options: IndentOptions) =>
  str
    ? ".\n" +
      str
        .trim()
        .split("\n")
        .map((str) => getIndent(options) + str.trimStart())
        .join("\n")
    : "";

const compileDoctype = (_: Doctype, options: CompileOptions) =>
  `${getIndent(options)}doctype html`;

const compileText = (
  node: Text,
  options: CompileOptions,
  htmlOfLines: string[] = [],
) => {
  const resultTextFilter = node.value
    // .trimEnd()
    .split("\n")
    .filter(Boolean)
    .filter((str) => str.trim() !== "");
  let isTrimSpace = false;
  let resultTextFilterFirst;
  if (resultTextFilter.length > 1) {
    resultTextFilterFirst = resultTextFilter[0].match(/^(\s*)/)[0];
  }

  const resultTextMap = resultTextFilter.map((str, index) => {
    const indent = getIndent(options);
    // const strSpaces = str.match(/^(\s*)/)[0] ?? "";
    // if (strSpaces === indent) {
    //   isTrimSpace = true;
    // }
    if (index !== 0) {
      isTrimSpace = true;
    }
    if (htmlOfLines.length) {
      const getHtmlLinesContainStrValue = htmlOfLines.filter((line) =>
        line.startsWith(str),
      );
      if (getHtmlLinesContainStrValue.length) {
        isTrimSpace = true;
      }
    }
    return `${indent}| ${isTrimSpace ? str.trimStart() : str}`;
  });
  // .join("\n");
  const resultText = resultTextMap.join("\n");
  return options.encode ? encode(resultText) : resultText;
};

const compileSingleLineText = (node: Text, options: CompileOptions) =>
  options.encode ? encode(node.value) : node.value;

const compileComment = (node: Comment, options: CompileOptions) => {
  const start = getIndent(options) + "//";
  const clearedValue = node.value.trim();

  if (!clearedValue.includes("\n")) return start + " " + clearedValue;

  return (
    start +
    "\n" +
    clearedValue
      .split("\n")
      .map(
        (str) =>
          `${getIndent({ ...options, level: options.level + 1 })}${str.trim()}`,
      )
      .join("\n")
  );
};

const compileScript = (node: Script, options: CompileOptions) =>
  `${getIndent(options)}script${wrapAttrs(
    compileAttrs(node.attrs, options),
  )}${wrapPreformattedText(node.value, {
    ...options,
    level: options.level + 1,
  })}`;

const compileStyle = (node: Style, options: CompileOptions) =>
  `${getIndent(options)}style${wrapAttrs(
    compileAttrs(node.attrs, options),
  )}${wrapPreformattedText(node.value, {
    ...options,
    level: options.level + 1,
  })}`;

const compileTag = (
  node: Tag,
  options: CompileOptions,
  htmlOfLines: string[] = [],
) => {
  const { attrs, className, id } = formatAttrsForTag(node.attrs, options);

  let tag = "";
  if (options.classesAtEnd) {
    tag = [
      getIndent(options),
      node.name,
      id ? `#${id}` : "",
      wrapAttrs(compileAttrs(attrs, options)),
      className ? "." + className.split(" ").join(".") : "",
    ]
      .filter(Boolean)
      .join("");
  } else {
    tag = [
      getIndent(options),
      (id || className) && node.name === "div" ? "" : node.name,
      id ? `#${id}` : "",
      className ? "." + className.split(" ").join(".") : "",
      wrapAttrs(compileAttrs(attrs, options)),
    ]
      .filter(Boolean)
      .join("");
  }

  const textNode = getFirstText(node.children);
  if (!textNode) return tag;
  const resultText = textNode.value.includes("\n")
    ? "\n" +
      compileText(
        textNode,
        {
          ...options,
          level: options.level + 1,
        },
        htmlOfLines,
      ).replace(/(\|\s*)/, "| ")
    : " " + compileSingleLineText(textNode, options);
  return `${tag}${resultText}`;
};

export function compileAst(
  ast: Nodes[],
  options: ConvertOptions,
  htmlOfLines: string[] = [],
): string {
  const deepCompile = (ast: Nodes[], level = 0): string[] =>
    ast.reduce<string[]>((acc, node) => {
      const newOptions = { level, ...options };
      switch (node.node) {
        case Node.Doctype:
          return acc.concat(compileDoctype(node, newOptions));
        case Node.Script:
          return acc.concat(compileScript(node, newOptions));
        case Node.Style:
          return acc.concat(compileStyle(node, newOptions));
        case Node.Text:
          return acc.concat(compileText(node, newOptions, htmlOfLines));
        case Node.Comment:
          return acc.concat(compileComment(node, newOptions));
        case Node.Tag:
          return acc.concat(
            compileTag(node, newOptions, htmlOfLines),
            ...deepCompile(getNodesWithoutText(node.children), level + 1),
          );
        default:
          return acc;
      }
    }, []);

  return deepCompile(ast).join("\n") + "\n";
}
